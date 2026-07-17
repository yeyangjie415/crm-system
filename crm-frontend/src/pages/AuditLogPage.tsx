import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassPanel from '@/components/glass/GlassPanel'
import { useUsers } from '@/hooks/useUsers'
import { useAuditLog } from '@/hooks/useAuditLog'
import { ROLE_LABELS, PERMISSION_LEVEL_LABELS } from '@/types'
import { ArrowRight } from 'lucide-react'

export default function AuditLogPage() {
  const navigate = useNavigate()
  const { users } = useUsers()
  const { entries } = useAuditLog()

  const userStats = useMemo(() => {
    return users.map(u => {
      const userLogs = entries.filter(e => e.userId === u.id)
      const lastLogin = userLogs.find(e => e.action === 'login')
      return {
        user: u,
        logCount: userLogs.length,
        lastLoginTime: lastLogin?.timestamp || u.lastLogin || '—',
      }
    })
  }, [users, entries])

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={() => navigate('/settings')}
          className="text-xs text-slate-400 hover:text-slate-600 interactive"
        >
          权限设置
        </button>
        <span className="text-xs text-slate-300">/</span>
        <span className="text-xs text-blue-500 font-semibold">操作日志</span>
      </div>
      <h1 className="text-xl font-bold text-slate-800 font-display mb-1">操作日志</h1>
      <p className="text-xs text-slate-400 mb-5">查看所有用户的操作记录</p>

      <GlassPanel title="用户操作概览">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-black/5">
                <th className="text-left py-2 px-3">姓名</th>
                <th className="text-left py-2 px-3">用户名</th>
                <th className="text-left py-2 px-3 hidden sm:table-cell">角色</th>
                <th className="text-left py-2 px-3 hidden sm:table-cell">权限等级</th>
                <th className="text-left py-2 px-3 hidden md:table-cell">最后登录时间</th>
                <th className="text-left py-2 px-3">操作次数</th>
                <th className="text-right py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {userStats.map(({ user, logCount, lastLoginTime }) => (
                <tr
                  key={user.id}
                  className="table-row border-b border-black/[0.02] text-xs cursor-pointer hover:bg-blue-50/20"
                  onClick={() => navigate(`/settings/audit-log/${user.id}`)}
                >
                  <td className="py-2.5 px-3 font-medium text-slate-700">{user.name}</td>
                  <td className="py-2.5 px-3 text-slate-500">{user.username}</td>
                  <td className="py-2.5 px-3 hidden sm:table-cell">
                    <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded font-medium">
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 hidden sm:table-cell">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                      user.permissionLevel === 'super_admin' ? 'bg-indigo-50 text-indigo-600' :
                      user.permissionLevel === 'admin' ? 'bg-blue-50 text-blue-600' :
                      'bg-slate-50 text-slate-500'
                    }`}>
                      {PERMISSION_LEVEL_LABELS[user.permissionLevel]}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 hidden md:table-cell text-[10px]">{lastLoginTime}</td>
                  <td className="py-2.5 px-3">
                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                      {logCount}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <ArrowRight size={14} className="text-slate-300 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassPanel>
    </div>
  )
}
