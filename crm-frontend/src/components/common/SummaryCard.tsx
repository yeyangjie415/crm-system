import { type LucideIcon } from 'lucide-react'
import GlassCard from '@/components/glass/GlassCard'

export interface SummaryCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  iconColor?: string
  iconBg?: string
  className?: string
}

export default function SummaryCard({ icon: Icon, label, value, iconColor = 'text-blue-500', iconBg = 'bg-blue-50', className = '' }: SummaryCardProps) {
  return (
    <GlassCard className={`flex items-center gap-3 p-3 ${className}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon size={14} className={iconColor} />
      </div>
      <div>
        <p className="text-[9px] text-slate-400">{label}</p>
        <p className="text-lg font-mono font-bold text-slate-800">{value}</p>
      </div>
    </GlassCard>
  )
}
