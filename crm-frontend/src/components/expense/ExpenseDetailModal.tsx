import { useState } from 'react'
import { toast } from 'sonner'
import { Edit3, Trash2, Paperclip, AlertTriangle, CheckCircle2 } from 'lucide-react'
import GlassModal from '@/components/glass/GlassModal'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/hooks/useUsers'
import { useVisits } from '@/hooks/useVisits'
import { useExpenses } from '@/hooks/useExpenses'
import { canManagerReview, canFinanceAct, canEditExpense, canDeleteExpense, canSettleExpense } from '@/lib/expensePermissions'
import { EXPENSE_STATUS_LABELS, EXPENSE_ACTION_LABELS } from '@/types'
import type { Expense } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  pending_manager: 'text-amber-600 bg-amber-50',
  pending_finance: 'text-blue-600 bg-blue-50',
  pending_payment: 'text-indigo-600 bg-indigo-50',
  paid: 'text-cyan-600 bg-cyan-50',
  settled: 'text-emerald-600 bg-emerald-50',
  rejected: 'text-red-500 bg-red-50',
}

interface Props {
  open: boolean
  onClose: () => void
  expense: Expense
  onEdit: (expense: Expense) => void
}

export default function ExpenseDetailModal({ open, onClose, expense, onEdit }: Props) {
  const { user, isAdmin } = useAuth()
  const { getUser } = useUsers()
  const { visits } = useVisits()
  const { managerReview, financeReview, payExpense, settleExpense, deleteExpense } = useExpenses()

  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectStage, setRejectStage] = useState<'manager' | 'finance'>('manager')
  const [rejectReason, setRejectReason] = useState('')
  const [busy, setBusy] = useState(false)

  const submitter = getUser(expense.submittedById)
  const linkedVisit = expense.visitId ? visits.find(v => v.id === expense.visitId) : undefined

  const isManagerReviewer = canManagerReview(user, submitter) && expense.status === 'pending_manager'
  const isFinanceActor = canFinanceAct(user)
  const canEdit = canEditExpense(user, expense)
  const canDelete = canDeleteExpense(user, expense)
  const canSettle = canSettleExpense(user, expense)

  const run = async (fn: () => Promise<void>, successMsg: string) => {
    setBusy(true)
    try {
      await fn()
      toast.success(successMsg)
      setShowRejectInput(false)
      setRejectReason('')
      onClose()
    } catch { /* hook 已提示 */ } finally {
      setBusy(false)
    }
  }

  const handleReject = () => {
    if (!rejectReason.trim()) { toast.error('请填写驳回原因'); return }
    const stage = rejectStage
    run(
      () => stage === 'manager'
        ? managerReview(expense.id, false, rejectReason.trim())
        : financeReview(expense.id, false, rejectReason.trim()),
      '已驳回，单据退回申请人',
    )
  }

  const handleDelete = async () => {
    if (!window.confirm(`确定删除该报销单（${expense.customerName}，¥${expense.totalAmount.toLocaleString()}）？`)) return
    setBusy(true)
    try {
      await deleteExpense(expense.id)
      toast.success('报销单已删除')
      onClose()
    } catch { /* hook 已提示 */ } finally {
      setBusy(false)
    }
  }

  return (
    <GlassModal open={open} onClose={onClose} title="报销单详情" className="max-w-2xl">
      <div className="space-y-4">
        {/* 状态 + 金额 */}
        <div className="flex items-center justify-between">
          <span className={`text-[11px] px-2 py-1 rounded-lg font-semibold ${STATUS_COLORS[expense.status]}`}>
            {EXPENSE_STATUS_LABELS[expense.status]}
          </span>
          <div className="text-right">
            <p className="text-[9px] text-slate-400">报销总额</p>
            <p className="text-lg font-mono font-bold text-slate-800 tabular-nums">¥{expense.totalAmount.toLocaleString()}</p>
          </div>
        </div>

        {/* 驳回提示 */}
        {expense.status === 'rejected' && expense.rejectReason && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg p-3">
            <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <div className="text-xs text-red-600">
              <p className="font-semibold mb-0.5">{expense.rejectedByStage === 'finance' ? '财务审核驳回' : '主管审核驳回'}原因：</p>
              <p>{expense.rejectReason}</p>
              {expense.submittedById === user?.id && <p className="text-[10px] text-red-400 mt-1">请针对问题修改后重新提交</p>}
            </div>
          </div>
        )}

        {/* 基础信息 */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">外勤信息</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs bg-slate-50/60 rounded-lg p-3">
            <div><span className="text-slate-400">关联客户：</span><span className="text-slate-700 font-medium">{expense.customerName}</span></div>
            <div><span className="text-slate-400">提交人：</span><span className="text-slate-700">{expense.submittedByName}</span></div>
            <div><span className="text-slate-400">外勤时间：</span><span className="text-slate-700">{expense.fieldworkDate}</span></div>
            <div><span className="text-slate-400">外勤地点：</span><span className="text-slate-700">{expense.fieldworkLocation}</span></div>
            <div className="col-span-2"><span className="text-slate-400">工作内容：</span><span className="text-slate-700">{expense.workContent}</span></div>
            <div className="col-span-2">
              <span className="text-slate-400">拜访记录：</span>
              {linkedVisit
                ? <span className="text-slate-700">{linkedVisit.date} · {linkedVisit.location}（联系人：{linkedVisit.contact}）</span>
                : <span className="text-slate-400">未关联</span>}
            </div>
            {expense.notes && (
              <div className="col-span-2"><span className="text-slate-400">补充说明：</span><span className="text-amber-600">{expense.notes}</span></div>
            )}
          </div>
        </div>

        {/* 费用明细 */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">费用明细（{expense.items.length} 笔）</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] text-slate-400 border-b border-black/5">
                <th className="text-left py-1.5">类型</th>
                <th className="text-right py-1.5">金额</th>
                <th className="text-left py-1.5 pl-3">消费日期</th>
                <th className="text-left py-1.5 pl-3">消费事由</th>
              </tr>
            </thead>
            <tbody>
              {expense.items.map((it, idx) => (
                <tr key={it.id || idx} className="border-b border-black/[0.03]">
                  <td className="py-1.5"><span className="text-[10px] bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-medium">{it.category}</span></td>
                  <td className="py-1.5 text-right font-mono tabular-nums">¥{it.amount.toLocaleString()}</td>
                  <td className="py-1.5 pl-3 text-slate-500">{it.date}</td>
                  <td className="py-1.5 pl-3 text-slate-600">{it.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 票据凭证 */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">票据凭证（{expense.attachments.length}）</p>
          <div className="flex flex-wrap gap-2">
            {expense.attachments.map((a, idx) => (
              <a
                key={idx}
                href={a.data}
                download={a.name}
                className="inline-flex items-center gap-1.5 text-[10px] bg-slate-50 border border-black/5 text-slate-600 px-2 py-1 rounded-lg hover:bg-blue-50 hover:text-blue-600 interactive"
                title="点击下载/预览"
              >
                <Paperclip size={10} className="text-slate-400" />
                {a.name}
              </a>
            ))}
          </div>
        </div>

        {/* 审批流水 */}
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2">审批流水</p>
          <div className="space-y-1.5">
            {expense.statusHistory.map((h, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[11px]">
                <CheckCircle2 size={12} className={`mt-0.5 shrink-0 ${h.action.includes('reject') ? 'text-red-400' : 'text-emerald-400'}`} />
                <div className="text-slate-600">
                  <span className="font-medium">{EXPENSE_ACTION_LABELS[h.action] || h.action}</span>
                  <span className="text-slate-400"> · {h.operatorName} · {h.at}</span>
                  {h.comment && <p className={`text-[10px] mt-0.5 ${h.action.includes('reject') ? 'text-red-500' : 'text-slate-400'}`}>{h.comment}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 操作区 */}
        {(isManagerReviewer || (isFinanceActor && (expense.status === 'pending_finance' || expense.status === 'pending_payment')) || canSettle || canEdit || canDelete) && (
          <div className="border-t border-black/5 pt-3">
            {!showRejectInput ? (
              <div className="flex flex-wrap gap-2">
                {isManagerReviewer && (
                  <>
                    <button disabled={busy} onClick={() => run(() => managerReview(expense.id, true), '一级审核已通过，转财务审核')} className="px-3 py-1.5 text-[11px] font-semibold text-white bg-blue-500 rounded-lg interactive disabled:opacity-60">通过（一级审核）</button>
                    <button disabled={busy} onClick={() => { setRejectStage('manager'); setShowRejectInput(true) }} className="px-3 py-1.5 text-[11px] font-semibold text-red-500 bg-red-50 rounded-lg interactive">驳回</button>
                  </>
                )}
                {isFinanceActor && expense.status === 'pending_finance' && (
                  <>
                    <button disabled={busy} onClick={() => run(() => financeReview(expense.id, true), '财务审核已通过，进入核销打款')} className="px-3 py-1.5 text-[11px] font-semibold text-white bg-indigo-500 rounded-lg interactive disabled:opacity-60">通过（财务审核）</button>
                    <button disabled={busy} onClick={() => { setRejectStage('finance'); setShowRejectInput(true) }} className="px-3 py-1.5 text-[11px] font-semibold text-red-500 bg-red-50 rounded-lg interactive">驳回</button>
                  </>
                )}
                {isFinanceActor && expense.status === 'pending_payment' && (
                  <button disabled={busy} onClick={() => run(() => payExpense(expense.id), '已完成打款，等待申请人签收')} className="px-3 py-1.5 text-[11px] font-semibold text-white bg-emerald-500 rounded-lg interactive disabled:opacity-60">确认打款</button>
                )}
                {canSettle && (
                  <button disabled={busy} onClick={() => run(() => settleExpense(expense.id), '已签收确认，单据核销办结')} className="px-3 py-1.5 text-[11px] font-semibold text-white bg-cyan-500 rounded-lg interactive disabled:opacity-60">签收确认</button>
                )}
                {canEdit && (
                  <button onClick={() => { onClose(); onEdit(expense) }} className="px-3 py-1.5 text-[11px] font-medium text-blue-500 bg-blue-50 rounded-lg interactive flex items-center gap-1">
                    <Edit3 size={11} /> {expense.status === 'rejected' ? '整改并重新提交' : '编辑'}
                  </button>
                )}
                {canDelete && (
                  <button disabled={busy} onClick={handleDelete} className="px-3 py-1.5 text-[11px] font-medium text-red-400 bg-red-50/60 rounded-lg interactive flex items-center gap-1">
                    <Trash2 size={11} /> 删除
                  </button>
                )}
                {isAdmin && !canDelete && <span className="text-[10px] text-slate-300 self-center">当前状态不可操作</span>}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  className="input-glass w-full text-xs h-16 resize-none"
                  placeholder="请填写驳回原因（必填）：如信息有误、费用不合理、票据不全等"
                />
                <div className="flex gap-2">
                  <button disabled={busy} onClick={handleReject} className="px-3 py-1.5 text-[11px] font-semibold text-white bg-red-500 rounded-lg interactive disabled:opacity-60">确认驳回</button>
                  <button onClick={() => { setShowRejectInput(false); setRejectReason('') }} className="px-3 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-100 rounded-lg interactive">取消</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </GlassModal>
  )
}
