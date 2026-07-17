import { cn } from '@/lib/utils'
import { Inbox } from 'lucide-react'

interface EmptyStateProps {
  message?: string
  className?: string
}

export default function EmptyState({ message = '暂无数据', className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-slate-400', className)}>
      <Inbox size={40} className="mb-3 opacity-30" />
      <p className="text-xs">{message}</p>
    </div>
  )
}
