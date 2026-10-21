import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LayoutDashboard, Users, ClipboardList, Banknote, Receipt, MapPin, Briefcase, Settings, LogOut, BarChart3 } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: '首页' },
  { path: '/customers', icon: Users, label: '客户管理' },
  { path: '/deals', icon: ClipboardList, label: '项目成交' },
  { path: '/commissions', icon: Banknote, label: '提成发放' },
  { path: '/expenses', icon: Receipt, label: '费用报销' },
  { path: '/visits', icon: MapPin, label: '外勤管理' },
  { path: '/office', icon: Briefcase, label: '协同办公' },
  { path: '/reports', icon: BarChart3, label: '报表中心' },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, isAdmin, isSuperAdmin } = useAuth()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleNav = (path: string) => {
    navigate(path)
  }

  return (
    <aside className="sticky top-0 h-screen glass-sidebar flex flex-col py-4 z-20 shrink-0" style={{ width: '160px' }}>
      <div className="flex items-center gap-2 px-3 mb-5">
        <div
          className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center cursor-pointer interactive shrink-0"
          onClick={() => navigate('/')}
        >
          <span className="text-white text-xs font-bold">C</span>
        </div>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">CRM</span>
      </div>

      {NAV_ITEMS.filter(item => item.path !== '/commissions' || isSuperAdmin).map((item) => (
        <div
          key={item.path}
          className={`flex items-center gap-3 px-3 py-2 mx-2 rounded-lg cursor-pointer text-xs transition-colors ${
            isActive(item.path)
              ? 'bg-blue-50 text-blue-600 font-semibold'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
          onClick={() => handleNav(item.path)}
        >
          <item.icon size={16} className="shrink-0" />
          <span className="truncate">{item.label}</span>
        </div>
      ))}

      <div className="flex-1" />

      {isAdmin && (
        <div
          className={`flex items-center gap-3 px-3 py-2 mx-2 rounded-lg cursor-pointer text-xs transition-colors ${
            location.pathname.startsWith('/settings')
              ? 'bg-blue-50 text-blue-600 font-semibold'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
          onClick={() => navigate('/settings')}
        >
          <Settings size={16} className="shrink-0" />
          <span>权限设置</span>
        </div>
      )}

      <div
        className="flex items-center gap-3 px-3 py-2 mx-2 rounded-lg cursor-pointer text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
        onClick={logout}
      >
        <LogOut size={16} className="shrink-0" />
        <span>退出</span>
      </div>

      <div className="flex items-center gap-2 px-3 mt-2 pt-2 border-t border-black/[0.04] mx-2">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-semibold shrink-0">
          {user?.name?.charAt(0)}
        </div>
        <span className="text-[10px] text-slate-400 truncate">{user?.name}</span>
      </div>
    </aside>
  )
}
