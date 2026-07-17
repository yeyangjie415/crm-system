import { useMemo } from 'react'
import { Users, Clock, MapPin } from 'lucide-react'
import GlassCard from '@/components/glass/GlassCard'
import { useVisits } from '@/hooks/useVisits'
import type { Visit } from '@/types'

export default function VisitSummary({ visits: propVisits }: { visits?: Visit[] }) {
  const { visits: hookVisits } = useVisits()
  const visits = propVisits ?? hookVisits

  const stats = useMemo(() => {
    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)

    const weekVisits = visits.filter(v => new Date(v.date) >= weekStart)
    const totalDuration = weekVisits.reduce((sum, v) => sum + v.duration, 0)
    const uniqueCustomers = new Set(weekVisits.map(v => v.customerId)).size

    return { totalVisits: weekVisits.length, totalDuration, uniqueCustomers }
  }, [visits])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      <GlassCard className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
          <Users size={14} className="text-blue-500" />
        </div>
        <div>
          <p className="text-[9px] text-slate-400">本周拜访客户数</p>
          <p className="text-lg font-mono font-bold text-slate-800">{stats.uniqueCustomers}</p>
        </div>
      </GlassCard>
      <GlassCard className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
          <MapPin size={14} className="text-emerald-500" />
        </div>
        <div>
          <p className="text-[9px] text-slate-400">本周拜访次数</p>
          <p className="text-lg font-mono font-bold text-slate-800">{stats.totalVisits}</p>
        </div>
      </GlassCard>
      <GlassCard className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
          <Clock size={14} className="text-amber-500" />
        </div>
        <div>
          <p className="text-[9px] text-slate-400">本周拜访总时长</p>
          <p className="text-lg font-mono font-bold text-slate-800">{stats.totalDuration}h</p>
        </div>
      </GlassCard>
    </div>
  )
}
