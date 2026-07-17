interface Props {
  value: number
  max: number
  color?: string
  bgColor?: string
  height?: number
  label?: string
  showPct?: boolean
  sub?: string
}

export default function ProgressBar({
  value, max, color = '#10b981', bgColor = '#f1f5f9',
  height = 8, label, showPct = true, sub,
}: Props) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0

  return (
    <div className="w-full">
      {(label || showPct) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-[10px] text-slate-600 font-medium">{label}</span>}
          {showPct && <span className="text-[10px] font-mono text-slate-500 tabular-nums">{pct}%</span>}
        </div>
      )}
      <div className="w-full rounded-full" style={{ height, background: bgColor }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
        />
      </div>
      {sub && <p className="text-[9px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}
