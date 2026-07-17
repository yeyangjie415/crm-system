import { useState } from 'react'
import { toast } from 'sonner'
import GlassModal from '@/components/glass/GlassModal'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import type { Customer, UserRole, SharePermission } from '@/types'
import { ROLE_LABELS, SHARE_PERMISSION_LABELS } from '@/types'
import { Trash2 } from 'lucide-react'

interface ShareModalProps {
  open: boolean
  onClose: () => void
  customer: Customer
  allUsers: Array<{ id: string; name: string; role: UserRole }>
}

export default function ShareModal({ open, onClose, customer, allUsers }: ShareModalProps) {
  const { shareCustomer, removeAccess } = useCustomers()
  const { user } = useAuth()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedPermission, setSelectedPermission] = useState<SharePermission>('view')

  const availableUsers = allUsers.filter(
    u => u.id !== customer.createdBy && !customer.accessControl.some(ac => ac.userId === u.id)
  )

  const handleShare = () => {
    if (!selectedUserId) { toast.error('请选择用户'); return }
    const target = allUsers.find(u => u.id === selectedUserId)
    if (!target) return
    shareCustomer(customer.id, { userId: target.id, userName: target.name, permission: selectedPermission })
    toast.success(`已分享给 ${target.name}`)
    setSelectedUserId('')
    setSelectedPermission('view')
  }

  const handleRemove = (userId: string, userName: string) => {
    if (userId === user?.id) {
      if (!window.confirm(`确定要移除自己的访问权限吗？移除后您将无法查看此客户的详细信息。`)) return
    }
    removeAccess(customer.id, userId)
    toast.success(`已取消 ${userName} 的访问权限`)
  }

  const handleClose = () => {
    setSelectedUserId('')
    setSelectedPermission('view')
    onClose()
  }

  return (
    <GlassModal open={open} onClose={handleClose} title={`分享管理 — ${customer.name}`}>
      <div className="space-y-4">
        <div>
          <div className="text-[10px] font-semibold text-slate-500 mb-2">已分享的用户</div>
          {customer.accessControl.length === 0 ? (
            <p className="text-[10px] text-slate-400">暂未分享给其他用户</p>
          ) : (
            <div className="space-y-1.5">
              {customer.accessControl.map(ac => (
                <div key={ac.userId} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-700">{ac.userName}</span>
                    <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                      {SHARE_PERMISSION_LABELS[ac.permission]}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRemove(ac.userId, ac.userName)}
                    className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 interactive"
                    title="移除分享"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
            <span className="font-medium text-slate-600">{customer.createdByName}</span>
            <span>(创建人)</span>
            <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9px]">拥有者</span>
          </div>
        </div>

        <div className="border-t border-black/[0.04] pt-4">
          <div className="text-[10px] font-semibold text-slate-500 mb-2">添加分享</div>
          <div>
            <label className="text-[10px] text-slate-500 block mb-1">选择用户</label>
            <select
              className="input-glass w-full text-xs"
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
            >
              <option value="">请选择用户</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} — {ROLE_LABELS[u.role]}
                </option>
              ))}
            </select>
            {availableUsers.length === 0 && (
              <p className="text-[9px] text-slate-400 mt-1">所有用户已获得访问权限</p>
            )}
          </div>

          <div className="mt-3">
            <label className="text-[10px] text-slate-500 block mb-1.5">访问权限</label>
            <div className="flex gap-2">
              {(['view', 'edit'] as SharePermission[]).map(p => (
                <button
                  key={p}
                  onClick={() => setSelectedPermission(p)}
                  className={`flex-1 py-1.5 text-[10px] font-medium rounded-lg border interactive ${
                    selectedPermission === p
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                  }`}
                >
                  {SHARE_PERMISSION_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleShare}
            disabled={!selectedUserId}
            className="mt-4 w-full py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg interactive disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认分享
          </button>
        </div>
      </div>
    </GlassModal>
  )
}
