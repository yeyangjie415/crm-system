import { useState } from 'react'
import { toast } from 'sonner'
import { Edit3, Trash2, FileText, Receipt } from 'lucide-react'
import { useExpenses } from '@/hooks/useExpenses'
import { useAuth } from '@/hooks/useAuth'
import ExpenseForm from '@/components/expense/ExpenseForm'
import type { Expense } from '@/types'

const STATUS_LABELS: Record<Expense['status'], { label: string; color: string }> = {
  pending: { label: '待审批', color: 'text-amber-500 bg-amber-50' },
  approved: { label: '总经理已批', color: 'text-blue-500 bg-blue-50' },
  paid: { label: '财务已付', color: 'text-emerald-500 bg-emerald-50' },
  confirmed: { label: '已确认', color: 'text-slate-500 bg-slate-50' },
}

export default function ExpenseTable({ expenses: propExpenses, selected, onSelect }: {
  expenses?: Expense[]
  selected?: string[]
  onSelect?: (ids: string[]) => void
}) {
  const { expenses: hookExpenses, updateExpense, deleteExpense } = useExpenses()
  const expenses = propExpenses ?? hookExpenses
  const { user, isAdmin } = useAuth()
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const sel = selected ?? []
  const setSel = onSelect ?? (() => {})

  const toggleSelect = (id: string) => {
    setSel(sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id])
  }
  const toggleAll = () => {
    setSel(sel.length === expenses.length ? [] : expenses.map(e => e.id))
  }

  const canApprove = (e: Expense) => e.status === 'pending' && isAdmin
  const canPay = (e: Expense) => e.status === 'approved' && isAdmin
  const canConfirm = (e: Expense) => e.status === 'paid' && e.submittedBy === user?.name
  const canEdit = (e: Expense) => e.status === 'pending'
  const canDelete = (e: Expense) => e.status === 'pending'

  const handleDelete = (e: Expense) => {
    if (window.confirm(`确定删除报销「${e.reason}」¥${e.amount.toLocaleString()}？`)) {
      deleteExpense(e.id)
      toast.success('报销已删除')
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-black/5 sticky top-0 z-5 bg-white/80">
            <th className="text-left py-2 px-3 w-10">
              <input type="checkbox" checked={sel.length === expenses.length && expenses.length > 0} onChange={toggleAll} className="rounded border-slate-300" />
            </th>
            <th className="text-left py-2 px-3">时间</th>
            <th className="text-left py-2 px-3">分类</th>
            <th className="text-right py-2 px-3">金额</th>
            <th className="text-center py-2 px-3">发票</th>
            <th className="text-left py-2 px-3 hidden sm:table-cell">关联项目</th>
            <th className="text-left py-2 px-3 hidden md:table-cell">事由</th>
            <th className="text-left py-2 px-3 hidden lg:table-cell">提交人</th>
            <th className="text-center py-2 px-3">状态</th>
            <th className="text-center py-2 px-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {expenses.length === 0 ? (
            <tr>
              <td colSpan={10} className="py-8 text-center text-xs text-slate-400">暂无报销记录</td>
            </tr>
          ) : (
            expenses.map(e => {
              const status = STATUS_LABELS[e.status]
              return (
                <tr key={e.id} className={`table-row border-b border-black/[0.02] text-xs ${sel.includes(e.id) ? 'bg-blue-50/30' : ''}`}>
                  <td className="py-2.5 px-3">
                    <input type="checkbox" checked={sel.includes(e.id)} onChange={() => toggleSelect(e.id)} className="rounded border-slate-300" />
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{e.date}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-medium">{e.category}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs font-medium tabular-nums">¥{e.amount.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-center">
                    {e.hasInvoice ? <Receipt size={12} className="text-emerald-500 mx-auto" /> : <span className="text-[10px] text-slate-300">—</span>}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell">{e.project || '—'}</td>
                  <td className="py-2.5 px-3 text-slate-600 hidden md:table-cell truncate max-w-[120px]">{e.reason}</td>
                  <td className="py-2.5 px-3 text-slate-500 hidden lg:table-cell">{e.submittedBy}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${status.color}`}>{status.label}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {canEdit(e) && (
                        <button onClick={() => setEditingExpense(e)} className="text-[9px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium interactive flex items-center gap-0.5">
                          <Edit3 size={9} /> 编辑
                        </button>
                      )}
                      {canDelete(e) && (
                        <button onClick={() => handleDelete(e)} className="text-[9px] text-red-400 bg-red-50 px-1.5 py-0.5 rounded font-medium interactive flex items-center gap-0.5">
                          <Trash2 size={9} /> 删除
                        </button>
                      )}
                      {canApprove(e) && (
                        <button onClick={() => updateExpense(e.id, { status: 'approved' })} className="text-[9px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium interactive">审批</button>
                      )}
                      {canPay(e) && (
                        <button onClick={() => updateExpense(e.id, { status: 'paid' })} className="text-[9px] text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded font-medium interactive">发放</button>
                      )}
                      {canConfirm(e) && (
                        <button onClick={() => updateExpense(e.id, { status: 'confirmed' })} className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium interactive">签收</button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
      {editingExpense && (
        <ExpenseForm open={!!editingExpense} onClose={() => setEditingExpense(null)} expense={editingExpense} />
      )}
    </div>
  )
}
