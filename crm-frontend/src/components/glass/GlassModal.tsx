import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GlassModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}

/**
 * 通过 Portal 渲染到 document.body，避免被具有 backdrop-filter / filter /
 * transform 的祖先（如 glass-card）创建包含块，导致 fixed 遮罩无法铺满全屏、
 * 弹窗底部被页面其他内容遮挡。
 */
export default function GlassModal({ open, onClose, title, children, className }: GlassModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
      window.addEventListener('keydown', handleEsc)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleEsc)
      }
    }
  }, [open, onClose])

  if (!open) return null

  const modal = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={cn('glass-modal p-6 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto', className)}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="nav-icon">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
