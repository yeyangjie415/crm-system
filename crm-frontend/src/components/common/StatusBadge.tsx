import { cn } from '@/lib/utils'

type StatusType = 'following' | 'won' | 'lost' | 'reporting' | 'vip'

const STATUS_STYLES: Record<StatusType, string> = {
  following: 'status-following',
  won: 'status-won',
  lost: 'status-lost',
  reporting: 'status-reporting',
  vip: 'status-vip',
}

const STATUS_LABELS: Record<StatusType, string> = {
  following: '跟进中',
  won: '成交',
  lost: '丢单',
  reporting: '报备中',
  vip: 'VIP',
}

interface StatusBadgeProps {
  status: StatusType
  label?: string
  className?: string
}

export default function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <span className={cn('status-badge', STATUS_STYLES[status], className)}>
      {label || STATUS_LABELS[status]}
    </span>
  )
}
