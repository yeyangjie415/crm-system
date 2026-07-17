import { useState, useMemo } from 'react'
import { Search, Filter, X, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react'
import { useContracts } from '@/hooks/useContracts'
import type { Contract } from '@/types'

interface Props {
  onSelectionChange: (selected: Contract[]) => void
  disbursedContractIds: string[]
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Derive the effective sign date: most recent archived contract file upload time, or contractDate */
function getSignDate(c: Contract): string {
  const contractFiles = c.archivedFiles
    .filter(f => f.category === 'contract')
    .sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''))
  if (contractFiles.length > 0 && contractFiles[0].uploadedAt) {
    return contractFiles[0].uploadedAt.slice(0, 10)
  }
  return c.contractDate
}

/** Last completed payment date */
function getLastPaymentDate(c: Contract): string {
  const completed = c.payments
    .filter(p => p.completed && p.paymentDate)
    .sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''))
  return completed.length > 0 ? completed[0].paymentDate! : '—'
}

function allPaymentsDone(c: Contract): boolean {
  const total = c.payments.reduce((s, p) => s + p.amount, 0)
  const paid = c.payments.filter(p => p.completed).reduce((s, p) => s + p.amount, 0)
  return paid >= total && total > 0
}

/* ------------------------------------------------------------------ */
/*  Fuzzy search helpers                                               */
/* ------------------------------------------------------------------ */

function matchScore(text: string, query: string): number {
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  if (t === q) return 100
  if (t.startsWith(q)) return 80
  if (t.includes(q)) return 50
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  if (qi === q.length) return 20
  return 0
}

function fuzzySearch(contract: Contract, signDate: string, query: string): number {
  const fields = [contract.customerName, contract.projectName, contract.attributedToName, signDate]
  let best = 0
  for (const f of fields) {
    const s = matchScore(f, query)
    if (s > best) best = s
  }
  const matchCount = fields.filter(f => matchScore(f, query) > 0).length
  if (matchCount >= 2) best += 10
  return best
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CommissionTable({ onSelectionChange, disbursedContractIds }: Props) {
  const { contracts } = useContracts()
  const [selected, setSelected] = useState<string[]>([])
  const [sortAsc, setSortAsc] = useState(false)

  /* ---- search & filter state ---- */
  const [search, setSearch] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filterAttribute, setFilterAttribute] = useState('')
  const [filterFirstContract, setFilterFirstContract] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const activeFilterCount = [
    filterAttribute, filterFirstContract, filterPayment,
    dateFrom, dateTo,
  ].filter(Boolean).length

  /* ---- pre-compute sign dates for all contracts ---- */
  const signDateMap = useMemo(() => {
    const map = new Map<string, string>()
    contracts.forEach(c => map.set(c.id, getSignDate(c)))
    return map
  }, [contracts])

  /* ---- filtered + sorted list ---- */
  const filtered = useMemo(() => {
    let list = contracts.filter(c => !c.cancelled)

    // fuzzy search
    if (search.trim()) {
      const q = search.trim()
      const scored = list
        .map(c => ({ contract: c, score: fuzzySearch(c, signDateMap.get(c.id) || c.contractDate, q) }))
        .filter(e => e.score > 0)
        .sort((a, b) => b.score - a.score)
      list = scored.map(e => e.contract)
    }

    // advanced filters
    list = list.filter(c => {
      if (filterAttribute && c.customerAttribute !== filterAttribute) return false
      if (filterFirstContract === 'yes' && !c.isFirstContract) return false
      if (filterFirstContract === 'no' && c.isFirstContract) return false
      if (filterPayment === 'paid' && !allPaymentsDone(c)) return false
      if (filterPayment === 'unpaid' && allPaymentsDone(c)) return false
      const sd = signDateMap.get(c.id) || c.contractDate
      if (dateFrom && sd < dateFrom) return false
      if (dateTo && sd > dateTo) return false
      return true
    })

    // sort by sign date
    list = [...list].sort((a, b) => {
      const da = signDateMap.get(a.id) || a.contractDate
      const db = signDateMap.get(b.id) || b.contractDate
      return sortAsc ? da.localeCompare(db) : db.localeCompare(da)
    })

    return list
  }, [contracts, search, filterAttribute, filterFirstContract, filterPayment, dateFrom, dateTo, sortAsc, signDateMap])

  const clearAllFilters = () => {
    setSearch('')
    setFilterAttribute('')
    setFilterFirstContract('')
    setFilterPayment('')
    setDateFrom('')
    setDateTo('')
  }

  /* ---- selection ---- */
  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
      onSelectionChange(filtered.filter(c => next.includes(c.id)))
      return next
    })
  }

  const toggleAll = () => {
    if (selected.length === filtered.length && filtered.length > 0) {
      setSelected([])
      onSelectionChange([])
    } else {
      const ids = filtered.map(c => c.id)
      setSelected(ids)
      onSelectionChange([...filtered])
    }
  }

  const toggleSort = () => setSortAsc(prev => !prev)

  /* ---- render ---- */
  return (
    <div>
      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input-glass pl-8 pr-8 py-2 text-xs w-full"
            placeholder="搜索客户名称、项目名称、归属人…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X size={12} />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1 px-3 py-2 text-[10px] font-medium rounded-lg border interactive ${
            showAdvanced || activeFilterCount > 0
              ? 'text-blue-500 bg-blue-50/50 border-blue-200'
              : 'text-slate-500 bg-white/60 border-black/5'
          }`}
        >
          <Filter size={12} />
          高级筛选
          {activeFilterCount > 0 && (
            <span className="ml-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          {showAdvanced ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <span className="text-[10px] text-slate-400">
          {selected.length > 0 ? `已选 ${selected.length} / ${filtered.length} 条` : `共 ${filtered.length} 条`}
        </span>
      </div>

      {/* Active Filters Badge */}
      {activeFilterCount > 0 && !showAdvanced && (
        <div className="flex items-center gap-2 mb-3">
          <Filter size={12} className="text-blue-500" />
          <span className="text-[10px] text-blue-500 font-medium">{activeFilterCount} 项筛选已激活</span>
          <button onClick={clearAllFilters} className="text-[10px] text-slate-400 hover:text-slate-600">清除</button>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="mb-3 p-3 rounded-lg border border-black/5 bg-white/40 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">客户属性</label>
              <select className="input-glass w-full text-[11px] py-1.5" value={filterAttribute} onChange={e => setFilterAttribute(e.target.value)}>
                <option value="">全部</option>
                <option value="company">公司</option>
                <option value="individual">个人</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">首次合同</label>
              <select className="input-glass w-full text-[11px] py-1.5" value={filterFirstContract} onChange={e => setFilterFirstContract(e.target.value)}>
                <option value="">全部</option>
                <option value="yes">是</option>
                <option value="no">否</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">回款状态</label>
              <select className="input-glass w-full text-[11px] py-1.5" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
                <option value="">全部</option>
                <option value="paid">已收完</option>
                <option value="unpaid">未收完</option>
              </select>
            </div>
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">签订日期从</label>
              <input type="date" className="input-glass w-full text-[11px] py-1.5" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">签订日期至</label>
              <input type="date" className="input-glass w-full text-[11px] py-1.5" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={clearAllFilters} className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1">
              <X size={12} /> 清除全部筛选
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-black/5 sticky top-0 z-5 bg-white/80">
              <th className="text-left py-2 px-2 w-8">
                <input type="checkbox" className="w-3.5 h-3.5 rounded" onChange={toggleAll} checked={selected.length === filtered.length && filtered.length > 0} />
              </th>
              <th
                className="text-left py-2 px-2 cursor-pointer select-none hover:text-blue-500 transition-colors"
                onClick={toggleSort}
              >
                <span className="inline-flex items-center gap-1">
                  签订时间
                  <ArrowUpDown size={10} className={sortAsc ? 'text-blue-500' : ''} />
                </span>
              </th>
              <th className="text-left py-2 px-2">客户名称</th>
              <th className="text-left py-2 px-2 hidden sm:table-cell">项目名称</th>
              <th className="text-left py-2 px-2">合同归属人</th>
              <th className="text-right py-2 px-2">结算金额</th>
              <th className="text-center py-2 px-2 hidden sm:table-cell">客户属性</th>
              <th className="text-center py-2 px-2 hidden sm:table-cell">首次合同</th>
              <th className="text-center py-2 px-2">完成回款</th>
              <th className="text-center py-2 px-2 hidden sm:table-cell">回款时间</th>
              <th className="text-center py-2 px-2">计提状态</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-xs text-slate-400">
                  {search || activeFilterCount > 0 ? '没有匹配的合同' : '暂无合同数据'}
                </td>
              </tr>
            ) : (
              filtered.map(c => {
                const paid = allPaymentsDone(c)
                const signDate = signDateMap.get(c.id) || c.contractDate
                const lastPayDate = getLastPaymentDate(c)
                const disbursed = disbursedContractIds.includes(c.id)

                return (
                  <tr key={c.id} className="table-row border-b border-black/[0.02] text-xs hover:bg-blue-50/30 transition-colors">
                    <td className="py-2 px-2">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-blue-500 cursor-pointer"
                        checked={selected.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                      />
                    </td>
                    <td className="py-2 px-2 text-slate-500 whitespace-nowrap">{signDate}</td>
                    <td className="py-2 px-2 font-medium text-slate-700">{c.customerName}</td>
                    <td className="py-2 px-2 text-slate-600 hidden sm:table-cell">{c.projectName}</td>
                    <td className="py-2 px-2 text-slate-600">{c.attributedToName}</td>
                    <td className="py-2 px-2 text-right font-mono text-xs font-medium tabular-nums">
                      ¥{c.settlementAmount.toLocaleString()}
                    </td>
                    <td className="py-2 px-2 text-center hidden sm:table-cell">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        c.customerAttribute === 'individual' ? 'text-purple-500 bg-purple-50' : 'text-blue-500 bg-blue-50'
                      }`}>
                        {c.customerAttribute === 'individual' ? '个人' : '公司'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center hidden sm:table-cell">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        c.isFirstContract ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 bg-slate-50'
                      }`}>
                        {c.isFirstContract ? '是' : '否'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        paid ? 'text-emerald-500 bg-emerald-50' : 'text-red-400 bg-red-50'
                      }`}>
                        {paid ? '是' : '否'}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center text-slate-500 hidden sm:table-cell whitespace-nowrap">
                      {lastPayDate}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                        disbursed ? 'text-emerald-500 bg-emerald-50' : 'text-amber-500 bg-amber-50'
                      }`}>
                        {disbursed ? '是' : '否'}
                      </span>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
