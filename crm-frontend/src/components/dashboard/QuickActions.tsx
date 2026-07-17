import { useState, useMemo, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '@/components/glass/GlassCard'
import { UserPlus, MessageSquare, FileText, Receipt, Search } from 'lucide-react'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import { canViewInList } from '@/lib/permissions'

interface Props {
  onNewCustomer?: () => void
  onNewContract?: () => void
  onNewExpense?: () => void
}

export default function QuickActions({ onNewCustomer, onNewContract, onNewExpense }: Props) {
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const { customers: allCustomers } = useCustomers()
  const [showDropdown, setShowDropdown] = useState(false)
  const [search, setSearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Filter customers by user permission
  const customers = useMemo(() =>
    isAdmin ? allCustomers.filter(c => !c.deleted) : allCustomers.filter(c => !c.deleted && canViewInList(user?.id || '', user?.permissionLevel || 'general', c)),
    [allCustomers, isAdmin, user?.id, user?.permissionLevel])

  // Search filter
  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers.slice(0, 10)
    const q = search.toLowerCase()
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.shortName?.toLowerCase().includes(q)).slice(0, 10)
  }, [customers, search])

  // Click outside to close
  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  const handleSelectCustomer = (customerId: string) => {
    setShowDropdown(false)
    setSearch('')
    navigate(`/customers/${customerId}`)
  }

  return (
    <GlassCard reveal revealDelay={600}>
      <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-3">快捷操作</h3>
      <div className="space-y-2">
        <button onClick={onNewCustomer} className="w-full flex items-center gap-3 p-2.5 rounded-lg interactive border border-transparent hover:border-white/60 bg-white/40 text-left">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-500 bg-blue-50"><UserPlus size={14} /></div>
          <span className="text-xs font-medium text-slate-600">新增客户</span>
        </button>

        {/* 添加跟进 — dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg interactive border border-transparent hover:border-white/60 bg-white/40 text-left"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-emerald-500 bg-emerald-50"><MessageSquare size={14} /></div>
            <span className="text-xs font-medium text-slate-600">添加跟进</span>
          </button>
          {showDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1 glass-card rounded-lg shadow-lg z-50 max-h-64 overflow-hidden border border-white/80">
              <div className="p-2 border-b border-black/5">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="input-glass w-full text-[11px] pl-7 py-1.5"
                    placeholder="搜索客户名称..."
                    autoFocus
                  />
                </div>
              </div>
              <div className="overflow-y-auto max-h-48">
                {filteredCustomers.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-4">无匹配客户</p>
                ) : (
                  filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCustomer(c.id)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors border-b border-black/[0.03] last:border-0"
                    >
                      <span className="font-medium text-slate-700">{c.name}</span>
                      {c.shortName && <span className="text-slate-400 ml-1">({c.shortName})</span>}
                      <span className="float-right text-[10px] text-slate-400">{c.region}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button onClick={onNewContract} className="w-full flex items-center gap-3 p-2.5 rounded-lg interactive border border-transparent hover:border-white/60 bg-white/40 text-left">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-500 bg-purple-50"><FileText size={14} /></div>
          <span className="text-xs font-medium text-slate-600">创建合同</span>
        </button>
        <button onClick={onNewExpense} className="w-full flex items-center gap-3 p-2.5 rounded-lg interactive border border-transparent hover:border-white/60 bg-white/40 text-left">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-amber-500 bg-amber-50"><Receipt size={14} /></div>
          <span className="text-xs font-medium text-slate-600">发起报销</span>
        </button>
      </div>
    </GlassCard>
  )
}
