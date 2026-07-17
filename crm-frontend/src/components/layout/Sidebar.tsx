import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { LayoutDashboard, Users, ClipboardList, Banknote, Receipt, MapPin, Briefcase, Settings, LogOut, BarChart3 } from 'lucide-react'

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: '首页' },
  { path: '/customers', icon: Users, label: '客户管理' },
  { path: '/deals', icon: ClipboardList, label: '项目成交' },
  { path: '/commissions', icon: Banknote, label: '提成发放' },
  { path: '/expenses', icon: Receipt, label: '报销发放' },
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
    <aside className="sticky top-0 h-screen w-14 glass-sidebar flex flex-col items-center py-4 gap-1 z-20 shrink-0">
      <div
        className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg mb-5 flex items-center justify-center cursor-pointer interactive"
        onClick={() => navigate('/')}
      >
        <span className="text-white text-xs font-bold">C</span>
      </div>

      {NAV_ITEMS.filter(item => item.path !== '/commissions' || isSuperAdmin).map((item) => (
        <div
          key={item.path}
          className={`nav-icon ${isActive(item.path) ? 'active' : ''}`}
          onClick={() => handleNav(item.path)}
          title={item.label}
        >
          <item.icon size={18} />
        </div>
      ))}

      <div className="flex-1" />

      {isAdmin && (
        <div
          className={`nav-icon ${location.pathname.startsWith('/settings') ? 'active' : ''}`}
          onClick={() => navigate('/settings')}
          title="权限设置"
        >
          <Settings size={18} />
        </div>
      )}

      <div className="nav-icon" onClick={logout} title="退出登录">
        <LogOut size={18} />
      </div>

      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-semibold mt-2 mb-2">
        {user?.name?.charAt(0)}
      </div>
    </aside>
  )
}
