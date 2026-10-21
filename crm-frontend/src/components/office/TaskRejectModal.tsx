import { useState } from 'react'
import GlassModal from '@/components/glass/GlassModal'

interface Props {
  task: { id: string; title: string } | null
  onConfirm: (task: { id: string; title: string }, reason: string) => void
  onClose: () => void
}

/** 发件人驳回完成申请的弹窗，必须填写原因 */
export default function TaskRejectModal({ task, onConfirm, onClose }: Props) {
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()

  const handleClose = () => {
    setReason('')
    onClose()
  }

  const handleConfirm = () => {
    if (!trimmed || !task) return
    onConfirm(task, trimmed)
    setReason('')
    onClose()
  }

  return (
    <GlassModal open={!!task} onClose={handleClose} title="驳回任务完成申请">
      <div className="text-xs text-slate-600 leading-relaxed space-y-3">
        <div className="rounded-lg bg-amber-50/60 border border-amber-100 p-3">
          <p className="text-slate-700 font-medium">任务：{task?.title}</p>
        </div>
        <p>驳回后任务将回到「进行中」，被指派者可修改后重新提交。请填写驳回原因：</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="请输入驳回原因（必填）"
          rows={3}
          className="w-full rounded-lg border border-black/10 bg-white/70 px-3 py-2 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 resize-none"
          autoFocus
        />
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={handleClose}
          className="px-3 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleConfirm}
          disabled={!trimmed}
          className="px-3 py-1.5 text-[11px] font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          确认驳回
        </button>
      </div>
    </GlassModal>
  )
}
