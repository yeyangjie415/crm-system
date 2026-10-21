import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import type { Notification, NotificationType } from '@/types'
import { notificationsApi, isBackendAvailable, getToken } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useCustomers } from '@/hooks/useCustomers'
import { useBackendLoad } from '@/hooks/useBackendLoad'

const NOTIFICATIONS_KEY = 'crm_notifications'

export interface AddNotificationInput {
  type: NotificationType
  fromUserId: string
  fromUserName: string
  toUserId: string
  customerId: string
  customerName: string
  contractId?: string
  taskId?: string
  comment?: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (input: AddNotificationInput) => Notification
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  respondToRequest: (id: string, response: 'approved' | 'rejected') => void
  /** 审批后收起原待处理通知的按钮：标记为已处理 */
  resolveNotification: (id: string, response: 'approved' | 'rejected') => void
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => ({ id: '', type: 'co_follow_request', fromUserId: '', fromUserName: '', toUserId: '', customerId: '', customerName: '', status: 'pending', createdAt: '', read: false, contractId: undefined }),
  markAsRead: () => {},
  markAllAsRead: () => {},
  respondToRequest: () => {},
  resolveNotification: () => {},
})

function loadNotifications(): Notification[] {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) return parsed as Notification[]
    }
  } catch { /* ignore */ }
  return []
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [localNotifs, setLocalNotifs] = useState<Notification[]>(() => loadNotifications())
  const [backendNotifs, setBackendNotifs] = useState<Notification[]>([])
  const { user, loginVersion } = useAuth()
  const { shareCustomer } = useCustomers()

  // 拉取发给当前用户的后端通知（报销状态变更等跨用户事件）
  useBackendLoad<Notification>(
    () => user
      ? notificationsApi.list(user.id).then((data: any[]) => data.map((n: any) => ({ ...n })))
      : Promise.resolve([]),
    setBackendNotifs,
    { trigger: loginVersion, loggedIn: !!user, clearOnLogout: true },
  )

  // 合并后端 + 本地通知（按 id 去重，时间倒序）
  const notifications = useMemo(() => {
    const seen = new Set(backendNotifs.map(n => n.id))
    const merged = [...backendNotifs, ...localNotifs.filter(n => !seen.has(n.id))]
    return merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [backendNotifs, localNotifs])

  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(localNotifs))
  }, [localNotifs])

  // 30s 轮询后端通知（仅登录且后端可用），让跨用户审批实时可见；
  // 发现新的任务审批结果（task_approved/task_rejected）时通知 useTasks 重拉任务列表
  const taskNotifSeen = useRef<Set<string>>(new Set())
  useEffect(() => {
    const uid = user?.id
    if (!uid) return
    let cancelled = false
    const refresh = () => {
      if (!getToken()) return
      isBackendAvailable().then(ok => {
        if (!ok || cancelled) return
        notificationsApi.list(uid)
          .then((data: any[]) => {
            if (cancelled) return
            setBackendNotifs((data || []).map((n: any) => ({ ...n })))
            for (const n of data || []) {
              if ((n.type === 'task_approved' || n.type === 'task_rejected') && !taskNotifSeen.current.has(n.id)) {
                taskNotifSeen.current.add(n.id)
                window.dispatchEvent(new Event('crm:tasks-changed'))
              }
            }
          })
          .catch(() => {})
      })
    }
    refresh()
    const iv = setInterval(refresh, 30000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [user?.id])

  const unreadCount = notifications.filter(n => !n.read && n.toUserId === user?.id).length

  const addNotification = useCallback((input: AddNotificationInput): Notification => {
    const now = new Date()
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const newNotif: Notification = {
      id: `n${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: input.type,
      fromUserId: input.fromUserId,
      fromUserName: input.fromUserName,
      toUserId: input.toUserId,
      customerId: input.customerId,
      customerName: input.customerName,
      contractId: input.contractId,
      taskId: input.taskId,
      comment: input.comment,
      status: 'pending',
      createdAt: ts,
      read: false,
    }
    setLocalNotifs(prev => [newNotif, ...prev])
    return newNotif
  }, [])

  const markAsRead = useCallback((id: string) => {
    setLocalNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setBackendNotifs(prev => {
      const target = prev.find(n => n.id === id)
      if (target && !target.read) notificationsApi.update(id, { read: true }).catch(() => {})
      return prev.map(n => n.id === id ? { ...n, read: true } : n)
    })
  }, [])

  const markAllAsRead = useCallback(() => {
    if (!user) return
    setLocalNotifs(prev => prev.map(n =>
      n.toUserId === user.id && !n.read ? { ...n, read: true } : n
    ))
    setBackendNotifs(prev => {
      prev.filter(n => n.toUserId === user.id && !n.read)
        .forEach(n => notificationsApi.update(n.id, { read: true }).catch(() => {}))
      return prev.map(n => n.toUserId === user.id && !n.read ? { ...n, read: true } : n)
    })
  }, [user])

  const respondToRequest = useCallback((id: string, response: 'approved' | 'rejected') => {
    setLocalNotifs(prev => {
      const target = prev.find(n => n.id === id)
      if (!target) return prev

      const now = new Date()
      const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      const isContractType = target.type === 'contract_submitted' || target.type === 'contract_approved' || target.type === 'contract_rejected'
      const followUpType: NotificationType = isContractType
        ? (response === 'approved' ? 'contract_approved' : 'contract_rejected')
        : (response === 'approved' ? 'co_follow_approved' : 'co_follow_rejected')

      const followUpNotif: Notification = {
        id: `n${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: followUpType,
        fromUserId: target.toUserId,
        fromUserName: user?.name || '',
        toUserId: target.fromUserId,
        customerId: target.customerId,
        customerName: target.customerName,
        contractId: target.contractId,
        status: 'approved',
        createdAt: ts,
        read: false,
      }

      return prev.map(n => n.id === id ? { ...n, status: response, read: true } : n).concat(followUpNotif)
    })

    // Only share customer for co_follow requests, not contract approvals
    if (response === 'approved') {
      const target = notifications.find(n => n.id === id)
      if (target && target.type === 'co_follow_request') {
        shareCustomer(target.customerId, {
          userId: target.fromUserId,
          userName: target.fromUserName,
          permission: 'edit',
        })
      }
    }
  }, [notifications, user, shareCustomer])

  /** 审批完成后收起原待处理通知的按钮（标记为已处理） */
  const resolveNotification = useCallback((id: string, response: 'approved' | 'rejected') => {
    setLocalNotifs(prev => prev.map(n => n.id === id ? { ...n, status: response, read: true } : n))
    setBackendNotifs(prev => {
      const target = prev.find(n => n.id === id)
      if (target && target.status === 'pending') {
        notificationsApi.update(id, { status: response, read: true }).catch(() => {})
      }
      return prev.map(n => n.id === id ? { ...n, status: response, read: true } : n)
    })
  }, [])

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      respondToRequest,
      resolveNotification,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
