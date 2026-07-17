import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import type { FollowStatus, CustomerType, CustomerPositioning } from '@/types'
import { FOLLOW_STATUS_LABELS, CUSTOMER_TYPE_LABELS, CUSTOMER_POSITIONING_LABELS } from '@/types'

interface CustomerSearchProps {
  onSearch: (query: string) => void
  onFilter: (filters: FilterState) => void
}

export interface FilterState {
  followStatus?: FollowStatus
  customerType?: CustomerType
  positioning?: CustomerPositioning
  region?: string
}

export default function CustomerSearch({ onSearch, onFilter }: CustomerSearchProps) {
  const [query, setQuery] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filters, setFilters] = useState<FilterState>({})

  const handleQueryChange = (val: string) => {
    setQuery(val)
    onSearch(val)
  }

  const handleFilterChange = (key: keyof FilterState, value: string | undefined) => {
    const newFilters = { ...filters, [key]: value || undefined }
    if (!value) delete newFilters[key]
    setFilters(newFilters)
    onFilter(newFilters)
  }

  const clearFilters = () => {
    setFilters({})
    onFilter({})
  }

  const hasFilters = Object.keys(filters).length > 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="input-glass pl-8 pr-3 py-2 w-full"
            placeholder="搜索客户名称、简称、项目名称..."
          />
          {query && (
            <button onClick={() => handleQueryChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`interactive px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-1.5 border ${showAdvanced || hasFilters ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-black/5 bg-white/50 text-slate-500'}`}
        >
          <Filter size={13} />
          高级筛选
          {hasFilters && <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center">{Object.keys(filters).length}</span>}
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="text-[10px] text-slate-400 hover:text-slate-600">
            清除筛选
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="glass-card p-3 flex flex-wrap gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <select
            value={filters.followStatus || ''}
            onChange={(e) => handleFilterChange('followStatus', e.target.value || undefined)}
            className="input-glass text-xs py-1.5"
          >
            <option value="">全部状态</option>
            {Object.entries(FOLLOW_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filters.customerType || ''}
            onChange={(e) => handleFilterChange('customerType', e.target.value || undefined)}
            className="input-glass text-xs py-1.5"
          >
            <option value="">全部类型</option>
            {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={filters.positioning || ''}
            onChange={(e) => handleFilterChange('positioning', e.target.value || undefined)}
            className="input-glass text-xs py-1.5"
          >
            <option value="">全部定位</option>
            {Object.entries(CUSTOMER_POSITIONING_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input
            value={filters.region || ''}
            onChange={(e) => handleFilterChange('region', e.target.value || undefined)}
            className="input-glass text-xs py-1.5"
            placeholder="城市筛选..."
          />
        </div>
      )}
    </div>
  )
}
