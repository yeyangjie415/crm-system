import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { Download, Search, Filter, Plus, X, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import DealTable from '@/components/deal/DealTable'
import ContractForm from '@/components/deal/ContractForm'
import GlassCard from '@/components/glass/GlassCard'
import { useContracts } from '@/hooks/useContracts'
import { useAuth } from '@/hooks/useAuth'
import type { Contract } from '@/types'

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

function fuzzySearch(contract: Contract, query: string): number {
  const fields = [contract.customerName, contract.projectName, contract.attributedToName, contract.contractDate]
  let best = 0
  for (const f of fields) {
    const s = matchScore(f, query)
    if (s > best) best = s
  }
  const matchCount = fields.filter(f => matchScore(f, query) > 0).length
  if (matchCount >= 2) best += 10
  return best
}

function exportCSV(contracts: Contract[]) {
  const BOM = '﻿'
  const headers = ['合同日期', '公司名称', '项目名称', '项目金额', '结算金额', '高开金额', '客户属性', '首次合同', '回款情况', '开票情况', '高开支付情况', '双章合同']
  const rows = contracts.map(c => {
    const totalPaid = c.payments.filter(p => p.completed).reduce((s, p) => s + p.amount, 0)
    const totalAmount = c.payments.reduce((s, p) => s + p.amount, 0)
    return [
      c.contractDate,
      c.customerName,
      c.projectName,
      c.projectAmount,
      c.settlementAmount,
      c.extraAmount,
      c.customerAttribute === 'individual' ? '个人' : '公司',
      c.isFirstContract ? '是' : '否',
      totalPaid >= totalAmount && totalAmount > 0 ? '已收完' : totalPaid > 0 ? '收款中' : '未收款',
      c.invoiceUploaded ? '已开票' : '未开',
      c.extraAmount > 0 ? (c.extraPaid ? '已支付' : '未支付') : '—',
      c.stampContractUploaded ? '已上传' : '未上传',
    ]
  })
  const csv = BOM + [headers, ...rows].map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `合同导出_${new Date().toISOString().slice(0, 10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

export default function DealsPage() {
  const { user, isAdmin } = useAuth()
  const { contracts: allContracts, deleteContract } = useContracts()

  /* ---- Filter contracts by user permission ---- */
  const contracts = useMemo(() =>
    isAdmin ? allContracts : allContracts.filter(c => c.attributedTo === user?.id),
    [allContracts, isAdmin, user?.id])
  const [search, setSearch] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [filterAttribute, setFilterAttribute] = useState('')
  const [filterFirstContract, setFilterFirstContract] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)

  const activeFilterCount = [
    filterAttribute, filterFirstContract,
    dateFrom, dateTo, amountMin, amountMax,
  ].filter(Boolean).length

  const filtered = useMemo(() => {
    let list = contracts

    if (search.trim()) {
      const q = search.trim()
      const scored = list
        .map(c => ({ contract: c, score: fuzzySearch(c, q) }))
        .filter(e => e.score > 0)
        .sort((a, b) => b.score - a.score)
      list = scored.map(e => e.contract)
    }

    return list.filter(c => {
      if (filterAttribute && c.customerAttribute !== filterAttribute) return false
      if (filterFirstContract === 'yes' && !c.isFirstContract) return false
      if (filterFirstContract === 'no' && c.isFirstContract) return false
      if (dateFrom && c.contractDate < dateFrom) return false
      if (dateTo && c.contractDate > dateTo) return false
      if (amountMin && c.settlementAmount < Number(amountMin)) return false
      if (amountMax && c.settlementAmount > Number(amountMax)) return false
      return true
    })
  }, [contracts, search, filterAttribute, filterFirstContract, dateFrom, dateTo, amountMin, amountMax])

  const clearAllFilters = () => {
    setSearch('')
    setFilterAttribute('')
    setFilterFirstContract('')
    setDateFrom('')
    setDateTo('')
    setAmountMin('')
    setAmountMax('')
  }

  const handleExportSelected = useCallback(() => {
    const selectedContracts = filtered.filter(c => selected.includes(c.id))
    if (selectedContracts.length === 0) {
      toast.error('没有选中任何合同')
      return
    }
    exportCSV(selectedContracts)
    toast.success(`已导出 ${selectedContracts.length} 条合同数据`)
  }, [filtered, selected])

  const handleExportAll = useCallback(() => {
    if (filtered.length === 0) {
      toast.error('没有可导出的数据')
      return
    }
    exportCSV(filtered)
    toast.success(`已导出 ${filtered.length} 条合同数据`)
  }, [filtered])

  const handleDeleteSelected = useCallback(() => {
    if (selected.length === 0) return
    selected.forEach(id => deleteContract(id))
    toast.success(`已删除 ${selected.length} 条合同`)
    setSelected([])
  }, [selected, deleteContract])

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 font-display mb-1">项目成交</h1>
          <p className="text-xs text-slate-400">共 {filtered.length} 条合同记录</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg interactive"
        >
          <Plus size={14} /> 添加成交信息
        </button>
      </div>

      {/* Search & Filters */}
      <GlassCard className="mb-3 p-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
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
          <button
            onClick={handleExportAll}
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-medium text-slate-600 bg-white/60 rounded-lg border border-black/5 interactive"
          >
            <Download size={12} /> 导出全部
          </button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="mt-3 pt-3 border-t border-black/5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">合同日期从</label>
                <input type="date" className="input-glass w-full text-[11px] py-1.5" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">合同日期至</label>
                <input type="date" className="input-glass w-full text-[11px] py-1.5" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">结算金额 ≥</label>
                <input type="number" className="input-glass w-full text-[11px] py-1.5" placeholder="最低金额" value={amountMin} onChange={e => setAmountMin(e.target.value)} />
              </div>
              <div>
                <label className="text-[9px] font-semibold text-slate-500 uppercase block mb-1">结算金额 ≤</label>
                <input type="number" className="input-glass w-full text-[11px] py-1.5" placeholder="最高金额" value={amountMax} onChange={e => setAmountMax(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={clearAllFilters} className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1">
                <X size={12} /> 清除全部筛选
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Active Filters Badge */}
      {activeFilterCount > 0 && !showAdvanced && (
        <div className="flex items-center gap-2 mb-3">
          <Filter size={12} className="text-blue-500" />
          <span className="text-[10px] text-blue-500 font-medium">{activeFilterCount} 项筛选已激活</span>
          <button onClick={clearAllFilters} className="text-[10px] text-slate-400 hover:text-slate-600">清除</button>
        </div>
      )}

      {/* Batch actions */}
      {selected.length > 0 && (
        <div className="glass-card p-3 my-3 flex items-center gap-3">
          <span className="text-xs text-slate-600 font-medium">已选 {selected.length} 项</span>
          <div className="flex gap-2">
            <button
              onClick={handleExportSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-slate-600 bg-white/60 rounded-lg border border-black/5 interactive"
            >
              <Download size={12} /> 导出勾选项
            </button>
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-red-500 bg-red-50/60 rounded-lg border border-red-200 interactive"
            >
              <Trash2 size={12} /> 删除勾选项
            </button>
          </div>
          <button onClick={() => setSelected([])} className="ml-auto text-[10px] text-slate-400 hover:text-slate-600">
            取消选择
          </button>
        </div>
      )}

      <DealTable contracts={filtered} selected={selected} onSelect={setSelected} />

      <ContractForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
