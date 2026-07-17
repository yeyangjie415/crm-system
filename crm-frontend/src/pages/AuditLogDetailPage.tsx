import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import GlassPanel from '@/components/glass/GlassPanel'
import { useUsers } from '@/hooks/useUsers'
import { useAuditLog } from '@/hooks/useAuditLog'
import { AUDIT_ACTION_LABELS } from '@/types'
import { ArrowLeft, LogIn, LogOut, Users, FileText } from 'lucide-react'

export default function AuditLogDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { users } = useUsers()
  const { getLogsForUser } = useAuditLog()

  const targetUser = useMemo(() => users.find(u => u.id === userId), [users, userId])
  const logs = useMemo(() => getLogsForUser(userId!), [getLogsForUser, userId])

  const loginLogs = useMemo(() => logs.filter(e => e.action === 'login' || e.action === 'logout'), [logs])
  const customerLogs = useMemo(() => logs.filter(e => e.targetType === 'customer'), [logs])

  if (!targetUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-400 text-sm">用户不存在</p>
        <button onClick={() => navigate('/settings/audit-log')} className="mt-4 text-blue-500 text-xs interactive">
          返回操作日志
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => navigate('/settings')} className="text-xs text-slate-400 hover:text-slate-600 interactive">
          权限设置
        </button>
        <span className="text-xs text-slate-300">/</span>
        <button onClick={() => navigate('/settings/audit-log')} className="text-xs text-slate-400 hover:text-slate-600 interactive">
          操作日志
        </button>
        <span className="text-xs text-slate-300">/</span>
        <span className="text-xs text-blue-500 font-semibold">{targetUser.name}</span>
      </div>

      <button
        onClick={() => navigate('/settings/audit-log')}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-4 interactive"
      >
        <ArrowLeft size={14} /> 返回操作日志
      </button>

      <h1 className="text-xl font-bold text-slate-800 font-display mb-1">
        操作日志详情 — {targetUser.name}
      </h1>
      <p className="text-xs text-slate-400 mb-5">用户名：{targetUser.username}</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Login/Logout history */}
        <GlassPanel title="登录记录">
          {loginLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">暂无登录记录</p>
          ) : (
            <div className="space-y-2">
              {loginLogs.map(log => (
                <div key={log.id} className="flex items-center gap-2 py-1.5 border-b border-black/[0.02] text-xs">
                  {log.action === 'login' ? (
                    <LogIn size={13} className="text-emerald-400 shrink-0" />
                  ) : (
                    <LogOut size={13} className="text-slate-400 shrink-0" />
                  )}
                  <span className="text-slate-600 w-10">{AUDIT_ACTION_LABELS[log.action]}</span>
                  <span className="text-slate-400 flex-1">{log.detail}</span>
                  <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>

        {/* Customer operations */}
        <GlassPanel title="客户操作记录">
          {customerLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">暂无客户操作记录</p>
          ) : (
            <div className="space-y-2">
              {customerLogs.map(log => (
                <div key={log.id} className="flex items-center gap-2 py-1.5 border-b border-black/[0.02] text-xs">
                  <FileText size={13} className="text-blue-400 shrink-0" />
                  <span className="text-slate-600 w-18">{AUDIT_ACTION_LABELS[log.action]}</span>
                  {log.targetName && (
                    <span className="text-slate-500 flex-1">{log.targetName}</span>
                  )}
                  <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  )
}
