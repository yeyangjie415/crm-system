import { useState } from 'react'
import { Eye, Edit3, Paperclip } from 'lucide-react'
import ExpenseDetailModal from '@/components/expense/ExpenseDetailModal'
import ExpenseForm from '@/components/expense/ExpenseForm'
import { canEditExpense } from '@/lib/expensePermissions'
import { useAuth } from '@/hooks/useAuth'
import { EXPENSE_STATUS_LABELS } from '@/types'
import type { Expense, ExpenseStatus } from '@/types'

const STATUS_COLORS: Record<ExpenseStatus, string> = {
  pending_manager: 'text-amber-600 bg-amber-50',
  pending_finance: 'text-blue-600 bg-blue-50',
  pending_payment: 'text-indigo-600 bg-indigo-50',
  paid: 'text-cyan-600 bg-cyan-50',
  settled: 'text-emerald-600 bg-emerald-50',
  rejected: 'text-red-500 bg-red-50',
}

export default function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  const { user } = useAuth()
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-black/5 sticky top-0 z-5 bg-white/80">
            <th className="text-left py-2 px-3">提交时间</th>
            <th className="text-left py-2 px-3">关联客户</th>
            <th className="text-left py-2 px-3 hidden sm:table-cell">外勤时间</th>
            <th className="text-left py-2 px-3 hidden md:table-cell">费用明细</th>
            <th className="text-right py-2 px-3">总金额</th>
            <th className="text-left py-2 px-3 hidden lg:table-cell">提交人</th>
            <th className="text-center py-2 px-3">状态</th>
            <th className="text-center py-2 px-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {expenses.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-xs text-slate-400">暂无报销记录</td>
            </tr>
          ) : (
            expenses.map(e => {
              const categorySummary = [...new Set(e.items.map(i => i.category))].join('/')
              return (
                <tr key={e.id} className="table-row border-b border-black/[0.02] text-xs hover:bg-blue-50/20 cursor-pointer" onClick={() => setViewingExpense(e)}>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{e.createdAt.slice(0, 10)}</td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium truncate max-w-[140px]">{e.customerName}</td>
                  <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell whitespace-nowrap">{e.fieldworkDate}</td>
                  <td className="py-2.5 px-3 text-slate-500 hidden md:table-cell">
                    <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-medium">{e.items.length}笔 · {categorySummary}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-medium tabular-nums">¥{e.totalAmount.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-slate-500 hidden lg:table-cell">
                    <span className="inline-flex items-center gap-1">
                      {e.submittedByName}
                      {e.attachments.length > 0 && <Paperclip size={10} className="text-slate-300" />}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${STATUS_COLORS[e.status]}`}>
                      {EXPENSE_STATUS_LABELS[e.status]}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center" onClick={ev => ev.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setViewingExpense(e)} className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium interactive flex items-center gap-0.5">
                        <Eye size={9} /> 详情
                      </button>
                      {canEditExpense(user, e) && (
                        <button onClick={() => setEditingExpense(e)} className="text-[9px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium interactive flex items-center gap-0.5">
                          <Edit3 size={9} /> {e.status === 'rejected' ? '整改重提' : '编辑'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      {viewingExpense && (
        <ExpenseDetailModal
          open={!!viewingExpense}
          onClose={() => setViewingExpense(null)}
          expense={viewingExpense}
          onEdit={(exp) => setEditingExpense(exp)}
        />
      )}
      {editingExpense && (
        <ExpenseForm open={!!editingExpense} onClose={() => setEditingExpense(null)} expense={editingExpense} />
      )}
    </div>
  )
}
