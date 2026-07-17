import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'
import { NOTIFICATION_TYPE_LABELS } from '@/types'
import type { Notification } from '@/types'
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
  return <><span className="font-medium text-slate-700">{n.fromUserName}</span>{' '}申请共同跟进客户「{n.customerName}」</>
}

export default function NotificationDropdown({ onClose }: Props) {
  const { user } = useAuth()
  const { notifications: allNotifications, unreadCount, markAsRead, markAllAsRead, respondToRequest } = useNotifications()
  const navigate = useNavigate()

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

            return (
              <div
                key={n.id}
                className={`px-4 py-2.5 border-b border-black/[0.02] ${!n.read ? 'bg-blue-50/30' : ''} ${isContractNotification ? 'cursor-pointer hover:bg-blue-50/40' : ''}`}
                onClick={() => {
                  if (!n.read) markAsRead(n.id)
                  if (isContractNotification && n.contractId) {
                    navigate(`/deals/${n.contractId}`)
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

                  {isCoFollowPending && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); respondToRequest(n.id, 'approved') }}
                        className="p-1 text-emerald-500 hover:bg-emerald-50 rounded transition-colors"
                        title="同意"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); respondToRequest(n.id, 'rejected') }}
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
    </div>
  )
}
