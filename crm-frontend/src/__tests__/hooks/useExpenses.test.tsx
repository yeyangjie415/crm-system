import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import { ExpenseProvider, useExpenses, type NewExpenseInput } from '@/hooks/useExpenses'
import type { Expense } from '@/types'

/* Mock API 层：报销流程依赖服务端（权限/审计/通知），这里只验证 hook 与 API 的契约 */
const mockList = vi.fn()
const mockCreate = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockManagerReview = vi.fn()
const mockFinanceReview = vi.fn()
const mockPay = vi.fn()
const mockSettle = vi.fn()

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    expensesApi: {
      list: (...args: any[]) => mockList(...args),
      create: (...args: any[]) => mockCreate(...args),
      update: (...args: any[]) => mockUpdate(...args),
      delete: (...args: any[]) => mockDelete(...args),
      managerReview: (...args: any[]) => mockManagerReview(...args),
      financeReview: (...args: any[]) => mockFinanceReview(...args),
      pay: (...args: any[]) => mockPay(...args),
      settle: (...args: any[]) => mockSettle(...args),
    },
  }
})

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

const makeExpense = (over: Partial<Expense> = {}): Expense => ({
  id: 'e-test1',
  customerId: 'c1',
  customerName: '测试客户',
  visitId: null,
  fieldworkDate: '2026-08-01',
  fieldworkLocation: '深圳市南山区',
  workContent: '客户现场拜访',
  notes: null,
  totalAmount: 3000,
  status: 'pending_manager',
  submittedById: 'u1',
  submittedByName: '李销售',
  rejectReason: null,
  rejectedByStage: null,
  statusHistory: [{ action: 'submit', operatorId: 'u1', operatorName: '李销售', at: '2026-08-01 09:00' }],
  attachments: [{ name: '发票.png', data: 'data:image/png;base64,xx', uploadedAt: '2026-08-01 09:00' }],
  items: [{ id: 'ei1', category: '差旅', amount: 3000, date: '2026-08-01', reason: '出差' }],
  createdAt: '2026-08-01 09:00',
  updatedAt: '2026-08-01 09:00',
  ...over,
})

const input: NewExpenseInput = {
  customerId: 'c1',
  customerName: '测试客户',
  visitId: null,
  fieldworkDate: '2026-08-01',
  fieldworkLocation: '深圳市南山区',
  workContent: '客户现场拜访',
  items: [{ category: '差旅', amount: 3000, date: '2026-08-01', reason: '出差' }],
  attachments: [{ name: '发票.png', data: 'data:image/png;base64,xx', uploadedAt: '2026-08-01 09:00' }],
}

beforeEach(() => {
  vi.clearAllMocks()
  mockList.mockResolvedValue([])
  mockCreate.mockResolvedValue(makeExpense())
  mockUpdate.mockResolvedValue(makeExpense())
  mockDelete.mockResolvedValue(undefined)
  mockManagerReview.mockResolvedValue(makeExpense({ status: 'pending_finance' }))
  mockFinanceReview.mockResolvedValue(makeExpense({ status: 'pending_payment' }))
  mockPay.mockResolvedValue(makeExpense({ status: 'paid' }))
  mockSettle.mockResolvedValue(makeExpense({ status: 'settled' }))
})

/* ------------------------------------------------------------------ */

describe('ExpenseProvider（SOP 报销流程 hook）', () => {
  it('initializes with empty expenses', () => {
    const get = renderExpenseProvider()
    expect(get().expenses.length).toBe(0)
  })

  it('addExpense posts full SOP payload and refreshes list', async () => {
    mockList.mockResolvedValue([makeExpense()])
    const get = renderExpenseProvider()
    await act(async () => { await get().addExpense(input) })
    expect(mockCreate).toHaveBeenCalledWith(input)
    await waitFor(() => expect(get().expenses.length).toBe(1))
    expect(get().expenses[0].status).toBe('pending_manager')
    expect(get().expenses[0].items.length).toBe(1)
  })

  it('addExpense rejects when backend reports duplicate submission', async () => {
    mockCreate.mockRejectedValue(new Error('疑似重复申报'))
    const get = renderExpenseProvider()
    await act(async () => {
      await expect(get().addExpense(input)).rejects.toThrow('疑似重复申报')
    })
  })

  it('updateExpense sends payload to PUT endpoint', async () => {
    mockList.mockResolvedValue([makeExpense({ status: 'rejected', rejectReason: '票据不全' })])
    const get = renderExpenseProvider()
    await act(async () => { await get().refresh() })
    await waitFor(() => expect(get().expenses.length).toBe(1))
    await act(async () => { await get().updateExpense('e-test1', input) })
    expect(mockUpdate).toHaveBeenCalledWith('e-test1', input)
  })

  it('managerReview forwards approve/reject decision', async () => {
    mockList.mockResolvedValue([makeExpense()])
    const get = renderExpenseProvider()
    await act(async () => { await get().refresh() })
    await waitFor(() => expect(get().expenses.length).toBe(1))
    await act(async () => { await get().managerReview('e-test1', false, '票据不全') })
    expect(mockManagerReview).toHaveBeenCalledWith('e-test1', false, '票据不全')
  })

  it('financeReview / pay / settle follow the SOP status chain', async () => {
    mockList.mockResolvedValue([makeExpense()])
    const get = renderExpenseProvider()
    await act(async () => { await get().refresh() })
    await waitFor(() => expect(get().expenses.length).toBe(1))

    mockList.mockResolvedValue([makeExpense({ status: 'pending_finance' })])
    await act(async () => { await get().financeReview('e-test1', true) })
    expect(mockFinanceReview).toHaveBeenCalledWith('e-test1', true, undefined)

    mockList.mockResolvedValue([makeExpense({ status: 'pending_payment' })])
    await act(async () => { await get().payExpense('e-test1') })
    expect(mockPay).toHaveBeenCalledWith('e-test1', undefined)

    mockList.mockResolvedValue([makeExpense({ status: 'settled' })])
    await act(async () => { await get().settleExpense('e-test1') })
    expect(mockSettle).toHaveBeenCalledWith('e-test1')

    await waitFor(() => expect(get().expenses[0].status).toBe('settled'))
  })

  it('deleteExpense removes via API and refreshes', async () => {
    mockList.mockResolvedValueOnce([makeExpense()]).mockResolvedValueOnce([])
    const get = renderExpenseProvider()
    await act(async () => { await get().refresh() })
    await waitFor(() => expect(get().expenses.length).toBe(1))
    await act(async () => { await get().deleteExpense('e-test1') })
    expect(mockDelete).toHaveBeenCalledWith('e-test1')
    await waitFor(() => expect(get().expenses.length).toBe(0))
  })
})
