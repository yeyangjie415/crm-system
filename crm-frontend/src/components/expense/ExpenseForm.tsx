import { useState, useMemo, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Paperclip } from 'lucide-react'
import GlassModal from '@/components/glass/GlassModal'
import { useCustomers } from '@/hooks/useCustomers'
import { useVisits } from '@/hooks/useVisits'
import { useExpenses, type NewExpenseInput } from '@/hooks/useExpenses'
import { useAuth } from '@/hooks/useAuth'
import { canViewInList } from '@/lib/permissions'
import { EXPENSE_CATEGORIES } from '@/types'
import type { Expense, ExpenseAttachment } from '@/types'

interface ItemDraft {
  category: string
  amount: string
  date: string
  reason: string
}

const emptyItem = (): ItemDraft => ({ category: '交通', amount: '', date: '', reason: '' })

interface Props {
  open: boolean
  onClose: () => void
  expense?: Expense  // 提供时进入编辑模式（仅待主管审核/已驳回的单据）
}

export default function ExpenseForm({ open, onClose, expense }: Props) {
  const { user, isAdmin } = useAuth()
  const { customers: allCustomers } = useCustomers()
  const customers = useMemo(() =>
    isAdmin ? allCustomers : allCustomers.filter(c => !c.deleted && canViewInList(user?.id || '', user?.permissionLevel || 'general', c)),
    [allCustomers, isAdmin, user?.id, user?.permissionLevel])
  const { visits } = useVisits()
  const { addExpense, updateExpense } = useExpenses()
  const isEditing = !!expense
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 基础信息 ──
  const [customerId, setCustomerId] = useState('')
  const [visitId, setVisitId] = useState('')
  const [fieldworkDate, setFieldworkDate] = useState('')
  const [fieldworkLocation, setFieldworkLocation] = useState('')
  const [workContent, setWorkContent] = useState('')
  const [notes, setNotes] = useState('')
  // ── 费用明细 ──
  const [items, setItems] = useState<ItemDraft[]>([emptyItem()])
  // ── 票据附件 ──
  const [attachments, setAttachments] = useState<ExpenseAttachment[]>([])
  const [submitting, setSubmitting] = useState(false)

  const selectedCustomer = customers.find(c => c.id === customerId)

  // 该客户名下、本人拜访的记录（供选填关联）
  const myVisits = useMemo(() =>
    visits.filter(v => v.customerId === customerId && (!user || v.salesperson === user.name)),
    [visits, customerId, user])

  const totalAmount = items.reduce((s, i) => s + (Number(i.amount) || 0), 0)

  // 切换客户时清空已选拜访
  const handleCustomerChange = (id: string) => {
    setCustomerId(id)
    setVisitId('')
  }

  // 预填（编辑模式）
  useEffect(() => {
    if (expense) {
      setCustomerId(expense.customerId)
      setVisitId(expense.visitId || '')
      setFieldworkDate(expense.fieldworkDate)
      setFieldworkLocation(expense.fieldworkLocation)
      setWorkContent(expense.workContent)
      setNotes(expense.notes || '')
      setItems(expense.items.map(i => ({ category: i.category, amount: String(i.amount), date: i.date, reason: i.reason })))
      setAttachments(expense.attachments || [])
    } else {
      setCustomerId('')
      setVisitId('')
      setFieldworkDate('')
      setFieldworkLocation('')
      setWorkContent('')
      setNotes('')
      setItems([emptyItem()])
      setAttachments([])
    }
  }, [expense, open])

  const updateItem = (idx: number, patch: Partial<ItemDraft>) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  const handleFiles = (files: FileList | null) => {
    if (!files) return
    Array.from(files).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        setAttachments(prev => [...prev, {
          name: file.name,
          data: reader.result as string,
          uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        }])
      }
      reader.readAsDataURL(file)
    })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async () => {
    if (!customerId) { toast.error('请选择关联客户（SOP 要求：无 CRM 登记客户不予报销）'); return }
    if (!fieldworkDate) { toast.error('请填写外勤时间'); return }
    if (!fieldworkLocation.trim()) { toast.error('请填写外勤地点'); return }
    if (!workContent.trim()) { toast.error('请填写工作内容'); return }
    if (items.length === 0) { toast.error('请至少填写一条费用明细'); return }
    for (const [i, it] of items.entries()) {
      if (!(Number(it.amount) > 0)) { toast.error(`第 ${i + 1} 条明细金额必须大于 0`); return }
      if (!it.date) { toast.error(`第 ${i + 1} 条明细请填写消费日期`); return }
      if (!it.reason.trim()) { toast.error(`第 ${i + 1} 条明细请填写消费事由`); return }
    }
    if (attachments.length === 0) { toast.error('请上传票据凭证（发票、行程单、支付凭证等）'); return }

    const input: NewExpenseInput = {
      customerId,
      customerName: selectedCustomer?.name || '',
      visitId: visitId || null,
      fieldworkDate,
      fieldworkLocation: fieldworkLocation.trim(),
      workContent: workContent.trim(),
      notes: notes.trim() || undefined,
      items: items.map(it => ({ category: it.category, amount: Number(it.amount), date: it.date, reason: it.reason.trim() })),
      attachments,
    }

    setSubmitting(true)
    try {
      if (isEditing && expense) {
        await updateExpense(expense.id, input)
        toast.success(expense.status === 'rejected' ? '已整改并重新提交审批' : '报销单已更新')
      } else {
        await addExpense(input)
        toast.success('报销申请已提交，等待直属主管审核')
      }
      onClose()
    } catch {
      // hook 内已 toast 错误原因（如疑似重复申报），保持弹窗打开
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <GlassModal open={open} onClose={onClose} title={isEditing ? '编辑报销单' : '新增外勤费用报销'} className="max-w-2xl">
      <div className="space-y-4">
        {/* ── 基础信息 ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">基础信息</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">关联客户 *（CRM 已登记）</label>
              <select value={customerId} onChange={e => handleCustomerChange(e.target.value)} className="input-glass w-full text-xs">
                <option value="">请选择客户</option>
                {customers.filter(c => !c.deleted).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">外勤时间 *</label>
              <input type="date" value={fieldworkDate} onChange={e => setFieldworkDate(e.target.value)} className="input-glass w-full text-xs" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">外勤地点 *</label>
              <input value={fieldworkLocation} onChange={e => setFieldworkLocation(e.target.value)} className="input-glass w-full text-xs" placeholder="如：深圳市南山区客户现场" />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 block mb-1">关联拜访记录（选填）</label>
              <select value={visitId} onChange={e => setVisitId(e.target.value)} className="input-glass w-full text-xs" disabled={!customerId}>
                <option value="">不关联</option>
                {myVisits.map(v => <option key={v.id} value={v.id}>{v.date} · {v.location}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="text-[10px] font-semibold text-slate-600 block mb-1">工作内容 *</label>
            <textarea value={workContent} onChange={e => setWorkContent(e.target.value)} className="input-glass w-full text-xs h-14 resize-none" placeholder="请描述本次外勤的工作内容" />
          </div>
        </div>

        {/* ── 费用明细 ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">费用明细 *</p>
            <button onClick={() => setItems(prev => [...prev, emptyItem()])} className="text-[10px] text-blue-500 font-medium interactive flex items-center gap-0.5">
              <Plus size={10} /> 添加明细
            </button>
          </div>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={idx} className="glass-card p-2.5 grid grid-cols-2 sm:grid-cols-[90px_90px_120px_1fr_24px] gap-2 items-center">
                <select value={it.category} onChange={e => updateItem(idx, { category: e.target.value })} className="input-glass w-full text-[11px]">
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="number" value={it.amount} onChange={e => updateItem(idx, { amount: e.target.value })} className="input-glass w-full text-[11px]" placeholder="金额" />
                <input type="date" value={it.date} onChange={e => updateItem(idx, { date: e.target.value })} className="input-glass w-full text-[11px]" />
                <input value={it.reason} onChange={e => updateItem(idx, { reason: e.target.value })} className="input-glass w-full text-[11px] col-span-2 sm:col-span-1" placeholder="消费事由" />
                <button
                  onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                  disabled={items.length <= 1}
                  className="text-slate-300 hover:text-red-400 disabled:opacity-30 interactive hidden sm:block"
                  title="删除此明细"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-right text-[11px] text-slate-500 mt-1.5">合计：<span className="font-mono font-bold text-slate-800 tabular-nums">¥{totalAmount.toLocaleString()}</span></p>
        </div>

        {/* ── 票据凭证 ── */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">票据凭证 *（发票、行程单、支付凭证等）</p>
          <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf" className="hidden" onChange={e => handleFiles(e.target.files)} />
          <div className="flex flex-wrap gap-2">
            {attachments.map((a, idx) => (
              <span key={idx} className="inline-flex items-center gap-1.5 text-[10px] bg-slate-50 border border-black/5 text-slate-600 px-2 py-1 rounded-lg">
                <Paperclip size={10} className="text-slate-400" />
                {a.name}
                <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-400 interactive">
                  <Trash2 size={10} />
                </button>
              </span>
            ))}
            <button onClick={() => fileInputRef.current?.click()} className="text-[10px] text-blue-500 bg-blue-50 px-2.5 py-1 rounded-lg font-medium interactive flex items-center gap-1">
              <Plus size={10} /> 上传票据
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">请确保票据时间、地点、内容与外勤工作一致；票据不全将被驳回。</p>
        </div>

        {/* ── 补充说明 ── */}
        <div>
          <label className="text-[10px] font-semibold text-slate-600 block mb-1">补充说明</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input-glass w-full text-xs h-14 resize-none" placeholder="超标准费用、特殊费用请在此详细说明原因、用途及必要性（选填）" />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-2.5 text-xs font-semibold text-white bg-blue-500 rounded-lg interactive mt-1 disabled:opacity-60"
        >
          {submitting ? '提交中...' : isEditing ? (expense?.status === 'rejected' ? '整改并重新提交' : '保存修改') : '提交报销申请'}
        </button>
      </div>
    </GlassModal>
  )
}
