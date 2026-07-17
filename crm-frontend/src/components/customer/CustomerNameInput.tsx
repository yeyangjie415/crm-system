import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Search, UserPlus, Check } from 'lucide-react'
import type { Customer } from '@/types'
import { useNotifications } from '@/hooks/useNotifications'

interface Props {
  value: string
  onChange: (value: string) => void
  customers: Customer[]
  currentUserId: string
  currentUserName: string
  onExactMatchChange?: (isExactMatch: boolean) => void
}

export default function CustomerNameInput({
  value,
  onChange,
  customers,
  currentUserId,
  currentUserName,
  onExactMatchChange,
}: Props) {
  const { addNotification } = useNotifications()
  const [showDropdown, setShowDropdown] = useState(false)
  const [coFollowRequested, setCoFollowRequested] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fuzzy search results
  const searchResults = useMemo(() => {
    const q = value.trim().toLowerCase()
    if (!q) return []
    const filtered = customers
      .filter(c => c.name.toLowerCase().includes(q))
      .map(c => {
        const idx = c.name.toLowerCase().indexOf(q)
        // rank: startsWith > contains, earlier match > later
        const score = idx === 0 ? 0 : idx
        return { customer: c, score }
      })
      .sort((a, b) => a.score - b.score)
    return filtered.map(f => f.customer)
  }, [value, customers])

  // Exact match detection
  const exactMatch = useMemo(() => {
    const trimmed = value.trim()
    if (!trimmed) return null
    return customers.find(c => c.name.toLowerCase() === trimmed.toLowerCase()) || null
  }, [value, customers])

  // Notify parent of exact match state
  useEffect(() => {
    onExactMatchChange?.(!!exactMatch && !coFollowRequested)
  }, [exactMatch, coFollowRequested, onExactMatchChange])

  // Reset coFollow state when value changes
  useEffect(() => {
    setCoFollowRequested(false)
  }, [value])

  // Click outside → close dropdown
  useEffect(() => {
    if (!showDropdown) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDropdown])

  const handleSelect = useCallback((customerName: string) => {
    onChange(customerName)
    setShowDropdown(false)
    inputRef.current?.focus()
  }, [onChange])

  const handleCoFollow = useCallback(() => {
    if (!exactMatch) return
    addNotification({
      type: 'co_follow_request',
      fromUserId: currentUserId,
      fromUserName: currentUserName,
      toUserId: exactMatch.createdBy,
      customerId: exactMatch.id,
      customerName: exactMatch.name,
    })
    setCoFollowRequested(true)
    toast.success(`已发送共同跟进申请给 ${exactMatch.createdByName}`)
  }, [exactMatch, currentUserId, currentUserName, addNotification])

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          value={value}
          onChange={e => { onChange(e.target.value); setShowDropdown(true) }}
          onFocus={() => { if (value.trim()) setShowDropdown(true) }}
          autoComplete="off"
          className={`input-glass w-full text-xs pr-${exactMatch ? '24' : '3'}`}
          placeholder="输入客户公司全称"
        />

        {/* Creator badge on exact match */}
        {exactMatch && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium whitespace-nowrap pointer-events-none">
            {exactMatch.createdByName}
          </span>
        )}
      </div>

      {/* 申请共同跟进 button */}
      {exactMatch && exactMatch.createdBy !== currentUserId && (
        <div className="mt-1.5">
          {coFollowRequested ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
              <Check size={12} /> 申请已发送
            </span>
          ) : (
            <button
              onClick={handleCoFollow}
              className="inline-flex items-center gap-1 text-[10px] text-blue-500 font-medium hover:text-blue-600 interactive"
            >
              <UserPlus size={12} /> 申请共同跟进
            </button>
          )}
        </div>
      )}

      {/* Search dropdown */}
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 glass-card rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto border border-white/80">
          {searchResults.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelect(c.name)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50/50 transition-colors border-b border-black/[0.02] last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Search size={11} className="text-slate-300 shrink-0" />
                  <span className="text-xs text-slate-700 truncate">{c.name}</span>
                </div>
                <span className="text-[9px] text-slate-400 shrink-0 ml-2">{c.region}</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-0.5 ml-5">创建人：{c.createdByName}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
