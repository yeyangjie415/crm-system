import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import GlassModal from '@/components/glass/GlassModal'
import { useCustomers } from '@/hooks/useCustomers'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABELS } from '@/types'
import { Search, UserCog } from 'lucide-react'

interface ReassignModalProps {
  open: boolean
  onClose: () => void
  selectedIds: string[]
  onReassigned: () => void
}

export default function ReassignModal({ open, onClose, selectedIds, onReassigned }: ReassignModalProps) {
  const { customers, reassignCustomer } = useCustomers()
  const { users } = useUsers()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState('')

  const selectedCustomers = useMemo(
    () => customers.filter(c => selectedIds.includes(c.id)),
    [customers, selectedIds],
  )

  const filteredUsers = useMemo(() => {
    const active = users.filter(u => !u.disabled)
    if (!search) return active
    const q = search.toLowerCase()
    return active.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    )
  }, [users, search])

  const handleReassign = () => {
    if (!selectedUserId) { toast.error('请选择目标创建人'); return }
    if (!user) return
    const target = users.find(u => u.id === selectedUserId)
    if (!target) return

    selectedIds.forEach(id => {
      reassignCustomer(id, target.id, target.name, user.name)
    })
    toast.success(`已将 ${selectedIds.length} 个客户的创建人变更为「${target.name}」`)
    setSelectedUserId('')
    onReassigned()
  }

  const handleClose = () => {
    setSearch('')
    setSelectedUserId('')
    onClose()
  }

  return (
    <GlassModal open={open} onClose={handleClose} title="分配创建人">
      <div className="space-y-4">
        {/* Selected customers summary */}
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-[10px] font-semibold text-slate-500 mb-2">
            已选 {selectedIds.length} 个客户
          </p>
          <div className="max-h-24 overflow-y-auto space-y-1">
            {selectedCustomers.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-[10px]">
                <span className="text-slate-700 font-medium">{c.name}</span>
                <span className="text-slate-400">—</span>
                <span className="text-slate-400">现创建人：{c.createdByName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User picker */}
        <div>
          <label className="text-[10px] font-semibold text-slate-500 block mb-2">选择新创建人</label>

          {/* Search */}
          <div className="relative mb-2">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              className="input-glass w-full pl-7 pr-3 py-1.5 text-[10px]"
              placeholder="搜索用户..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* User list */}
          <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-lg">
            {filteredUsers.length === 0 ? (
              <p className="text-[10px] text-slate-400 text-center py-6">无匹配用户</p>
            ) : (
              filteredUsers.map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUserId(u.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-b-0 ${
                    selectedUserId === u.id ? 'bg-blue-50 ring-1 ring-blue-200' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0 ${
                    selectedUserId === u.id
                      ? 'bg-blue-500'
                      : 'bg-gradient-to-br from-slate-400 to-slate-500'
                  }`}>
                    {u.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${
                      selectedUserId === u.id ? 'text-blue-700' : 'text-slate-700'
                    }`}>
                      {u.name}
                    </p>
                    <p className="text-[9px] text-slate-400">{ROLE_LABELS[u.role]}</p>
                  </div>
                  {selectedUserId === u.id && (
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Action */}
        <button
          onClick={handleReassign}
          disabled={!selectedUserId}
          className="w-full py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg interactive disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <UserCog size={14} />
          确认分配（{selectedIds.length} 个客户）
        </button>
      </div>
    </GlassModal>
  )
}
