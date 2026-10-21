import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Expense, ExpenseItem, ExpenseAttachment } from '@/types'
import { expensesApi } from '@/lib/api'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useBackendLoad } from '@/hooks/useBackendLoad'

export interface NewExpenseInput {
  customerId: string
  customerName: string
  visitId?: string | null
  fieldworkDate: string
  fieldworkLocation: string
  workContent: string
  notes?: string
  items: ExpenseItem[]
  attachments: ExpenseAttachment[]
}

interface ExpenseContextType {
  expenses: Expense[]
  addExpense: (input: NewExpenseInput) => Promise<void>
  updateExpense: (id: string, input: NewExpenseInput) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  managerReview: (id: string, approved: boolean, comment?: string) => Promise<void>
  financeReview: (id: string, approved: boolean, comment?: string) => Promise<void>
  payExpense: (id: string, comment?: string) => Promise<void>
  settleExpense: (id: string) => Promise<void>
  refresh: () => Promise<void>
}

const ExpenseContext = createContext<ExpenseContextType>({
  expenses: [],
  addExpense: async () => {},
  updateExpense: async () => {},
  deleteExpense: async () => {},
  managerReview: async () => {},
  financeReview: async () => {},
  payExpense: async () => {},
  settleExpense: async () => {},
  refresh: async () => {},
})

function errMsg(err: any): string {
  return err?.message || '网络错误'
}

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const { loginVersion, user } = useAuth()

  // Load from backend on mount and on re-login（服务端按权限返回可见单据）
  const loader = useCallback(
    () => expensesApi.list().then((data: any[]) => data.map((e: any) => ({ ...e }))),
    [],
  )
  useBackendLoad<Expense>(loader, setExpenses, {
    trigger: loginVersion,
    loggedIn: !!user,
    clearOnLogout: true,
  })

  const refresh = useCallback(async () => {
    try {
      const data = await expensesApi.list()
      setExpenses(data.map((e: any) => ({ ...e })))
    } catch (err) {
      console.error('[API]', err)
    }
  }, [])

  const addExpense = useCallback(async (input: NewExpenseInput) => {
    try {
      await expensesApi.create(input)
      await refresh()
    } catch (err) {
      toast.error('提交失败：' + errMsg(err))
      throw err
    }
  }, [refresh])

  const updateExpense = useCallback(async (id: string, input: NewExpenseInput) => {
    try {
      await expensesApi.update(id, input)
      await refresh()
    } catch (err) {
      toast.error('保存失败：' + errMsg(err))
      throw err
    }
  }, [refresh])

  const deleteExpense = useCallback(async (id: string) => {
    try {
      await expensesApi.delete(id)
      await refresh()
    } catch (err) {
      toast.error('删除失败：' + errMsg(err))
      throw err
    }
  }, [refresh])

  const managerReview = useCallback(async (id: string, approved: boolean, comment?: string) => {
    try {
      await expensesApi.managerReview(id, approved, comment)
      await refresh()
    } catch (err) {
      toast.error('操作失败：' + errMsg(err))
      throw err
    }
  }, [refresh])

  const financeReview = useCallback(async (id: string, approved: boolean, comment?: string) => {
    try {
      await expensesApi.financeReview(id, approved, comment)
      await refresh()
    } catch (err) {
      toast.error('操作失败：' + errMsg(err))
      throw err
    }
  }, [refresh])

  const payExpense = useCallback(async (id: string, comment?: string) => {
    try {
      await expensesApi.pay(id, comment)
      await refresh()
    } catch (err) {
      toast.error('操作失败：' + errMsg(err))
      throw err
    }
  }, [refresh])

  const settleExpense = useCallback(async (id: string) => {
    try {
      await expensesApi.settle(id)
      await refresh()
    } catch (err) {
      toast.error('操作失败：' + errMsg(err))
      throw err
    }
  }, [refresh])

  return (
    <ExpenseContext.Provider value={{
      expenses, addExpense, updateExpense, deleteExpense,
      managerReview, financeReview, payExpense, settleExpense, refresh,
    }}>
      {children}
    </ExpenseContext.Provider>
  )
}

export function useExpenses() {
  return useContext(ExpenseContext)
}
