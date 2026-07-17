import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import GlassModal from '@/components/glass/GlassModal'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ProfileModal({ open, onClose }: Props) {
  const { user, updateOwnPassword } = useAuth()
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (open) setPassword('')
  }, [open])

  const handleSave = () => {
    if (!password.trim()) { toast.error('请输入新密码'); return }
    updateOwnPassword(password.trim())
    toast.success('密码已修改')
    onClose()
  }

  return (
    <GlassModal open={open} onClose={onClose} title="个人信息">
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">姓名</label>
          <input
            value={user?.name || ''}
            disabled
            className="input-glass w-full text-xs bg-slate-50/50 text-slate-500"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">用户名</label>
          <input
            value={user?.username || ''}
            disabled
            className="input-glass w-full text-xs bg-slate-50/50 text-slate-500"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">密码</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="input-glass w-full text-xs"
            placeholder="输入新密码"
          />
        </div>
        <button
          onClick={handleSave}
          className="w-full py-2.5 text-xs font-semibold text-white bg-blue-500 rounded-lg interactive mt-2"
        >
          保存修改
        </button>
      </div>
    </GlassModal>
  )
}
