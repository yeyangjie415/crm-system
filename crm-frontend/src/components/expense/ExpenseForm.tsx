import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import GlassModal from '@/components/glass/GlassModal'
import { useCustomers } from '@/hooks/useCustomers'
import { useExpenses } from '@/hooks/useExpenses'
import { useAuth } from '@/hooks/useAuth'
import { canViewInList } from '@/lib/permissions'
import type { Expense } from '@/types'

const CATEGORIES = ['差旅', '招待', '办公', '交通', '其他']

interface Props {
  open: boolean
  onClose: () => void
  expense?: Expense  // if provided, switches to edit mode
}

export default function ExpenseForm({ open, onClose, expense }: Props) {
  const { user, isAdmin } = useAuth()
  const { customers: allCustomers } = useCustomers()
  const customers = useMemo(() =>
    isAdmin ? allCustomers : allCustomers.filter(c => !c.deleted && canViewInList(user?.id || '', user?.permissionLevel || 'general', c)),
    [allCustomers, isAdmin, user?.id, user?.permissionLevel])
  const { addExpense, updateExpense } = useExpenses()
  const isEditing = !!expense

  const [date, setDate] = useState('')
  const [category, setCategory] = useState('差旅')
  const [amount, setAmount] = useState('')
  const [hasInvoice, setHasInvoice] = useState(false)
  const [project, setProject] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  // Pre-fill when editing
  useEffect(() => {
    if (expense) {
      setDate(expense.date)
      setCategory(expense.category)
      setAmount(String(expense.amount))
      setHasInvoice(expense.hasInvoice)
      setProject(expense.project || '')
      setReason(expense.reason)
      setNotes(expense.notes || '')
    } else {
      setDate('')
      setCategory('差旅')
      setAmount('')
      setHasInvoice(false)
      setProject('')
      setReason('')
      setNotes('')
    }
  }, [expense, open])

  const handleSubmit = () => {
    if (!date || !amount || !reason) {
      toast.error('请填写必填项')
      return
    }
    const data = {
      date,
      category,
      amount: Number(amount),
      hasInvoice,
      project: project || undefined,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
      submittedBy: user?.name || '未知用户',
    }
    if (isEditing && expense) {
      updateExpense(expense.id, data)
      toast.success('报销已更新')
    } else {
      addExpense(data)
      toast.success('报销申请已提交')
    }
    onClose()
  }

  return (
    <GlassModal open={open} onClose={onClose} title={isEditing ? '编辑报销' : '新增报销'}>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">日期 *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-glass w-full text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">费用分类 *</label>
          <select value={category} onChange={e => setCategory(e.target.value)} className="input-glass w-full text-xs">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">金额 *</label>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input-glass w-full text-xs" placeholder="请输入金额" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" checked={hasInvoice} onChange={e => setHasInvoice(e.target.checked)} className="w-3.5 h-3.5 rounded" />
          <label className="text-xs text-slate-600">有发票</label>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">关联项目</label>
          <select value={project} onChange={e => setProject(e.target.value)} className="input-glass w-full text-xs">
            <option value="">无关联项目</option>
            {customers.flatMap(c => c.projects || []).map(p => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">事由 *</label>
          <input value={reason} onChange={e => setReason(e.target.value)} className="input-glass w-full text-xs" placeholder="请描述报销事由" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">备注</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-glass w-full text-xs h-16 resize-none" placeholder="其他说明（选填）" />
        </div>
        <button onClick={handleSubmit} className="w-full py-2.5 text-xs font-semibold text-white bg-blue-500 rounded-lg interactive mt-2">
          提交报销
        </button>
      </div>
    </GlassModal>
  )
}
