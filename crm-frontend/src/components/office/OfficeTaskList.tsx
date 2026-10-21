import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Clock, User, ArrowRight, Edit3, Trash2 } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { getDeadlineLabel } from '@/lib/utils'
import OfficeTaskForm from '@/components/office/OfficeTaskForm'
import TaskSubmitConfirmModal from '@/components/office/TaskSubmitConfirmModal'
import TaskRejectModal from '@/components/office/TaskRejectModal'
import type { Task } from '@/types'

export default function OfficeTaskList({ tasks: propTasks, showCompleted }: { tasks?: Task[]; showCompleted?: boolean }) {
  const { tasks: hookTasks, updateTask, deleteTask, submitTask, approveTask, rejectTask } = useTasks()
  const tasks = propTasks ?? hookTasks
  const { user, isAdmin } = useAuth()
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [confirmTask, setConfirmTask] = useState<Task | null>(null)
  const [rejectingTask, setRejectingTask] = useState<Task | null>(null)

  const handleSubmit = (task: Task) => submitTask(task.id)

  const handleReopen = (task: Task) => {
    if (task.assignedBy !== user?.name && !isAdmin) {
      toast.error('仅发件人可重新打开任务')
      return
    }
    updateTask(task.id, { status: 'pending' })
    toast.success('任务已重新打开')
  }

  const handleDelete = (task: Task) => {
    if (window.confirm(`确定删除任务「${task.title}」？`)) {
      deleteTask(task.id)
      toast.success('任务已删除')
    }
  }

  const handleReject = (task: { id: string; title: string }, reason: string) => {
    rejectTask(task.id, reason)
  }

  const canEditDelete = (task: Task) => task.assignedBy === user?.name
  const canReview = (task: Task) => task.assignedBy === user?.name || isAdmin

  const active = tasks.filter(t => !t.completed)
  const completed = tasks.filter(t => t.completed)

  // Show active or completed based on toggle
  const displayTasks = showCompleted ? completed : active

  return (
    <div className="space-y-1.5">
      {displayTasks.length === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">
          {showCompleted ? '暂无已完成的任务' : '🎉 所有协同任务已完成'}
        </p>
      ) : (
        displayTasks.map(task => {
          const deadline = getDeadlineLabel(task.deadline)
          const isDone = task.completed
          const isSubmitted = task.status === 'submitted'
          const reviewable = isSubmitted && canReview(task)
          return (
            <div key={task.id} className={`table-row w-full p-2.5 rounded-lg border ${isDone ? 'border-emerald-100 bg-emerald-50/30' : isSubmitted ? 'border-amber-200 bg-amber-50/30' : 'border-black/3 bg-white/40'}`}>
              <div className="flex items-center gap-3 w-full">
                {isDone ? (
                  <button
                    onClick={() => handleReopen(task)}
                    className="w-5 h-5 rounded-md border-2 border-emerald-300 flex items-center justify-center shrink-0 interactive hover:border-amber-400 hover:bg-amber-50 transition-colors bg-emerald-50"
                    title="重新打开（仅发件人）"
                  >
                    <Check size={12} className="text-emerald-500" />
                  </button>
                ) : isSubmitted ? (
                  <span className="w-5 h-5 rounded-md border-2 border-amber-300 bg-amber-50 flex items-center justify-center shrink-0 cursor-not-allowed" title="待发件人确认">
                    <Clock size={11} className="text-amber-500" />
                  </span>
                ) : (
                  <button
                    onClick={() => setConfirmTask(task)}
                    className="w-5 h-5 rounded-md border-2 border-slate-200 flex items-center justify-center shrink-0 interactive hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                    title="提交完成"
                  >
                    <Check size={12} className="text-emerald-500 opacity-0 hover:opacity-100" />
                  </button>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isDone ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.title}</p>
                  <p className={`text-[10px] truncate mt-0.5 ${isDone ? 'text-slate-300' : 'text-slate-400'}`}>{task.content}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <span className="text-[9px] text-slate-400 flex items-center gap-1">
                    <User size={9} />{task.assignedBy}
                  </span>
                  <ArrowRight size={10} className="text-slate-300" />
                  <span className="text-[9px] text-slate-400 flex items-center gap-1">
                    <User size={9} />{task.assignedTo}
                  </span>
                  {reviewable && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => approveTask(task.id)}
                        className="text-[9px] text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded font-medium interactive"
                        title="同意完成"
                      >
                        同意
                      </button>
                      <button
                        onClick={() => setRejectingTask(task)}
                        className="text-[9px] text-red-500 bg-red-50 hover:bg-red-100 border border-red-200 px-1.5 py-0.5 rounded font-medium interactive"
                        title="驳回完成申请"
                      >
                        驳回
                      </button>
                    </div>
                  )}
                  {canEditDelete(task) && task.status === 'pending' && (
                    <>
                      <button onClick={() => setEditingTask(task)} className="text-[9px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium interactive flex items-center gap-0.5">
                        <Edit3 size={9} /> 编辑
                      </button>
                      <button onClick={() => handleDelete(task)} className="text-[9px] text-red-400 bg-red-50 px-1.5 py-0.5 rounded font-medium interactive flex items-center gap-0.5">
                        <Trash2 size={9} /> 删除
                      </button>
                    </>
                  )}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex items-center gap-1 ${isDone ? 'text-slate-300 bg-slate-100' : isSubmitted ? 'text-amber-600 bg-amber-100' : deadline.color}`}>
                    <Clock size={9} />{isDone ? '已完成' : isSubmitted ? '待发件人确认' : deadline.label}
                  </span>
                </div>
              </div>
            </div>
          )
        })
      )}
      {editingTask && (
        <OfficeTaskForm open={!!editingTask} onClose={() => setEditingTask(null)} task={editingTask} />
      )}
      <TaskSubmitConfirmModal task={confirmTask} onConfirm={handleSubmit} onClose={() => setConfirmTask(null)} />
      <TaskRejectModal task={rejectingTask} onConfirm={handleReject} onClose={() => setRejectingTask(null)} />
    </div>
  )
}
