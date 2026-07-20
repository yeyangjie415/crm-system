import { useMemo } from 'react'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import { canViewInList } from '@/lib/permissions'

export default function Marquee() {
  const { customers: allCustomers } = useCustomers()
  const { user } = useAuth()

  // No logged-in user (login page) → show all; otherwise filter by permission
  const names = useMemo(() => {
    const filtered = !user
      ? allCustomers.filter(c => !c.deleted)
      : allCustomers.filter(c => !c.deleted && canViewInList(user?.id || '', user?.permissionLevel || 'general', c))
    return filtered.map(c => c.name)
  }, [allCustomers, user])

  if (names.length === 0) return null

  return (
    <div className="shrink-0 glass-topbar border-t border-white/30 py-2 overflow-hidden">
      <div className="flex whitespace-nowrap animate-marquee hover:[animation-play-state:paused]">
        {[...names, ...names].map((name, i) => (
          <span
            key={i}
            className="text-[10px] text-slate-400 font-medium tracking-wide inline-block"
            style={{ paddingRight: '3rem' }}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}
