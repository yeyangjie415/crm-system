import { useNavigate } from 'react-router-dom'
import { Search, ArrowLeft } from 'lucide-react'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)' }}>
      <div className="glass-card p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Search size={28} className="text-slate-400" />
        </div>
        <h1 className="text-4xl font-bold text-slate-300 font-display mb-2">404</h1>
        <h2 className="text-sm font-semibold text-slate-700 mb-2">页面未找到</h2>
        <p className="text-xs text-slate-400 mb-6">
          您访问的页面不存在或已被移除
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white/60 rounded-lg border border-black/5 interactive"
          >
            <ArrowLeft size={12} /> 返回上页
          </button>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-blue-500 rounded-lg interactive"
          >
            回到首页
          </button>
        </div>
      </div>
    </div>
  )
}
