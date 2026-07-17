import { useState, useRef, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCustomers } from '@/hooks/useCustomers'
import { canViewDetail } from '@/lib/permissions'
import { Search, ChevronDown, User, LogOut, FileText, Building2, FileCheck, Lock, X } from 'lucide-react'
import ProfileModal from '@/components/user/ProfileModal'
import NotificationBell from '@/components/layout/NotificationBell'

const BREADCRUMB_MAP: Record<string, string> = {
  '/': '仪表盘',
  '/customers': '客户管理',
  '/settings': '权限设置',
  '/settings/audit-log': '操作日志',
}

/* ------------------------------------------------------------------ */
/*  Fuzzy search helpers                                               */
/* ------------------------------------------------------------------ */

function matchScore(text: string, query: string): number {
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  if (t === q) return 100
  if (t.startsWith(q)) return 80
  if (t.includes(q)) return 50
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  if (qi === q.length) return 20
  return 0
}

interface SearchResult {
  type: 'customer' | 'project'
  id: string
  name: string
  sub: string
  createdBy: string
  createdByName: string
  score: number
  /** For project results, the parent customer id */
  customerId: string
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, isSuperAdmin } = useAuth()
  const { customers } = useCustomers()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  /* ---- search state ---- */
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ---- fuzzy search results ---- */
  const searchResults = useMemo((): SearchResult[] => {
    if (!searchQuery.trim() || !user) return []
    const q = searchQuery.trim()

    const raw: SearchResult[] = []

    for (const c of customers) {
      if (c.deleted) continue
      const nameScore = matchScore(c.name, q)
      const shortScore = c.shortName ? matchScore(c.shortName, q) : 0
      const bestCustomer = Math.max(nameScore, shortScore)
      if (bestCustomer > 0) {
        raw.push({
          type: 'customer',
          id: c.id,
          name: c.name,
          sub: c.region || '',
          createdBy: c.createdBy,
          createdByName: c.createdByName,
          score: bestCustomer,
          customerId: c.id,
        })
      }

      // Also search projects
      for (const p of c.projects || []) {
        const pScore = matchScore(p.name, q)
        if (pScore > 0) {
          raw.push({
            type: 'project',
            id: p.id,
            name: p.name,
            sub: `客户：${c.name}`,
            createdBy: p.createdBy || c.createdBy,
            createdByName: c.createdByName,
            score: pScore,
            customerId: c.id,
          })
        }
      }
    }

    // Sort by score descending
    raw.sort((a, b) => b.score - a.score)
    return raw.slice(0, 15)
  }, [searchQuery, customers, user])

  const currentLabel = BREADCRUMB_MAP[location.pathname]
    || (location.pathname.startsWith('/customers/') ? '客户详情' : '')
    || (location.pathname.startsWith('/settings/audit-log/') ? '操作日志详情' : '')

  const handleLogout = () => {
    setShowDropdown(false)
    logout()
    navigate('/login')
  }

  const handleProfile = () => {
    setShowDropdown(false)
    setShowProfile(true)
  }

  const handleSearchSelect = (result: SearchResult) => {
    if (!user) return
    // Find customer for permission check
    const customer = customers.find(c => c.id === result.customerId)
    if (!customer) return
    if (!canViewDetail(user.id, user.permissionLevel, customer)) return

    setSearchQuery('')
    setShowResults(false)
    if (result.type === 'customer') {
      navigate(`/customers/${result.id}`)
    } else {
      // Navigate to customer detail; the project is within that page
      navigate(`/customers/${result.customerId}`)
    }
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowResults(false)
      searchInputRef.current?.blur()
    }
  }

  return (
    <>
      <header className="sticky top-0 h-12 glass-topbar flex items-center px-5 gap-4 z-20 shrink-0">
        <nav className="flex items-center gap-1 text-xs text-slate-400">
          <span>首页</span>
          {currentLabel && (
            <>
              <span>/</span>
              <span className="text-blue-500 font-semibold">{currentLabel}</span>
            </>
          )}
        </nav>

        <div className="flex-1" />

        {/* ---- Search with dropdown ---- */}
        <div className="relative hidden sm:block" ref={searchRef}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
          <input
            ref={searchInputRef}
            className="input-glass pl-8 pr-8 py-1.5 w-48 text-xs focus:w-64 transition-all duration-200"
            placeholder="搜索客户、项目…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowResults(true) }}
            onFocus={() => { if (searchQuery.trim()) setShowResults(true) }}
            onKeyDown={handleSearchKeyDown}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setShowResults(false) }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 z-10"
            >
              <X size={12} />
            </button>
          )}

          {/* Results dropdown */}
          {showResults && searchQuery.trim() && (
            <div className="absolute right-0 top-full mt-1 w-80 max-h-72 overflow-y-auto glass-card rounded-lg shadow-lg py-1 z-50 border border-white/80">
              {searchResults.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <Search size={20} className="text-slate-300 mx-auto mb-1" />
                  <p className="text-[10px] text-slate-400">没有匹配的客户或项目</p>
                </div>
              ) : (
                searchResults.map((result, i) => {
                  if (!user) return null
                  const customer = customers.find(c => c.id === result.customerId)
                  const hasAccess = customer ? canViewDetail(user.id, user.permissionLevel, customer) : false
                  return (
                    <button
                      key={`${result.type}-${result.id}-${i}`}
                      onClick={() => handleSearchSelect(result)}
                      disabled={!hasAccess}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                        hasAccess
                          ? 'hover:bg-blue-50/50 cursor-pointer'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {result.type === 'customer' ? (
                          <Building2 size={14} className={hasAccess ? 'text-blue-400' : 'text-slate-300'} />
                        ) : (
                          <FileCheck size={14} className={hasAccess ? 'text-emerald-400' : 'text-slate-300'} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-medium truncate ${hasAccess ? 'text-slate-700' : 'text-slate-400'}`}>
                            {result.name}
                          </span>
                          <span className="text-[8px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 shrink-0">
                            {result.type === 'customer' ? '客户' : '项目'}
                          </span>
                          {!hasAccess && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-red-50 text-red-400 shrink-0 flex items-center gap-0.5">
                              <Lock size={7} /> 无权限
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-slate-400 truncate mt-0.5">{result.sub}</p>
                        {hasAccess && (
                          <p className="text-[8px] text-slate-400 mt-0.5">
                            创建人：{result.createdByName}
                          </p>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}
        </div>

        <NotificationBell />

        <div className="relative" ref={dropdownRef}>
          <div
            className="flex items-center gap-2 interactive px-2 py-1 rounded-lg cursor-pointer select-none"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-[8px] font-semibold">
              {user?.name?.charAt(0)}
            </div>
            <span className="text-xs text-slate-600 hidden sm:inline">{user?.name}</span>
            <ChevronDown size={12} className={`text-slate-400 hidden sm:block transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </div>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-36 glass-card rounded-lg shadow-lg py-1 z-50 border border-white/80">
              {isSuperAdmin && (
                <button
                  onClick={() => { setShowDropdown(false); navigate('/settings/audit-log') }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-blue-50/50 transition-colors"
                >
                  <FileText size={13} className="text-slate-400" />
                  操作日志
                </button>
              )}
              <button
                onClick={handleProfile}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:bg-blue-50/50 transition-colors"
              >
                <User size={13} className="text-slate-400" />
                个人信息
              </button>
              <div className="border-t border-black/5 my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50/50 transition-colors"
              >
                <LogOut size={13} />
                退出登录
              </button>
            </div>
          )}
        </div>
      </header>

      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} />
    </>
  )
}
