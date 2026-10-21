import GlassModal from '@/components/glass/GlassModal'
import type { Task } from '@/types'

interface Props {
  task: Task | null
  onConfirm: (task: Task) => void
  onClose: () => void
}

/** 提交完成前的确认弹窗，防止误操作 */
export default function TaskSubmitConfirmModal({ task, onConfirm, onClose }: Props) {
  if (!task) return null
  const isSelfAssigned = task.assignedBy === task.assignedTo

  return (
    <GlassModal open={!!task} onClose={onClose} title="确认提交完成">
      <div className="text-xs text-slate-600 leading-relaxed space-y-3">
        <div className="rounded-lg bg-blue-50/60 border border-blue-100 p-3">
          <p className="text-slate-700 font-medium mb-1">任务：{task.title}</p>
          <p className="text-slate-400 text-[11px] line-clamp-2">{task.content}</p>
        </div>
        {isSelfAssigned ? (
          <p>您为该任务的指派负责人，确认后将<b className="text-emerald-600">直接标记为完成</b>。</p>
        ) : (
          <p>
            提交后将进入<b className="text-amber-600">「待发件人确认」</b>状态，并通知发件人（{task.assignedBy}），
            需发件人同意后才算真正完成。
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-[11px] font-medium text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          onClick={() => { onConfirm(task); onClose() }}
          className="px-3 py-1.5 text-[11px] font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          确认提交
        </button>
      </div>
    </GlassModal>
  )
}
