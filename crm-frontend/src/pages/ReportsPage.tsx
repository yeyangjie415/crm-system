import { useState, useMemo } from 'react'
import { BarChart3, TrendingUp, FileText, Users, AlertTriangle } from 'lucide-react'
import GlassCard from '@/components/glass/GlassCard'
import BarChart from '@/components/reports/BarChart'
import ProgressBar from '@/components/reports/ProgressBar'
import DonutRing from '@/components/reports/DonutRing'
import { useContracts } from '@/hooks/useContracts'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import { canViewInList } from '@/lib/permissions'

const TABS = [
  { key: 'performance', label: '业绩总览', icon: BarChart3 },
  { key: 'collections', label: '回款分析', icon: TrendingUp },
  { key: 'pipeline',   label: '合同流水', icon: FileText },
  { key: 'customers',  label: '客户分析', icon: Users },
] as const

type TabKey = typeof TABS[number]['key']

/* ------------------------------------------------------------------ */

function formatWan(n: number) {
  if (n >= 10000) return `¥${(n / 10000).toFixed(1)}万`
  return `¥${n.toLocaleString()}`
}

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4']

/* ================================================================== */

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('performance')
  const [period, setPeriod] = useState<'year' | 'quarter' | 'month'>('year')
  const { user, isAdmin } = useAuth()
  const { contracts: allContracts } = useContracts()
  const { customers: allCustomers } = useCustomers()

  /* ---- Filter data by user permission ---- */
  const contracts = useMemo(() =>
    isAdmin ? allContracts : allContracts.filter(c => c.attributedTo === user?.id),
    [allContracts, isAdmin, user?.id])

  const customers = useMemo(() =>
    isAdmin ? allCustomers : allCustomers.filter(c => !c.deleted && canViewInList(user?.id || '', user?.permissionLevel || 'general', c)),
    [allCustomers, isAdmin, user?.id, user?.permissionLevel])

  /* ── Performance Tab ── */

  const perfBySalesperson = useMemo(() => {
    const map = new Map<string, { name: string; contracts: number; won: number; collected: number; total: number }>()
    for (const c of contracts) {
      const entry = map.get(c.attributedTo) || { name: c.attributedToName, contracts: 0, won: 0, collected: 0, total: 0 }
      entry.contracts++
      entry.won += c.settlementAmount
      for (const p of c.payments) {
        entry.total += p.amount
        if (p.completed) entry.collected += p.amount
      }
      map.set(c.attributedTo, entry)
    }
    return [...map.values()].sort((a, b) => b.won - a.won)
  }, [contracts])

  const perfSummary = useMemo(() => {
    const won = perfBySalesperson.reduce((s, e) => s + e.won, 0)
    const collected = perfBySalesperson.reduce((s, e) => s + e.collected, 0)
    const total = perfBySalesperson.reduce((s, e) => s + e.total, 0)
    return { won, collected, total, rate: total > 0 ? Math.round((collected / total) * 100) : 0 }
  }, [perfBySalesperson])

  /* ── Collections Tab ── */

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const collectionData = useMemo(() => contracts.map(c => {
    const total = c.payments.reduce((s, p) => s + p.amount, 0)
    const collected = c.payments.filter(p => p.completed).reduce((s, p) => s + p.amount, 0)
    const overdue = c.payments.filter(p => !p.completed && p.paymentDate && p.paymentDate < today)
    return { ...c, totalReceivable: total, collected, outstanding: total - collected, overdue }
  }), [contracts, today])

  const collectionsSummary = useMemo(() => {
    const outstanding = collectionData.reduce((s, c) => s + c.outstanding, 0)
    const overdue = collectionData.reduce((s, c) => s + c.overdue.reduce((a, p) => a + p.amount, 0), 0)
    return { outstanding, overdue }
  }, [collectionData])

  /* ── Customers Tab ── */

  const customerAnalysis = useMemo(() => {
    const byAttr = { company: { count: 0, amount: 0 }, individual: { count: 0, amount: 0 } }
    const byPos: Record<string, { count: number; amount: number }> = {}
    const byProv: Record<string, { count: number; amount: number }> = {}

    for (const cust of customers.filter(c => !c.deleted)) {
      const attr = cust.customerAttribute || 'company'
      byAttr[attr].count++
      const won = contracts.filter(c => c.customerId === cust.id).reduce((s, c) => s + c.settlementAmount, 0)
      byAttr[attr].amount += won

      if (!byPos[cust.positioning]) byPos[cust.positioning] = { count: 0, amount: 0 }
      byPos[cust.positioning].count++
      byPos[cust.positioning].amount += won

      const prov = cust.provinceName || cust.region || '未知'
      if (!byProv[prov]) byProv[prov] = { count: 0, amount: 0 }
      byProv[prov].count++
      byProv[prov].amount += won
    }
    return { byAttr, byPos, byProv }
  }, [customers, contracts])

  /* ================================================================== */

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 font-display mb-1">报表中心</h1>
          <p className="text-xs text-slate-400">销售业绩、回款进度、客户分析</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-4 bg-white/60 rounded-lg p-1 border border-black/5 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === tab.key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={13} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════ Performance ═══════════ */}
      {activeTab === 'performance' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: '成交总额', value: `¥${perfSummary.won.toLocaleString()}`, sub: `${contracts.length} 个合同`, color: 'text-blue-500' },
              { label: '已回款', value: `¥${perfSummary.collected.toLocaleString()}`, sub: '', color: 'text-emerald-500' },
              { label: '待回款', value: `¥${(perfSummary.total - perfSummary.collected).toLocaleString()}`, sub: '', color: 'text-amber-500' },
              { label: '回款率', value: `${perfSummary.rate}%`, sub: '', color: 'text-violet-500' },
            ].map(card => (
              <GlassCard key={card.label} className="text-center py-3">
                <p className="text-[10px] text-slate-400 mb-1">{card.label}</p>
                <p className={`text-base font-bold font-display ${card.color}`}>{card.value}</p>
                {card.sub && <p className="text-[9px] text-slate-400 mt-0.5">{card.sub}</p>}
              </GlassCard>
            ))}
          </div>

          {/* Bar chart: by salesperson */}
          <GlassCard>
            <h3 className="text-xs font-semibold text-slate-700 mb-4">按销售员 — 成交金额对比</h3>
            <BarChart
              data={perfBySalesperson.map(e => ({ label: e.name, value: e.won }))}
              height={160}
              formatValue={formatWan}
            />
          </GlassCard>

          {/* Collection rate by person */}
          <GlassCard>
            <h3 className="text-xs font-semibold text-slate-700 mb-3">按销售员 — 回款率</h3>
            <div className="space-y-3">
              {perfBySalesperson.map(e => (
                <ProgressBar
                  key={e.name}
                  label={e.name}
                  value={e.collected}
                  max={e.total}
                  color="#3b82f6"
                  sub={`已收 ¥${e.collected.toLocaleString()} / 应收 ¥${e.total.toLocaleString()} · ${e.contracts} 个合同`}
                />
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ═══════════ Collections ═══════════ */}
      {activeTab === 'collections' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <GlassCard className="text-center py-3">
              <p className="text-[10px] text-slate-400 mb-1">待回款总额</p>
              <p className="text-base font-bold text-amber-500">{formatWan(collectionsSummary.outstanding)}</p>
            </GlassCard>
            <GlassCard className="text-center py-3">
              <p className="text-[10px] text-slate-400 mb-1">逾期金额</p>
              <p className="text-base font-bold text-red-500">{formatWan(collectionsSummary.overdue)}</p>
            </GlassCard>
            <GlassCard className="text-center py-3">
              <p className="text-[10px] text-slate-400 mb-1">合同总数</p>
              <p className="text-base font-bold text-slate-700">{collectionData.length}</p>
            </GlassCard>
          </div>

          <GlassCard>
            <h3 className="text-xs font-semibold text-slate-700 mb-3">各合同回款进度</h3>
            <div className="space-y-3">
              {collectionData.map(c => {
                const rate = c.totalReceivable > 0 ? Math.round((c.collected / c.totalReceivable) * 100) : 0
                return (
                  <div key={c.id} className="p-2.5 rounded-lg bg-white/50 border border-black/3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-medium text-slate-700">{c.customerName} — {c.projectName}</span>
                      {c.overdue.length > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-red-500 font-medium">
                          <AlertTriangle size={10} /> {c.overdue.length} 期逾期
                        </span>
                      )}
                    </div>
                    <ProgressBar
                      value={c.collected}
                      max={c.totalReceivable}
                      color={rate >= 100 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#ef4444'}
                      sub={`已收 ¥${c.collected.toLocaleString()} / 应收 ¥${c.totalReceivable.toLocaleString()} · ${c.payments.filter(p => p.completed).length}/${c.payments.length} 期完成`}
                    />
                  </div>
                )
              })}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ═══════════ Pipeline ═══════════ */}
      {activeTab === 'pipeline' && (
        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] font-semibold text-slate-500 uppercase border-b border-black/5">
                  <th className="text-left py-2 px-2">客户</th>
                  <th className="text-left py-2 px-2">项目</th>
                  <th className="text-right py-2 px-2">结算金额</th>
                  <th className="text-right py-2 px-2">高开</th>
                  <th className="text-center py-2 px-2">回款</th>
                  <th className="text-center py-2 px-2">开票</th>
                  <th className="text-center py-2 px-2">状态</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => {
                  const collected = c.payments.filter(p => p.completed).reduce((s, p) => s + p.amount, 0)
                  const total = c.payments.reduce((s, p) => s + p.amount, 0)
                  const rate = total > 0 ? Math.round((collected / total) * 100) : 0
                  return (
                    <tr key={c.id} className="border-b border-black/[0.02]">
                      <td className="py-2 px-2 font-medium text-slate-700">{c.customerName}</td>
                      <td className="py-2 px-2 text-slate-600">{c.projectName}</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">{formatWan(c.settlementAmount)}</td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums">{c.extraAmount > 0 ? formatWan(c.extraAmount) : '—'}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                          rate >= 100 ? 'text-emerald-500 bg-emerald-50' : rate > 0 ? 'text-amber-500 bg-amber-50' : 'text-slate-400 bg-slate-100'
                        }`}>{rate}%</span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-[9px] ${c.invoiceUploaded ? 'text-emerald-500' : 'text-slate-400'}`}>
                          {c.invoiceUploaded ? '已开' : '未开'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                          c.cancelled ? 'text-red-500 bg-red-50' :
                          c.submitted ? 'text-amber-500 bg-amber-50' :
                          'text-blue-500 bg-blue-50'
                        }`}>
                          {c.cancelled ? '已取消' : c.submitted ? '待审批' : '新建'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ═══════════ Customers ═══════════ */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* By attribute */}
          <GlassCard>
            <h3 className="text-xs font-semibold text-slate-700 mb-3">按客户属性</h3>
            <DonutRing
              segments={[
                { label: '公司', value: customerAnalysis.byAttr.company.count, color: '#3b82f6' },
                { label: '个人', value: customerAnalysis.byAttr.individual.count, color: '#8b5cf6' },
              ]}
              size={140}
              centerLabel={`${customers.filter(c => !c.deleted).length} 个`}
            />
          </GlassCard>

          {/* By positioning */}
          <GlassCard>
            <h3 className="text-xs font-semibold text-slate-700 mb-3">按客户定位</h3>
            <BarChart
              data={Object.entries(customerAnalysis.byPos).map(([key, v]) => ({
                label: { vip: 'VIP', key: '重点', normal: '普通', low: '低价值', pending: '待筛选' }[key] || key,
                value: v.count,
              }))}
              height={140}
            />
          </GlassCard>

          {/* By province */}
          <GlassCard>
            <h3 className="text-xs font-semibold text-slate-700 mb-3">按地域分布</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(customerAnalysis.byProv)
                .sort((a, b) => b[1].count - a[1].count)
                .map(([prov, v], i) => (
                  <div key={prov} className="p-2 rounded-lg bg-white/50 border border-black/3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-[11px] text-slate-600">{prov}</span>
                    </div>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500">{v.count} 个</span>
                  </div>
                ))}
            </div>
          </GlassCard>
        </div>
      )}

    </div>
  )
}
