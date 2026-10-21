import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import { TaskProvider, useTasks, type NewTaskInput } from '@/hooks/useTasks'

/* 依赖 mock：TaskProvider 现依赖 useNotifications/useUsers/useAuth 与后端 API */
const mockAddNotification = vi.fn()
const mockList = vi.fn()

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    isBackendAvailable: () => Promise.resolve(false), // 强制走 demo 本地分支
    tasksApi: {
      list: (...args: any[]) => mockList(...args),
      create: () => Promise.resolve({}),
      update: () => Promise.resolve({}),
      delete: () => Promise.resolve({}),
      submit: () => Promise.resolve({}),
      approve: () => Promise.resolve({}),
      reject: () => Promise.resolve({}),
    },
  }
})

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({ addNotification: mockAddNotification }),
}))

vi.mock('@/hooks/useUsers', () => ({
  useUsers: () => ({
    users: [
      { id: 'u1', name: '张管理' },
      { id: 'u2', name: '李销售' },
    ],
  }),
}))

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ loginVersion: 0, user: { id: 'u2', name: '李销售' } }),
}))

/* Wrapper that captures context value for assertions */
function createCollector() {
  let captured: ReturnType<typeof useTasks> | null = null
  function Collector() {
    captured = useTasks()
    return null
  }
  return {
    Collector,
    get: () => {
      if (!captured) throw new Error('Context not captured')
      return captured
    },
  }
}

function renderTaskProvider() {
  const { Collector, get } = createCollector()
  render(<TaskProvider><Collector /></TaskProvider>)
  return get
}

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('TaskProvider', () => {
  beforeEach(() => {
    mockAddNotification.mockClear()
    mockList.mockReset()
    mockList.mockResolvedValue([])
  })

  it('initializes with empty tasks', () => {
    const get = renderTaskProvider()
    expect(get().tasks.length).toBe(0)
  })

  it('addTask creates a task with correct defaults', () => {
    const get = renderTaskProvider()
    const input: NewTaskInput = {
      title: '测试任务',
      content: '测试内容',
      assignedBy: '张管理',
      assignedTo: '李销售',
      deadline: '2026-08-01',
      source: 'office',
    }
    let newTask: any
    act(() => { newTask = get().addTask(input) })
    expect(newTask.id).toMatch(/^t-/)
    expect(newTask.title).toBe('测试任务')
    expect(newTask.completed).toBe(false)
    expect(newTask.status).toBe('pending')
    expect(newTask.source).toBe('office')
    // createdAt should be today
    expect(newTask.createdAt).toBe(new Date().toISOString().slice(0, 10))
  })

  it('addTask appends to the tasks array', () => {
    const get = renderTaskProvider()
    const before = get().tasks.length
    act(() => {
      get().addTask({ title: '新任务', content: '', assignedBy: 'X', assignedTo: 'Y', deadline: '2026-09-01', source: 'office' })
    })
    expect(get().tasks.length).toBe(before + 1)
  })

  it('updateTask normalizes completed → status', () => {
    const get = renderTaskProvider()
    const input: NewTaskInput = {
      title: '测试任务', content: '测试内容', assignedBy: '张管理',
      assignedTo: '李销售', deadline: '2026-08-01', source: 'office',
    }
    let task: any
    act(() => { task = get().addTask(input) })
    act(() => { get().updateTask(task.id, { completed: true }) })
    const updated = get().tasks.find(t => t.id === task.id)
    expect(updated?.completed).toBe(true)
    expect(updated?.status).toBe('completed')
  })

  it('updateTask normalizes status → completed', () => {
    const get = renderTaskProvider()
    const input: NewTaskInput = {
      title: '测试任务', content: '测试内容', assignedBy: '张管理',
      assignedTo: '李销售', deadline: '2026-08-01', source: 'office',
    }
    let task: any
    act(() => { task = get().addTask(input) })
    act(() => { get().updateTask(task.id, { status: 'submitted' }) })
    const updated = get().tasks.find(t => t.id === task.id)
    expect(updated?.status).toBe('submitted')
    expect(updated?.completed).toBe(false)
  })

  it('updateTask does not modify other tasks', () => {
    const get = renderTaskProvider()
    const input: NewTaskInput = {
      title: '测试任务', content: '测试内容', assignedBy: '张管理',
      assignedTo: '李销售', deadline: '2026-08-01', source: 'office',
    }
    let t1: any
    let t2: any
    act(() => { t1 = get().addTask(input) })
    act(() => { t2 = get().addTask({ ...input, title: '第二任务' }) })
    const secondBefore = t2.completed
    act(() => { get().updateTask(t1.id, { completed: true }) })
    const secondAfter = get().tasks.find(t => t.id === t2.id)
    expect(secondAfter?.completed).toBe(secondBefore)
  })

  it('deleteTask removes a task', () => {
    const get = renderTaskProvider()
    const input: NewTaskInput = {
      title: '测试任务', content: '测试内容', assignedBy: '张管理',
      assignedTo: '李销售', deadline: '2026-08-01', source: 'office',
    }
    let task: any
    act(() => { task = get().addTask(input) })
    const before = get().tasks.length
    act(() => { get().deleteTask(task.id) })
    expect(get().tasks.length).toBe(before - 1)
    expect(get().tasks.find(t => t.id === task.id)).toBeUndefined()
  })

  it('deleteTask with nonexistent id does nothing', () => {
    const get = renderTaskProvider()
    const before = get().tasks.length
    act(() => { get().deleteTask('nonexistent') })
    expect(get().tasks.length).toBe(before)
  })

  /* ---------- 任务完成审批流 ---------- */

  it('submitTask sets status to submitted for non-self-assigned tasks', () => {
    const get = renderTaskProvider()
    let task: any
    act(() => {
      task = get().addTask({ title: '审批任务', content: '', assignedBy: '张管理', assignedTo: '李销售', deadline: '2026-08-01', source: 'office' })
    })
    act(() => { get().submitTask(task.id) })
    const updated = get().tasks.find(t => t.id === task.id)
    expect(updated?.status).toBe('submitted')
    expect(updated?.completed).toBe(false)
  })

  it('submitTask notifies the sender in demo mode', async () => {
    const get = renderTaskProvider()
    let task: any
    act(() => {
      task = get().addTask({ title: '审批任务', content: '', assignedBy: '张管理', assignedTo: '李销售', deadline: '2026-08-01', source: 'office' })
    })
    act(() => { get().submitTask(task.id) })
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'task_submitted',
        taskId: task.id,
        customerName: '审批任务',
        toUserId: 'u1',
      }))
    })
  })

  it('submitTask completes immediately for self-assigned tasks', () => {
    const get = renderTaskProvider()
    let task: any
    act(() => {
      task = get().addTask({ title: '自指派任务', content: '', assignedBy: '李销售', assignedTo: '李销售', deadline: '2026-08-01', source: 'office' })
    })
    act(() => { get().submitTask(task.id) })
    const updated = get().tasks.find(t => t.id === task.id)
    expect(updated?.status).toBe('completed')
    expect(updated?.completed).toBe(true)
  })

  it('approveTask marks a submitted task completed', () => {
    const get = renderTaskProvider()
    let task: any
    act(() => {
      task = get().addTask({ title: '审批任务', content: '', assignedBy: '张管理', assignedTo: '李销售', deadline: '2026-08-01', source: 'office' })
    })
    act(() => { get().updateTask(task.id, { status: 'submitted' }) })
    act(() => { get().approveTask(task.id) })
    const updated = get().tasks.find(t => t.id === task.id)
    expect(updated?.status).toBe('completed')
    expect(updated?.completed).toBe(true)
  })

  it('rejectTask returns a submitted task to pending', () => {
    const get = renderTaskProvider()
    let task: any
    act(() => {
      task = get().addTask({ title: '审批任务', content: '', assignedBy: '张管理', assignedTo: '李销售', deadline: '2026-08-01', source: 'office' })
    })
    act(() => { get().updateTask(task.id, { status: 'submitted' }) })
    act(() => { get().rejectTask(task.id, '内容不符') })
    const updated = get().tasks.find(t => t.id === task.id)
    expect(updated?.status).toBe('pending')
    expect(updated?.completed).toBe(false)
  })

  it('rejectTask notifies the assignee in demo mode', async () => {
    const get = renderTaskProvider()
    let task: any
    act(() => {
      task = get().addTask({ title: '审批任务', content: '', assignedBy: '张管理', assignedTo: '李销售', deadline: '2026-08-01', source: 'office' })
    })
    act(() => { get().updateTask(task.id, { status: 'submitted' }) })
    act(() => { get().rejectTask(task.id, '请补充材料') })
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'task_rejected',
        taskId: task.id,
        comment: '请补充材料',
      }))
    })
  })
})
