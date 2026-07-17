import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Task } from '@/types'
import { generateId } from '@/mock/customers'
import { tasksApi, isBackendAvailable } from '@/lib/api'

export interface NewTaskInput {
  title: string
  content: string
  assignedBy: string
  assignedTo: string
  deadline: string
  source: Task['source']
}

interface TaskContextType {
  tasks: Task[]
  addTask: (input: NewTaskInput) => Task
  updateTask: (id: string, input: Partial<Task>) => void
  deleteTask: (id: string) => void
}

const TaskContext = createContext<TaskContextType>({
  tasks: [],
  addTask: () => ({ id: '', title: '', content: '', assignedBy: '', assignedTo: '', createdAt: '', deadline: '', completed: false, source: 'office' }),
  updateTask: () => {},
  deleteTask: () => {},
})

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    isBackendAvailable().then(ok => {
      if (!ok) return
      tasksApi.list().then(data => {
        if (Array.isArray(data) && data.length > 0) setTasks(data)
      }).catch(err => console.error('[API]', err))
    })
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
      source: input.source,
    }
    setTasks(prev => [...prev, newTask])
    isBackendAvailable().then(ok => { if (ok) tasksApi.create(newTask).catch(err => console.error('[API]', err)) })
    return newTask
  }, [])

  const updateTask = useCallback((id: string, input: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...input } : t))
    isBackendAvailable().then(ok => { if (ok) tasksApi.update(id, input).catch(err => console.error('[API]', err)) })
  }, [])

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    isBackendAvailable().then(ok => { if (ok) tasksApi.delete(id).catch(err => console.error('[API]', err)) })
  }, [])

  return (
    <TaskContext.Provider value={{ tasks, addTask, updateTask, deleteTask }}>
      {children}
    </TaskContext.Provider>
  )
}

export function useTasks() {
  return useContext(TaskContext)
}
