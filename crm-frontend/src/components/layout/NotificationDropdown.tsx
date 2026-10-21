import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/hooks/useNotifications'
import { useTasks } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'
import { NOTIFICATION_TYPE_LABELS } from '@/types'
import type { Notification } from '@/types'
import TaskRejectModal from '@/components/office/TaskRejectModal'
import { Check, X, Bell } from 'lucide-react'

interface Props {
  onClose: () => void
}

function getTypeBadgeColor(type: Notification['type']) {
  if (type === 'contract_submitted') return 'bg-purple-50 text-purple-600'
  if (type === 'contract_approved') return 'bg-emerald-50 text-emerald-600'
  if (type === 'contract_rejected') return 'bg-red-50 text-red-500'
  if (type === 'co_follow_request') return 'bg-blue-50 text-blue-600'
  if (type === 'co_follow_approved') return 'bg-emerald-50 text-emerald-600'
  if (type === 'expense_submitted') return 'bg-amber-50 text-amber-600'
  if (type === 'expense_manager_approved') return 'bg-blue-50 text-blue-600'
  if (type === 'expense_finance_approved') return 'bg-indigo-50 text-indigo-600'
  if (type === 'expense_paid') return 'bg-emerald-50 text-emerald-600'
  if (type === 'expense_rejected') return 'bg-red-50 text-red-500'
  if (type === 'task_submitted') return 'bg-amber-50 text-amber-600'
  if (type === 'task_approved') return 'bg-emerald-50 text-emerald-600'
  if (type === 'task_rejected') return 'bg-red-50 text-red-500'
  return 'bg-slate-50 text-slate-500'
}

function getNotificationText(n: Notification) {
  if (n.type === 'contract_submitted') {
    return <><span className="font-medium text-slate-700">{n.fromUserName}</span>{' '}提交了合同审批：{n.customerName}</>
  }
  if (n.type === 'contract_approved') {
    return <><span className="font-medium text-slate-700">{n.fromUserName}</span>{' '}审批通过了合同：{n.customerName}</>
  }
  if (n.type === 'contract_rejected') {
    return <><span className="font-medium text-slate-700">{n.fromUserName}</span>{' '}驳回了合同：{n.customerName}</>
  }
  if (n.type === 'co_follow_approved') {
    return <><span className="font-medium text-slate-700">{n.fromUserName}</span>{' '}已通过共同跟进客户「{n.customerName}」</>
  }
  if (n.type === 'co_follow_rejected') {
    return <><span className="font-medium text-slate-700">{n.fromUserName}</span>{' '}已拒绝共同跟进客户「{n.customerName}」</>
  }
  if (n.type === 'expense_submitted') {
    return <><span className="font-medium text-slate-700">{n.fromUserName}</span>{' '}提交了外勤费用报销（客户：{n.customerName}），待您一级审核</>
  }
  if (n.type === 'expense_manager_approved') {
    return <><span className="font-medium text-slate-700">{n.fromUserName}</span>{' '}通过了报销单一级审核（客户：{n.customerName}），待财务审核</>
  }
  if (n.type === 'expense_finance_approved') {
    return <>您的报销单（客户：{n.customerName}）已通过财务审核，等待打款</>
  }
  if (n.type === 'expense_paid') {
    return <>您的报销单（客户：{n.customerName}）已打款，请签收确认</>
  }
  if (n.type === 'expense_rejected') {
    return <><span className="font-medium text-slate-700">{n.fromUserName}</span>{' '}驳回了您的报销单（客户：{n.customerName}），请查看原因并整改重提</>
  }
  if (n.type === 'task_submitted') {
    return <><span className="font-medium text-slate-700">{n.fromUserName}</span>{' '}提交了任务「{n.customerName}」的完成申请，待您确认</>
  }
  if (n.type === 'task_approved') {
    return <><span className="font-medium text-slate-700">{n.fromUserName}</span>{' '}已确认任务「{n.customerName}」已完成</>
  }
  if (n.type === 'task_rejected') {
    return <><span className="font-medium text-slate-700">{n.fromUserName}</span>{' '}驳回了任务「{n.customerName}」的完成申请{n.comment ? <>，原因：{n.comment}</> : null}</>
  }
  return <><span className="font-medium text-slate-700">{n.fromUserName}</span>{' '}申请共同跟进客户「{n.customerName}」</>
}

const TASK_TYPES = ['task_submitted', 'task_approved', 'task_rejected']

const EXPENSE_TYPES = ['expense_submitted', 'expense_manager_approved', 'expense_finance_approved', 'expense_paid', 'expense_rejected']

export default function NotificationDropdown({ onClose }: Props) {
  const { user } = useAuth()
  const { notifications: allNotifications, unreadCount, markAsRead, markAllAsRead, respondToRequest, resolveNotification } = useNotifications()
  const { approveTask, rejectTask } = useTasks()
  const navigate = useNavigate()
  const [rejectingNotif, setRejectingNotif] = useState<Notification | null>(null)

  const handleApproveTask = (n: Notification) => {
    if (!n.taskId) return
    approveTask(n.taskId)
    resolveNotification(n.id, 'approved')
    toast.success('已同意任务完成')
  }

  const handleRejectTask = (_task: { id: string; title: string }, reason: string) => {
    if (!rejectingNotif?.taskId) return
    rejectTask(rejectingNotif.taskId, reason)
    resolveNotification(rejectingNotif.id, 'rejected')
    toast.success('已驳回任务完成申请')
  }

  /* Only show notifications the user received or initiated */
  const notifications = useMemo(() =>
    allNotifications.filter(n => n.toUserId === user?.id || n.fromUserId === user?.id),
    [allNotifications, user?.id])

  return (
    <div
      className="absolute right-0 top-full mt-2 w-80 glass-card p-0 shadow-lg z-50"
      style={{ background: 'rgba(255, 255, 255, 0.9)' }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-black/5">
        <span className="text-xs font-semibold text-slate-700">
          通知
          {unreadCount > 0 && (
            <span className="ml-1.5 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </span>
        {unreadCount > 0 && (
          <button
            onClick={() => { markAllAsRead(); onClose() }}
            className="text-[10px] text-blue-500 hover:text-blue-600 font-medium"
          >
            全部已读
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-slate-400">
            <Bell size={28} className="mb-2 opacity-50" />
            <p className="text-[10px]">暂无通知</p>
          </div>
        ) : (
          notifications.map(n => {
            const isCoFollowPending = n.type === 'co_follow_request' && n.status === 'pending'
            const isResolved = n.status === 'approved' || n.status === 'rejected'
            const isContractNotification = n.type === 'contract_submitted' || n.type === 'contract_approved' || n.type === 'contract_rejected'
            const isExpenseNotification = EXPENSE_TYPES.includes(n.type)
            const isTaskNotification = TASK_TYPES.includes(n.type)
            const isTaskPending = n.type === 'task_submitted' && n.status === 'pending'
            const isClickable = isContractNotification || isExpenseNotification || isTaskNotification

            return (
              <div
                key={n.id}
                className={`px-4 py-2.5 border-b border-black/[0.02] ${!n.read ? 'bg-blue-50/30' : ''} ${isClickable ? 'cursor-pointer hover:bg-blue-50/40' : ''}`}
                onClick={() => {
                  if (!n.read) markAsRead(n.id)
                  if (isContractNotification && n.contractId) {
                    navigate(`/deals/${n.contractId}`)
                    onClose()
                  } else if (isExpenseNotification) {
                    navigate('/expenses')
                    onClose()
                  } else if (isTaskNotification) {
                    navigate('/office')
                    onClose()
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${getTypeBadgeColor(n.type)}`}>
                        {NOTIFICATION_TYPE_LABELS[n.type]}
                      </span>
                      {isResolved && (
                        <span className={`text-[9px] px-1 py-0.5 rounded ${
                          n.status === 'approved' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-400'
                        }`}>
                          {n.status === 'approved' ? '已通过' : '已拒绝'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed">
                      {getNotificationText(n)}
                    </p>
                    <p className="text-[9px] text-slate-400 mt-1">{n.createdAt}</p>
                  </div>

                  {(isCoFollowPending || isTaskPending) && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); if (isTaskPending) handleApproveTask(n); else respondToRequest(n.id, 'approved') }}
                        className="p-1 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                        title="同意"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); if (isTaskPending) setRejectingNotif(n); else respondToRequest(n.id, 'rejected') }}
                        className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors"
                        title="拒绝"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
      <TaskRejectModal
        task={rejectingNotif ? { id: rejectingNotif.taskId || '', title: rejectingNotif.customerName } : null}
        onConfirm={handleRejectTask}
        onClose={() => setRejectingNotif(null)}
      />
    </div>
  )
}
