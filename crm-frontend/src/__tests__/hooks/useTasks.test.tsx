import { describe, it, expect, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { TaskProvider, useTasks, type NewTaskInput } from '@/hooks/useTasks'
import type { ReactNode } from 'react'

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

  it('updateTask modifies a task', () => {
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
})
