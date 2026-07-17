import { cn } from '@/lib/utils'
import { useReveal } from '@/hooks/useReveal'
import type { ReactNode } from 'react'

interface GlassCardProps {
  children: ReactNode
  className?: string
  reveal?: boolean
  revealDelay?: number
}

export default function GlassCard({ children, className, reveal = false, revealDelay }: GlassCardProps) {
  const { ref, visible } = useReveal<HTMLDivElement>({ delay: revealDelay })

  return (
    <div
      ref={reveal ? ref : undefined}
      className={cn(
        'glass-card p-4',
        reveal && 'reveal',
        reveal && visible && 'reveal-visible',
        className,
      )}
    >
      {children}
    </div>
  )
}
