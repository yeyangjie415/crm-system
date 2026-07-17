import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  title?: string
  action?: ReactNode
}

export default function GlassPanel({ children, className, title, action }: GlassPanelProps) {
  return (
    <div className={cn('glass-card p-4', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}
