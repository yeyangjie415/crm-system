import { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'
import GlassCard from '@/components/glass/GlassCard'
import GlassPanel from '@/components/glass/GlassPanel'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { usePermissionConfig } from '@/hooks/usePermissionConfig'
import { ROLE_LABELS, PERMISSION_LEVEL_LABELS } from '@/types'
import type { Permission, PermissionLevel } from '@/types'
import type { User } from '@/types'
import { UserPlus, Trash2, Ban, Edit3, Check, Lock, Server, RefreshCw, Power, Wifi, WifiOff, Download, Upload } from 'lucide-react'
import UserForm from '@/components/user/UserForm'
import { systemApi, isBackendAvailable, getToken } from '@/lib/api'

const ALL_PERMISSIONS: { key: Permission; label: string }[] = [
  { key: 'view_all', label: '查看全部数据' },
  { key: 'edit_all', label: '编辑全部数据' },
  { key: 'export', label: '导出Excel' },
  { key: 'manage_users', label: '用户管理' },
  { key: 'batch_assign', label: '批量分配' },
]

const PERMISSION_LEVELS: PermissionLevel[] = ['super_admin', 'admin', 'general']

export default function SettingsPage() {
  const { users, deleteUser, toggleDisable } = useUsers()
  const { user: currentUser, isAdmin, isSuperAdmin } = useAuth()
  const { getPermissions, setPermissions } = usePermissionConfig()
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined)

  /* Server status */
  const [backendOnline, setBackendOnline] = useState(false)
  const [autoStart, setAutoStart] = useState(false)
  const [checkingHealth, setCheckingHealth] = useState(false)
  const [restarting, setRestarting] = useState(false)

  const checkHealth = useCallback(async () => {
    setCheckingHealth(true)
    const ok = await isBackendAvailable()
    setBackendOnline(ok)
    if (ok && getToken()) {
      try {
        const { enabled } = await systemApi.getAutoStart()
        setAutoStart(enabled)
      } catch { /* ignore */ }
    }
    setCheckingHealth(false)
  }, [])

  useEffect(() => { checkHealth() }, [checkHealth])

  const handleRestart = async () => {
    if (!window.confirm('确定要重启服务器软件？\n\n所有在线用户将暂时断开连接，服务将在几秒后恢复。')) return
    setRestarting(true)
    try {
      await systemApi.restart()
      toast.success('服务器正在重启...')
      // Poll for reconnection
      let attempts = 0
      const poll = setInterval(async () => {
        attempts++
        const ok = await isBackendAvailable()
        if (ok) {
          clearInterval(poll)
          setBackendOnline(true)
          setRestarting(false)
          toast.success('服务器已重新上线')
        } else if (attempts > 15) {
          clearInterval(poll)
          setRestarting(false)
          toast.error('服务器重启超时，请手动重启')
        }
      }, 2000)
    } catch {
      setRestarting(false)
      toast.error('重启请求发送失败')
    }
  }

  const handleAutoStart = async (enabled: boolean) => {
    try {
      const result = await systemApi.setAutoStart(enabled)
      setAutoStart(result.enabled)
      toast.success(result.message)
    } catch {
      toast.error('操作失败，请以管理员身份运行')
    }
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  const handleDelete = (u: User) => {
    if (!window.confirm(`确定要删除用户「${u.name}」吗？此操作不可撤销。`)) return
    if (u.id === currentUser?.id) { toast.error('不能删除当前登录账号'); return }
    deleteUser(u.id)
    toast.success('用户已删除')
  }

  const openAddForm = () => {
    setEditingUser(undefined)
    setShowForm(true)
  }

  const openEditForm = (u: User) => {
    setEditingUser(u)
    setShowForm(true)
  }

  const handleTogglePermission = (level: PermissionLevel, perm: Permission) => {
    if (!isSuperAdmin || level !== 'admin') return
    const current = getPermissions(level)
    const updated = current.includes(perm)
      ? current.filter(p => p !== perm)
      : [...current, perm]
    setPermissions(level, updated)
    toast.success(`管理员权限已更新`)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 font-display mb-1">权限设置</h1>
      <p className="text-xs text-slate-400 mb-5">管理用户账户与角色权限</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User management */}
        <div className="lg:col-span-2">
          <GlassPanel
            title="用户管理"
            action={
              isAdmin ? (
                <button
                  onClick={openAddForm}
                  className="flex items-center gap-1 text-[10px] text-blue-500 font-medium interactive px-2 py-1 rounded-md bg-blue-50/50"
                >
                  <UserPlus size={12} /> 添加用户
                </button>
              ) : undefined
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-black/5">
                    <th className="text-left py-2 px-3">姓名</th>
                    <th className="text-left py-2 px-3">用户名</th>
                    <th className="text-left py-2 px-3">角色</th>
                    <th className="text-left py-2 px-3">权限等级</th>
                    <th className="text-left py-2 px-3 hidden sm:table-cell">直属主管</th>
                    <th className="text-left py-2 px-3 hidden sm:table-cell">状态</th>
                    <th className="text-left py-2 px-3 hidden md:table-cell">最后登录</th>
                    <th className="text-right py-2 px-3">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isSelf = u.id === currentUser?.id
                    return (
                      <tr key={u.id} className="table-row border-b border-black/[0.02] text-xs">
                        <td className="py-2.5 px-3 font-medium text-slate-700">{u.name}</td>
                        <td className="py-2.5 px-3 text-slate-500">{u.username}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] bg-slate-50 text-slate-600 px-2 py-0.5 rounded font-medium">
                            {ROLE_LABELS[u.role] ?? u.role}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                            u.permissionLevel === 'super_admin' ? 'bg-indigo-50 text-indigo-600' :
                            u.permissionLevel === 'admin' ? 'bg-blue-50 text-blue-600' :
                            'bg-slate-50 text-slate-500'
                          }`}>
                            {PERMISSION_LEVEL_LABELS[u.permissionLevel] ?? u.permissionLevel}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell">
                          {u.managerId ? (users.find(m => m.id === u.managerId)?.name || '—') : <span className="text-slate-300">未指定</span>}
                        </td>
                        <td className="py-2.5 px-3 hidden sm:table-cell">
                          <span className={`inline-flex items-center gap-1 text-[10px] ${u.disabled ? 'text-red-500' : 'text-emerald-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${u.disabled ? 'bg-red-400' : 'bg-emerald-400'}`} />
                            {u.disabled ? '已禁用' : '正常'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 hidden md:table-cell text-[10px]">{u.lastLogin || '—'}</td>
                        <td className="py-2.5 px-3">
                          {isAdmin && (
                            <div className="flex items-center justify-end gap-1">
                              <button className="nav-icon" title="编辑" onClick={() => openEditForm(u)}>
                                <Edit3 size={12} />
                              </button>
                              {!isSelf && (
                                <>
                                  <button className="nav-icon" title={u.disabled ? '启用' : '禁用'} onClick={() => toggleDisable(u.id)}>
                                    <Ban size={12} className={u.disabled ? 'text-amber-500' : ''} />
                                  </button>
                                  <button className="nav-icon" title="删除" onClick={() => handleDelete(u)}>
                                    <Trash2 size={12} className="text-red-400" />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        </div>

        {/* Server status */}
        <div>
          <GlassPanel title="服务器状态">
            {/* Backend status */}
            <div className="flex items-center justify-between py-2 border-b border-black/[0.03]">
              <div className="flex items-center gap-2">
                <Server size={14} className="text-slate-400" />
                <span className="text-xs text-slate-600">后端服务</span>
              </div>
              <div className="flex items-center gap-2">
                {checkingHealth ? (
                  <span className="text-[10px] text-slate-400">检测中...</span>
                ) : (
                  <span className={`flex items-center gap-1 text-[10px] ${backendOnline ? 'text-emerald-500' : 'text-red-400'}`}>
                    {backendOnline ? <><Wifi size={11} /> 在线</> : <><WifiOff size={11} /> 离线</>}
                  </span>
                )}
              </div>
            </div>

            {/* Frontend status */}
            <div className="flex items-center justify-between py-2 border-b border-black/[0.03]">
              <div className="flex items-center gap-2">
                <Server size={14} className="text-slate-400" />
                <span className="text-xs text-slate-600">前端服务</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                <Wifi size={11} /> 在线
              </span>
            </div>

            {/* Restart button */}
            <div className="py-2 border-b border-black/[0.03]">
              <button
                onClick={handleRestart}
                disabled={restarting || !backendOnline}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg interactive hover:bg-blue-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw size={13} className={restarting ? 'animate-spin' : ''} />
                {restarting ? '重启中...' : '一键重启服务器'}
              </button>
            </div>

            {/* Auto-start toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Power size={14} className="text-slate-400" />
                <span className="text-xs text-slate-600">开机自启</span>
              </div>
              <button
                onClick={() => handleAutoStart(!autoStart)}
                className={`relative w-10 h-5 rounded-full transition-colors ${autoStart ? 'bg-blue-500' : 'bg-slate-300'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${autoStart ? 'translate-x-5' : ''}`}
                />
              </button>
            </div>
            <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">
              开启后，Windows 系统启动时自动运行 CRM 服务。需要管理员权限。
            </p>
          </GlassPanel>

          {/* Data Management */}
          <GlassPanel title="数据管理" className="mt-4">
            <div className="space-y-3">
              <p className="text-[10px] text-slate-500 leading-relaxed">
                备份当前数据库文件或从备份文件恢复。升级前建议先下载备份。
              </p>

              {/* Download backup */}
              <button
                onClick={async () => {
                  try {
                    toast.loading('正在创建备份...', { id: 'backup' })
                    const res = await fetch('/api/system/backup', { headers: { Authorization: 'Bearer ' + getToken() } })
                    if (!res.ok) { toast.error('备份失败', { id: 'backup' }); return }
                    const blob = await res.blob()
                    const url = URL.createObjectURL(blob)
                    const disposition = res.headers.get('content-disposition') || ''
                    const match = disposition.match(/filename="?(.+?)"?$/)
                    const name = match?.[1] || `crm-backup-${new Date().toISOString().slice(0, 10)}.db`
                    const a = document.createElement('a'); a.href = url; a.download = name
                    a.click(); URL.revokeObjectURL(url)
                    toast.success('备份已下载', { id: 'backup' })
                  } catch {
                    toast.error('备份失败', { id: 'backup' })
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg interactive hover:bg-blue-100 transition-colors"
              >
                <Download size={13} /> 下载备份
              </button>

              {/* Upload restore */}
              <div className="relative">
                <input
                  type="file"
                  accept=".db"
                  id="restore-upload"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (!window.confirm(`确定从「${file.name}」恢复数据库？\n\n当前数据将被替换。恢复后需要重启服务。`)) return
                    try {
                      toast.loading('正在恢复...', { id: 'restore' })
                      const reader = new FileReader()
                      const base64 = await new Promise<string>((resolve, reject) => {
                        reader.onload = () => resolve((reader.result as string).split(',')[1])
                        reader.onerror = reject
                        reader.readAsDataURL(file)
                      })
                      await systemApi.restore(base64)
                      toast.success('数据库已恢复，请重启服务', { id: 'restore' })
                    } catch {
                      toast.error('恢复失败', { id: 'restore' })
                    }
                    if (e.target) e.target.value = ''
                  }}
                />
                <label htmlFor="restore-upload" className="block w-full cursor-pointer">
                  <div className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-amber-600 bg-amber-50 rounded-lg interactive hover:bg-amber-100 transition-colors">
                    <Upload size={13} /> 上传恢复
                  </div>
                </label>
              </div>
            </div>
          </GlassPanel>
        </div>

        {/* Permission matrix */}
        <div>
          <GlassPanel title="角色权限矩阵">
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left py-1.5 px-1 text-slate-500 font-semibold whitespace-nowrap">等级</th>
                    {ALL_PERMISSIONS.map(p => (
                      <th key={p.key} className="text-center py-1.5 px-0.5 text-slate-500 font-medium leading-tight">
                        {p.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERMISSION_LEVELS.map(level => {
                    const perms = getPermissions(level)
                    const isClickable = isSuperAdmin && level === 'admin'
                    return (
                      <tr key={level} className="border-b border-black/[0.02] hover:bg-slate-50/30 transition-colors">
                        <td className="py-1.5 px-1">
                          <span className={`text-[9px] px-1 py-0.5 rounded font-medium whitespace-nowrap ${
                            level === 'super_admin' ? 'bg-indigo-50 text-indigo-600' :
                            level === 'admin' ? 'bg-blue-50 text-blue-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>
                            {PERMISSION_LEVEL_LABELS[level]}
                          </span>
                        </td>
                        {ALL_PERMISSIONS.map(p => {
                          const has = perms.includes(p.key)
                          if (level === 'super_admin') {
                            return (
                              <td key={p.key} className="text-center py-1.5 px-0.5">
                                <Check size={14} className="text-indigo-400 mx-auto" />
                              </td>
                            )
                          }
                          if (level === 'general') {
                            return (
                              <td key={p.key} className="text-center py-1.5 px-0.5">
                                <Lock size={12} className="text-slate-300 mx-auto" />
                              </td>
                            )
                          }
                          return (
                            <td
                              key={p.key}
                              className={`text-center py-1.5 px-0.5 ${isClickable ? 'cursor-pointer interactive rounded hover:bg-blue-50/50' : ''}`}
                              onClick={() => handleTogglePermission(level, p.key)}
                            >
                              {has ? (
                                <Check size={14} className={`mx-auto ${isClickable ? 'text-blue-500' : 'text-blue-400'}`} />
                              ) : (
                                <span className="text-slate-300 text-xs">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </GlassPanel>

          {/* Login settings */}
          <GlassCard className="mt-4 p-4">
            <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">登录设置</h3>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              一次登录有效期为 30 天，有效期内无需重复输入账号密码。
              仅超级管理员可注册和分发用户账户。人员离职时，客户归属可批量转移，操作记录日志。
            </p>
          </GlassCard>
        </div>
      </div>

      <UserForm
        open={showForm}
        onClose={() => setShowForm(false)}
        user={editingUser}
      />
    </div>
  )
}
