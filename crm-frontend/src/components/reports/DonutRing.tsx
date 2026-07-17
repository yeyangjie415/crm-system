interface Segment {
  label: string
  value: number
  color: string
}

interface Props {
  segments: Segment[]
  size?: number
  centerLabel?: string
}

const DEFAULT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

export default function DonutRing({ segments, size = 120, centerLabel }: Props) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  const strokeWidth = size * 0.22
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  let offset = 0

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {segments.map((seg, i) => {
            const pct = seg.value / total
            const dashLen = pct * circumference
            const segOffset = offset
            offset += dashLen
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={-segOffset}
                className="transition-all duration-500"
              />
            )
          })}
        </svg>
        {centerLabel && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-semibold text-slate-700">{centerLabel}</span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: seg.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length] }} />
            <span className="text-[9px] text-slate-500">{seg.label} ({((seg.value / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
