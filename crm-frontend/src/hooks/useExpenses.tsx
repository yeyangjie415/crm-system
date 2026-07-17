import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Expense } from '@/types'
import { generateId } from '@/mock/customers'
import { expensesApi, isBackendAvailable } from '@/lib/api'

export interface NewExpenseInput {
  date: string
  category: string
  amount: number
  hasInvoice: boolean
  project?: string
  reason: string
  notes?: string
  submittedBy: string
}

interface ExpenseContextType {
  expenses: Expense[]
  addExpense: (input: NewExpenseInput) => Expense
  updateExpense: (id: string, input: Partial<Expense>) => void
  deleteExpense: (id: string) => void
}

const ExpenseContext = createContext<ExpenseContextType>({
  expenses: [],
  addExpense: () => ({ id: '', date: '', category: '', amount: 0, hasInvoice: false, reason: '', status: 'pending', submittedBy: '' }),
  updateExpense: () => {},
  deleteExpense: () => {},
})

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    isBackendAvailable().then(ok => {
      if (!ok) return
      expensesApi.list().then(data => {
        if (Array.isArray(data) && data.length > 0) setExpenses(data)
      }).catch(err => console.error('[API]', err))
    })
  }, [])

  const addExpense = useCallback((input: NewExpenseInput): Expense => {
    const newExpense: Expense = {
      id: generateId('e'),
      date: input.date,
      category: input.category,
      amount: input.amount,
      hasInvoice: input.hasInvoice,
      project: input.project,
      reason: input.reason,
      notes: input.notes,
      status: 'pending',
      submittedBy: input.submittedBy,
    }
    setExpenses(prev => [...prev, newExpense])
    isBackendAvailable().then(ok => { if (ok) expensesApi.create(newExpense).catch(err => console.error('[API]', err)) })
    return newExpense
  }, [])

  const updateExpense = useCallback((id: string, input: Partial<Expense>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...input } : e))
    isBackendAvailable().then(ok => { if (ok) expensesApi.update(id, input).catch(err => console.error('[API]', err)) })
  }, [])

  const deleteExpense = useCallback((id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id))
    isBackendAvailable().then(ok => { if (ok) expensesApi.delete(id).catch(err => console.error('[API]', err)) })
  }, [])

  return (
    <ExpenseContext.Provider value={{ expenses, addExpense, updateExpense, deleteExpense }}>
      {children}
    </ExpenseContext.Provider>
  )
}

export function useExpenses() {
  return useContext(ExpenseContext)
}
