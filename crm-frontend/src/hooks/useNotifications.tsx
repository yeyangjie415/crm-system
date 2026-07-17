import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Notification, NotificationType } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { useCustomers } from '@/hooks/useCustomers'

const NOTIFICATIONS_KEY = 'crm_notifications'

export interface AddNotificationInput {
  type: NotificationType
  fromUserId: string
  fromUserName: string
  toUserId: string
  customerId: string
  customerName: string
  contractId?: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (input: AddNotificationInput) => Notification
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  respondToRequest: (id: string, response: 'approved' | 'rejected') => void
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  addNotification: () => ({ id: '', type: 'co_follow_request', fromUserId: '', fromUserName: '', toUserId: '', customerId: '', customerName: '', status: 'pending', createdAt: '', read: false, contractId: undefined }),
  markAsRead: () => {},
  markAllAsRead: () => {},
  respondToRequest: () => {},
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
  const [notifications, setNotifications] = useState<Notification[]>(() => loadNotifications())
  const { user } = useAuth()
  const { shareCustomer } = useCustomers()

  useEffect(() => {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications))
  }, [notifications])

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
      status: 'pending',
      createdAt: ts,
      read: false,
    }
    setNotifications(prev => [newNotif, ...prev])
    return newNotif
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }, [])

  const markAllAsRead = useCallback(() => {
    if (!user) return
    setNotifications(prev => prev.map(n =>
      n.toUserId === user.id && !n.read ? { ...n, read: true } : n
    ))
  }, [user])

  const respondToRequest = useCallback((id: string, response: 'approved' | 'rejected') => {
    setNotifications(prev => {
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

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      respondToRequest,
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
