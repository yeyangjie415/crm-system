import { describe, it, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import { ExpenseProvider, useExpenses, type NewExpenseInput } from '@/hooks/useExpenses'
import type { Expense } from '@/types'

function createCollector() {
  let captured: ReturnType<typeof useExpenses> | null = null
  function Collector() {
    captured = useExpenses()
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

function renderExpenseProvider() {
  const { Collector, get } = createCollector()
  render(<ExpenseProvider><Collector /></ExpenseProvider>)
  return get
}

/* ------------------------------------------------------------------ */

describe('ExpenseProvider', () => {
  it('initializes with empty expenses', () => {
    const get = renderExpenseProvider()
    expect(get().expenses.length).toBe(0)
  })

  it('addExpense creates pending expense with correct id prefix', () => {
    const get = renderExpenseProvider()
    const input: NewExpenseInput = {
      date: '2026-07-15',
      category: '差旅',
      amount: 3000,
      hasInvoice: true,
      project: '测试项目',
      reason: '出差',
      submittedBy: '李销售',
    }
    let newExpense: Expense | undefined
    act(() => { newExpense = get().addExpense(input) })
    expect(newExpense!.id).toMatch(/^e-/)
    expect(newExpense!.status).toBe('pending')
    expect(newExpense!.submittedBy).toBe('李销售')
  })

  it('addExpense allows optional fields', () => {
    const get = renderExpenseProvider()
    act(() => {
      get().addExpense({
        date: '2026-07-15', category: '办公', amount: 500, hasInvoice: false,
        reason: '买文具', submittedBy: '王技术',
      })
    })
    const last = get().expenses[get().expenses.length - 1]
    expect(last.amount).toBe(500)
    expect(last.project).toBeUndefined()
    expect(last.notes).toBeUndefined()
  })

  it('updateExpense changes status', () => {
    const get = renderExpenseProvider()
    const input: NewExpenseInput = {
      date: '2026-07-15', category: '差旅', amount: 3000, hasInvoice: true,
      project: '测试项目', reason: '出差', submittedBy: '李销售',
    }
    let e: Expense | undefined
    act(() => { e = get().addExpense(input) })
    act(() => { get().updateExpense(e!.id, { status: 'approved' }) })
    const updated = get().expenses.find(exp => exp.id === e!.id)
    expect(updated?.status).toBe('approved')
  })

  it('updateExpense changes amount', () => {
    const get = renderExpenseProvider()
    const input: NewExpenseInput = {
      date: '2026-07-15', category: '差旅', amount: 3000, hasInvoice: true,
      project: '测试项目', reason: '出差', submittedBy: '李销售',
    }
    let e: Expense | undefined
    act(() => { e = get().addExpense(input) })
    act(() => { get().updateExpense(e!.id, { amount: 9999 }) })
    const updated = get().expenses.find(exp => exp.id === e!.id)
    expect(updated?.amount).toBe(9999)
  })

  it('deleteExpense removes an expense', () => {
    const get = renderExpenseProvider()
    const input: NewExpenseInput = {
      date: '2026-07-15', category: '差旅', amount: 3000, hasInvoice: true,
      project: '测试项目', reason: '出差', submittedBy: '李销售',
    }
    let e: Expense | undefined
    act(() => { e = get().addExpense(input) })
    const before = get().expenses.length
    act(() => { get().deleteExpense(e!.id) })
    expect(get().expenses.length).toBe(before - 1)
  })

  it('allows updating expense statuses to different values', () => {
    const get = renderExpenseProvider()
    const input: NewExpenseInput = {
      date: '2026-07-15', category: '差旅', amount: 3000, hasInvoice: true,
      project: '测试项目', reason: '出差', submittedBy: '李销售',
    }
    act(() => { get().addExpense(input) })
    let e2: Expense | undefined
    act(() => { e2 = get().addExpense(input) })
    act(() => { get().updateExpense(e2!.id, { status: 'approved' }) })
    const statuses = new Set(get().expenses.map(e => e.status))
    expect(statuses.size).toBeGreaterThan(1)
  })
})
