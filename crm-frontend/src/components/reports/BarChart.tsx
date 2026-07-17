import { useMemo } from 'react'

interface BarItem {
  label: string
  value: number
  color?: string
}

interface Props {
  data: BarItem[]
  height?: number
  formatValue?: (v: number) => string
  barColors?: string[]
}

const DEFAULT_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']

export default function BarChart({ data, height = 180, formatValue, barColors = DEFAULT_COLORS }: Props) {
  const max = useMemo(() => Math.max(...data.map(d => d.value), 1), [data])

  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((item, i) => {
        const pct = (item.value / max) * 100
        const color = item.color || barColors[i % barColors.length]
        return (
          <div key={item.label} className="flex-1 flex flex-col items-center gap-1" style={{ height: '100%' }}>
            <span className="text-[9px] font-mono text-slate-500 tabular-nums">
              {formatValue ? formatValue(item.value) : item.value.toLocaleString()}
            </span>
            <div className="w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t-md transition-all duration-500"
                style={{ height: `${Math.max(pct, 2)}%`, background: `linear-gradient(180deg, ${color}, ${color}88)` }}
              />
            </div>
            <span className="text-[9px] text-slate-500 text-center leading-tight">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}
