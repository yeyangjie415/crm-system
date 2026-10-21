import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import GlassModal from '@/components/glass/GlassModal'
import { useUsers } from '@/hooks/useUsers'
import { ROLE_LABELS, JOB_ROLES, PERMISSION_LEVEL_LABELS } from '@/types'
import type { User, UserRole, PermissionLevel } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  user?: User
}

export default function UserForm({ open, onClose, user }: Props) {
  const { users, addUser, updateUser } = useUsers()
  const isEdit = !!user

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('salesperson')
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('general')
  const [managerId, setManagerId] = useState('')
  const [usernameTouched, setUsernameTouched] = useState(false)

  // 直属主管候选：其他未禁用用户（不能选自己）
  const managerCandidates = users.filter(u => u.id !== user?.id && !u.disabled)

  // 实时查重：当前填写的用户名是否与其他用户重复
  const usernameDuplicate = useMemo(() => {
    if (!username.trim()) return false
    return users.some(
      u => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== user?.id
    )
  }, [username, users, user?.id])

  // 弹窗打开时重置所有字段
  useEffect(() => {
    if (open) {
      if (user) {
        setName(user.name)
        setUsername(user.username)
        setPassword('')
        setRole(user.role)
        setPermissionLevel(user.permissionLevel)
        setManagerId(user.managerId || '')
      } else {
        setName('')
        setUsername('')
        setPassword('')
        setRole('salesperson')
        setPermissionLevel('general')
        setManagerId('')
      }
      setUsernameTouched(false)
    }
  }, [open, user])

  const handleSubmit = () => {
    if (!name.trim()) { toast.error('请填写姓名'); return }
    if (!username.trim()) { toast.error('请填写用户名'); return }
    if (!isEdit && !password.trim()) { toast.error('请填写密码'); return }

    if (usernameDuplicate) { toast.error('用户名已存在'); return }

    if (isEdit) {
      updateUser(user!.id, {
        name: name.trim(),
        username: username.trim(),
        password: password.trim() || undefined,
        role,
        permissionLevel,
        managerId: managerId || null,
      })
      toast.success('用户信息已更新')
    } else {
      addUser({
        name: name.trim(),
        username: username.trim(),
        password: password.trim(),
        role,
        permissionLevel,
        managerId: managerId || null,
      })
      toast.success('用户创建成功')
    }
    onClose()
  }

  return (
    <GlassModal open={open} onClose={onClose} title={isEdit ? '编辑用户' : '添加用户'}>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">姓名 *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            autoComplete="off"
            className="input-glass w-full text-xs"
            placeholder="用户姓名"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">用户名 *</label>
          <input
            value={username}
            onChange={e => { setUsername(e.target.value); if (!usernameTouched) setUsernameTouched(true) }}
            onBlur={() => setUsernameTouched(true)}
            autoComplete="off"
            className={`input-glass w-full text-xs ${usernameTouched && usernameDuplicate ? 'border-red-300 bg-red-50/30' : ''}`}
            placeholder="登录用户名"
          />
          {usernameTouched && usernameDuplicate && (
            <p className="text-[10px] text-red-500 mt-1">用户名已存在，请更换</p>
          )}
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">
            密码 {isEdit ? '(留空则不修改)' : '*'}
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
            className="input-glass w-full text-xs"
            placeholder={isEdit ? '留空则不修改密码' : '设置登录密码'}
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">角色</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            className="input-glass w-full text-xs"
          >
            {JOB_ROLES.map(k => (
              <option key={k} value={k}>{ROLE_LABELS[k]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">权限等级</label>
          <select
            value={permissionLevel}
            onChange={e => setPermissionLevel(e.target.value as PermissionLevel)}
            className="input-glass w-full text-xs"
          >
            {Object.entries(PERMISSION_LEVEL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">直属主管（报销一级审核人）</label>
          <select
            value={managerId}
            onChange={e => setManagerId(e.target.value)}
            className="input-glass w-full text-xs"
          >
            <option value="">未指定（由总经理/管理员兜底审核）</option>
            {managerCandidates.map(u => (
              <option key={u.id} value={u.id}>{u.name}（{ROLE_LABELS[u.role]}）</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleSubmit}
          className="w-full py-2.5 text-xs font-semibold text-white bg-blue-500 rounded-lg interactive mt-2"
        >
          {isEdit ? '保存修改' : '创建用户'}
        </button>
      </div>
    </GlassModal>
  )
}
