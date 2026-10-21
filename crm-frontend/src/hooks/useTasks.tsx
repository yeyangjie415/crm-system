import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { Task } from '@/types'
import { generateId } from '@/mock/customers'
import { tasksApi, isBackendAvailable } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { useUsers } from '@/hooks/useUsers'
import { useBackendLoad } from '@/hooks/useBackendLoad'

export interface NewTaskInput {
  title: string
  content: string
  assignedBy: string
  assignedTo: string
  deadline: string
  source: Task['source']
}

/** 归一化：status 与 completed 永不矛盾（status 为唯一真源） */
function normalizePatch(input: Partial<Task>): Partial<Task> {
  const patch: Partial<Task> = { ...input }
  if (input.status !== undefined) {
    patch.completed = input.status === 'completed'
  } else if (typeof input.completed === 'boolean') {
    patch.status = input.completed ? 'completed' : 'pending'
  }
  return patch
}

interface TaskContextType {
  tasks: Task[]
  addTask: (input: NewTaskInput) => Task
  updateTask: (id: string, input: Partial<Task>) => void
  deleteTask: (id: string) => void
  /** 被指派者提交完成申请（自指派直接完成） */
  submitTask: (id: string) => void
  /** 发件人同意完成 */
  approveTask: (id: string) => void
  /** 发件人驳回（回到进行中，需填原因） */
  rejectTask: (id: string, reason: string) => void
}

const TaskContext = createContext<TaskContextType>({
  tasks: [],
  addTask: () => ({ id: '', title: '', content: '', assignedBy: '', assignedTo: '', createdAt: '', deadline: '', completed: false, status: 'pending', source: 'office' }),
  updateTask: () => {},
  deleteTask: () => {},
  submitTask: () => {},
  approveTask: () => {},
  rejectTask: () => {},
})

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const { loginVersion, user } = useAuth()
  const { addNotification } = useNotifications()
  const { users } = useUsers()

  const normalizeTask = (t: any): Task => ({
    ...t,
    status: t.status || (t.completed ? 'completed' : 'pending'),
  })

  // Load from backend on mount and on re-login
  useBackendLoad<Task>(
    () => tasksApi.list().then(data => (data || []).map(normalizeTask)),
    setTasks,
    { trigger: loginVersion, loggedIn: !!user, clearOnLogout: true },
  )

  // 收到新任务审批结果通知（task_approved/task_rejected）时重新拉取任务列表，
  // 让被指派者无需刷新即可看到"驳回→回到进行中"
  useEffect(() => {
    const onTasksChanged = () => {
      isBackendAvailable().then(ok => {
        if (!ok) return
        tasksApi.list()
          .then((data: any[]) => setTasks((data || []).map(normalizeTask)))
          .catch(() => {})
      })
    }
    window.addEventListener('crm:tasks-changed', onTasksChanged)
    return () => window.removeEventListener('crm:tasks-changed', onTasksChanged)
  }, [])

  const addTask = useCallback((input: NewTaskInput): Task => {
    const newTask: Task = {
      id: generateId('t'),
      title: input.title,
      content: input.content,
      assignedBy: input.assignedBy,
      assignedTo: input.assignedTo,
      createdAt: new Date().toISOString().slice(0, 10),
      deadline: input.deadline,
      completed: false,
      status: 'pending',
      source: input.source,
    }
    setTasks(prev => [...prev, newTask])
    isBackendAvailable().then(ok => {
      if (!ok) return
      tasksApi.create(newTask).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
    return newTask
  }, [])

  /** 仅更新本地 state（供状态机流转的乐观更新与回滚使用） */
  const applyLocal = useCallback((id: string, patch: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...normalizePatch(patch) } : t))
  }, [])

  const updateTask = useCallback((id: string, input: Partial<Task>) => {
    const patch = normalizePatch(input)
    applyLocal(id, patch)
    isBackendAvailable().then(ok => {
      if (!ok) return
      tasksApi.update(id, patch).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [applyLocal])

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    isBackendAvailable().then(ok => {
      if (!ok) return
      tasksApi.delete(id).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const submitTask = useCallback((id: string) => {
    const target = tasks.find(t => t.id === id)
    if (!target || target.status !== 'pending') return

    // 自指派任务：提交即完成，无需审批
    if (target.assignedBy === target.assignedTo) {
      applyLocal(id, { status: 'completed' })
      toast.success('任务已完成')
      isBackendAvailable().then(ok => {
        if (!ok) return
        tasksApi.submit(id).catch(err => {
          console.error('[API]', err)
          toast.error('保存失败：' + (err?.message || '网络错误'))
        })
      })
      return
    }

    const senderUser = users.find(u => u.name === target.assignedBy)
    applyLocal(id, { status: 'submitted' })
    toast.success('已提交完成申请，等待发件人确认')
    isBackendAvailable().then(ok => {
      if (!ok) {
        addNotification({
          type: 'task_submitted',
          fromUserId: user?.id || '',
          fromUserName: user?.name || '',
          toUserId: senderUser?.id || '',
          customerId: '',
          customerName: target.title,
          taskId: target.id,
        })
        return
      }
      tasksApi.submit(id)
        .then((server: any) => setTasks(prev => prev.map(x => x.id === id ? { ...x, ...server } : x)))
        .catch(err => {
          console.error('[API]', err)
          applyLocal(id, { status: 'pending' })
          toast.error('保存失败：' + (err?.message || '网络错误'))
        })
    })
  }, [tasks, users, user, applyLocal, addNotification])

  const approveTask = useCallback((id: string) => {
    const target = tasks.find(t => t.id === id)
    if (!target || target.status !== 'submitted') return

    const assigneeUser = users.find(u => u.name === target.assignedTo)
    applyLocal(id, { status: 'completed' })
    toast.success('已同意任务完成')
    isBackendAvailable().then(ok => {
      if (!ok) {
        addNotification({
          type: 'task_approved',
          fromUserId: user?.id || '',
          fromUserName: user?.name || '',
          toUserId: assigneeUser?.id || '',
          customerId: '',
          customerName: target.title,
          taskId: target.id,
        })
        return
      }
      tasksApi.approve(id)
        .then((server: any) => setTasks(prev => prev.map(x => x.id === id ? { ...x, ...server } : x)))
        .catch(err => {
          console.error('[API]', err)
          applyLocal(id, { status: 'submitted' })
          toast.error('保存失败：' + (err?.message || '网络错误'))
        })
    })
  }, [tasks, users, user, applyLocal, addNotification])

  const rejectTask = useCallback((id: string, reason: string) => {
    const target = tasks.find(t => t.id === id)
    if (!target || target.status !== 'submitted') return

    const assigneeUser = users.find(u => u.name === target.assignedTo)
    applyLocal(id, { status: 'pending' })
    toast.success('已驳回任务完成申请')
    isBackendAvailable().then(ok => {
      if (!ok) {
        addNotification({
          type: 'task_rejected',
          fromUserId: user?.id || '',
          fromUserName: user?.name || '',
          toUserId: assigneeUser?.id || '',
          customerId: '',
          customerName: target.title,
          taskId: target.id,
          comment: reason,
        })
        return
      }
      tasksApi.reject(id, reason)
        .then((server: any) => setTasks(prev => prev.map(x => x.id === id ? { ...x, ...server } : x)))
        .catch(err => {
          console.error('[API]', err)
          applyLocal(id, { status: 'submitted' })
          toast.error('保存失败：' + (err?.message || '网络错误'))
        })
    })
  }, [tasks, users, user, applyLocal, addNotification])

  return (
    <TaskContext.Provider value={{ tasks, addTask, updateTask, deleteTask, submitTask, approveTask, rejectTask }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTasks() {
  return useContext(TaskContext)
}
