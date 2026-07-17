import GlassCard from '@/components/glass/GlassCard'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  sub?: string
  subColor?: 'green' | 'red' | 'muted'
  icon?: string
  delay?: number
}

export default function StatsCard({ title, value, sub, subColor = 'muted', delay = 0 }: StatsCardProps) {
  const subColorClass = subColor === 'green' ? 'text-emerald-500' : subColor === 'red' ? 'text-red-500' : 'text-slate-400'

  return (
    <GlassCard reveal revealDelay={delay}>
      <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{title}</div>
      <div className="text-2xl font-bold text-slate-800 font-display tabular-nums">{value}</div>
      {sub && <div className={cn('text-[10px] mt-1', subColorClass)}>{sub}</div>}
    </GlassCard>
  )
}
