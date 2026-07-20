import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useParallax } from '@/hooks/useParallax'
import Marquee from '@/components/layout/Marquee'
import { Building2 } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const scrollY = useParallax()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(async () => {
      const ok = await login(username, password)
      setLoading(false)
      if (ok) {
        toast.success('登录成功，欢迎回来')
        navigate('/')
      } else {
        toast.error('用户名或密码错误')
      }
    }, 600)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)' }}
    >
      {/* Parallax background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-[10%] left-[5%] w-[400px] h-[400px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
            transform: `translateY(${scrollY * 0.2}px)`,
          }}
        />
        <div
          className="absolute bottom-[15%] right-[8%] w-[350px] h-[350px] rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            transform: `translateY(${scrollY * -0.15}px)`,
          }}
        />
        <div
          className="absolute top-[50%] left-[60%] w-[250px] h-[250px] rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
            transform: `translateY(${scrollY * 0.3}px)`,
          }}
        />
      </div>

      {/* Login card */}
      <div className="glass-modal w-full max-w-[380px] mx-4 p-8 relative z-10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4">
            <Building2 size={24} className="text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 font-display">CRM 系统</h1>
          <p className="text-xs text-slate-400 mt-1">企业内部销售管理系统</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-glass w-full"
              placeholder="请输入用户名"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-glass w-full"
              placeholder="请输入密码"
              autoComplete="current-password"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-slate-300"
            />
            <label htmlFor="remember" className="text-[10px] text-slate-500">记住登录（30天有效）</label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg interactive disabled:opacity-50"
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>

      </div>

      {/* Bottom marquee */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <Marquee />
      </div>
    </div>
  )
}
