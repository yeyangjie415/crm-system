import { useState, useMemo, useCallback, useEffect } from 'react'
import { Calculator, Info, UserCog, ChevronDown } from 'lucide-react'
import GlassCard from '@/components/glass/GlassCard'
import { useUsers } from '@/hooks/useUsers'
import type { Contract } from '@/types'
import {
  DEFAULT_COMMISSION_PARAMS,
  computeQuarterlyCommissions,
  computeFixedBonus,
  computeNewCustomerBonus,
  computeFloatingBonus,
  computeTechCommission,
  computeSalesTotal,
  computeBreakdown,
  fmtWan,
  fmtYuan,
  type CommissionBreakdown,
} from '@/lib/commission'

export type { CommissionBreakdown }

interface Props {
  selectedContracts: Contract[]
  onBreakdownChange?: (breakdown: CommissionBreakdown[]) => void
}

/* ------------------------------------------------------------------ */
/*  Default parameter values                                           */
/* ------------------------------------------------------------------ */

type ParamKey = keyof typeof DEFAULT_COMMISSION_PARAMS

/* ------------------------------------------------------------------ */
/*  Tiny inline number input                                           */
/* ------------------------------------------------------------------ */

function PctInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step="0.1"
      min="0"
      max="100"
      className="w-16 text-[10px] font-mono text-center px-1 py-0.5 rounded border border-black/10 bg-white/60 focus:outline-none focus:border-blue-400"
      value={value * 100}
      onChange={e => onChange((Number(e.target.value) || 0) / 100)}
    />
  )
}

function MoneyInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step="10000"
      min="0"
      className="w-20 text-[10px] font-mono text-center px-1 py-0.5 rounded border border-black/10 bg-white/60 focus:outline-none focus:border-blue-400"
      value={value}
      onChange={e => onChange(Number(e.target.value) || 0)}
    />
  )
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function CommissionCalculator({ selectedContracts, onBreakdownChange }: Props) {
  const { users } = useUsers()
  /* ---- which bonus types are active ---- */
  const [enabled, setEnabled] = useState({
    quarterly: true,
    fixedBonus: true,
    newCustomer: true,
    floating: true,
    tech: true,
  })

  const toggle = (key: keyof typeof enabled) =>
    setEnabled(prev => ({ ...prev, [key]: !prev[key] }))

  /* ---- editable parameters ---- */
  const [p, setP] = useState(DEFAULT_COMMISSION_PARAMS)

  const updateParam = useCallback((key: ParamKey, value: number) => {
    setP(prev => ({ ...prev, [key]: value }))
  }, [])

  /* ---- tech person ---- */
  const [techPersonId, setTechPersonId] = useState('')
  const [techPersonName, setTechPersonName] = useState('')
  const [showTechPicker, setShowTechPicker] = useState(false)

  // Tech persons = users with role 'technician'
  const techUsers = useMemo(() => users.filter(u => u.role === 'technician' && !u.disabled), [users])

  /* ---- derived amounts (using pure functions) ---- */
  const totalSettlement = useMemo(
    () => selectedContracts.reduce((sum, c) => sum + c.settlementAmount, 0),
    [selectedContracts],
  )

  const qResult = useMemo(
    () => computeQuarterlyCommissions(selectedContracts, p),
    [selectedContracts, p],
  )

  const fixedResult = useMemo(
    () => computeFixedBonus(totalSettlement, p),
    [totalSettlement, p],
  )

  const ncResult = useMemo(
    () => computeNewCustomerBonus(selectedContracts, p),
    [selectedContracts, p],
  )

  const floatResult = useMemo(
    () => computeFloatingBonus(totalSettlement, p),
    [totalSettlement, p],
  )

  const techCommission = computeTechCommission(totalSettlement, p.techRate)

  /* ---- grand total ---- */
  const salesTotal = computeSalesTotal(
    qResult.quarterlyTotal, fixedResult.bonus, ncResult.bonus, floatResult.bonus, enabled,
  )
  const techTotal = enabled.tech ? techCommission : 0
  const grandTotal = salesTotal + techTotal

  /* ---- per-contract breakdown (delegated to pure function) ---- */
  const breakdown = useMemo(
    () => computeBreakdown(selectedContracts, p, enabled, techPersonId, techPersonName),
    [selectedContracts, p, enabled, techPersonId, techPersonName],
  )

  // Notify parent
  const prevBreakdownRef = useCallback((b: CommissionBreakdown[]) => {
    onBreakdownChange?.(b)
  }, [onBreakdownChange])

  useEffect(() => {
    prevBreakdownRef(breakdown)
  }, [breakdown, prevBreakdownRef])

  /* ---- empty state ---- */
  if (selectedContracts.length === 0) {
    return (
      <GlassCard className="mt-4 p-6 text-center">
        <Calculator size={32} className="text-slate-300 mx-auto mb-2" />
        <p className="text-xs text-slate-400">请在表格中勾选合同以计算提成</p>
      </GlassCard>
    )
  }

  /* ---- render ---- */
  return (
    <div className="mt-4 space-y-3">
      {/* ============ 1. 季度提成 ============ */}
      <BonusCard
        title="季度提成"
        subtitle="个人客户按个人比例计算，公司客户按公司比例计算，合计为季度提成"
        enabled={enabled.quarterly}
        onToggle={() => toggle('quarterly')}
        amount={qResult.quarterlyTotal}
        activeLabel={`个人客户 ${fmtWan(qResult.personalAmount)}×${(p.personalRate * 100).toFixed(1)}% = ${fmtYuan(qResult.quarterlyPersonal)}，公司客户 ${fmtWan(qResult.companyAmount)}×${(p.companyRate * 100).toFixed(1)}% = ${fmtYuan(qResult.quarterlyCompany)}`}
        params={
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            <ParamRow label="个人客户提成比例">
              <PctInput value={p.personalRate} onChange={v => updateParam('personalRate', v)} />
              <span className="text-[9px] text-slate-400 ml-1">%</span>
              <span className="text-[9px] text-slate-400 ml-2">
                = {fmtYuan(qResult.quarterlyPersonal)}
              </span>
            </ParamRow>
            <ParamRow label="公司客户提成比例">
              <PctInput value={p.companyRate} onChange={v => updateParam('companyRate', v)} />
              <span className="text-[9px] text-slate-400 ml-1">%</span>
              <span className="text-[9px] text-slate-400 ml-2">
                = {fmtYuan(qResult.quarterlyCompany)}
              </span>
            </ParamRow>
          </div>
        }
      />

      {/* ============ 2. 固定奖金 ============ */}
      <BonusCard
        title="固定奖金"
        subtitle={`当前档位：${fixedResult.tierLabel}`}
        enabled={enabled.fixedBonus}
        onToggle={() => toggle('fixedBonus')}
        amount={fixedResult.bonus}
        activeLabel={fixedResult.bonus > 0 ? `奖金 ¥${fixedResult.bonus.toLocaleString()}` : '未达标'}
        params={
          <div className="space-y-1.5">
            <TierRow
              label="Tier 1"
              min={p.fixedTier1Min}
              max={p.fixedTier1Max}
              bonus={p.fixedBonus1}
              active={fixedResult.bonus === p.fixedBonus1}
              onMinChange={v => updateParam('fixedTier1Min', v)}
              onMaxChange={v => updateParam('fixedTier1Max', v)}
              onBonusChange={v => updateParam('fixedBonus1', v)}
              isBonus
            />
            <TierRow
              label="Tier 2"
              min={p.fixedTier2Min}
              max={p.fixedTier2Max}
              bonus={p.fixedBonus2}
              active={fixedResult.bonus === p.fixedBonus2}
              onMinChange={v => updateParam('fixedTier2Min', v)}
              onMaxChange={v => updateParam('fixedTier2Max', v)}
              onBonusChange={v => updateParam('fixedBonus2', v)}
              isBonus
            />
            <TierRow
              label="Tier 3"
              min={p.fixedTier3Min}
              max={undefined}
              bonus={p.fixedBonus3}
              active={fixedResult.bonus === p.fixedBonus3}
              onMinChange={v => updateParam('fixedTier3Min', v)}
              onBonusChange={v => updateParam('fixedBonus3', v)}
              isBonus
            />
          </div>
        }
      />

      {/* ============ 3. 新客户奖金 ============ */}
      <BonusCard
        title="新客户奖金"
        subtitle="新客户的首个合同结算金额 × 比例"
        enabled={enabled.newCustomer}
        onToggle={() => toggle('newCustomer')}
        amount={ncResult.bonus}
        activeLabel={`首次合同金额 ${fmtWan(ncResult.newCustomerTotal)} × ${(p.newCustomerRate * 100).toFixed(1)}%`}
        params={
          <ParamRow label="新客户提成比例">
            <PctInput value={p.newCustomerRate} onChange={v => updateParam('newCustomerRate', v)} />
            <span className="text-[9px] text-slate-400 ml-1">%</span>
          </ParamRow>
        }
      />

      {/* ============ 4. 浮动奖金 ============ */}
      <BonusCard
        title="浮动奖金"
        subtitle={`当前档位：${floatResult.tierLabel}`}
        enabled={enabled.floating}
        onToggle={() => toggle('floating')}
        amount={floatResult.bonus}
        activeLabel={floatResult.rate > 0 ? `总业绩 ${fmtWan(totalSettlement)} × ${(floatResult.rate * 100).toFixed(1)}%` : '未达标'}
        params={
          <div className="space-y-1.5">
            <TierRow
              label="Tier 1"
              min={p.floatTier1Min}
              max={p.floatTier1Max}
              bonus={p.floatRate1}
              active={floatResult.rate === p.floatRate1}
              onMinChange={v => updateParam('floatTier1Min', v)}
              onMaxChange={v => updateParam('floatTier1Max', v)}
              onBonusChange={v => updateParam('floatRate1', v)}
              isBonus={false}
            />
            <TierRow
              label="Tier 2"
              min={p.floatTier2Min}
              max={p.floatTier2Max}
              bonus={p.floatRate2}
              active={floatResult.rate === p.floatRate2}
              onMinChange={v => updateParam('floatTier2Min', v)}
              onMaxChange={v => updateParam('floatTier2Max', v)}
              onBonusChange={v => updateParam('floatRate2', v)}
              isBonus={false}
            />
            <TierRow
              label="Tier 3"
              min={p.floatTier3Min}
              max={undefined}
              bonus={p.floatRate3}
              active={floatResult.rate === p.floatRate3}
              onMinChange={v => updateParam('floatTier3Min', v)}
              onBonusChange={v => updateParam('floatRate3', v)}
              isBonus={false}
            />
          </div>
        }
      />

      {/* ============ 5. 技术提成 ============ */}
      <BonusCard
        title="技术提成"
        subtitle="合同结算金额 × 比例"
        enabled={enabled.tech}
        onToggle={() => toggle('tech')}
        amount={techCommission}
        activeLabel={`总业绩 ${fmtWan(totalSettlement)} × ${(p.techRate * 100).toFixed(1)}%`}
        params={
          <div className="space-y-2">
            <ParamRow label="技术提成比例">
              <PctInput value={p.techRate} onChange={v => updateParam('techRate', v)} />
              <span className="text-[9px] text-slate-400 ml-1">%</span>
            </ParamRow>
            <ParamRow label="技术跟进人">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTechPicker(!showTechPicker)}
                  className="text-[10px] py-1 px-2 rounded border border-black/10 bg-white/60 flex items-center gap-1 hover:border-blue-400"
                >
                  <UserCog size={10} className="text-slate-400" />
                  <span className={techPersonName ? 'text-slate-700' : 'text-slate-400'}>
                    {techPersonName || '选择技术人员'}
                  </span>
                  <ChevronDown size={10} className={`text-slate-400 transition-transform ${showTechPicker ? 'rotate-180' : ''}`} />
                </button>
                {showTechPicker && (
                  <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-32 overflow-y-auto z-30 w-36">
                    {techUsers.length === 0 ? (
                      <p className="px-3 py-2 text-[10px] text-slate-400">无技术人员</p>
                    ) : (
                      techUsers.map(u => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setTechPersonId(u.id)
                            setTechPersonName(u.name)
                            setShowTechPicker(false)
                          }}
                          className={`w-full text-left px-3 py-1.5 text-[10px] hover:bg-blue-50 transition-colors ${
                            techPersonId === u.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600'
                          }`}
                        >
                          {u.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </ParamRow>
          </div>
        }
      />

      {/* ============ Grand Total ============ */}
      <GlassCard className="!bg-blue-50/60 !border-blue-200">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-800">销售提成</p>
            <span className="text-lg font-mono font-bold text-blue-600 tabular-nums">
              ¥{salesTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          {enabled.tech && (
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-800">
                技术提成
                {techPersonName && <span className="text-[9px] font-normal text-slate-400 ml-1">（{techPersonName}）</span>}
              </p>
              <span className="text-lg font-mono font-bold text-purple-600 tabular-nums">
                ¥{techTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          )}
          <div className="pt-2 border-t border-blue-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-800">合计提成</p>
              <p className="text-[9px] text-slate-400 mt-0.5">
                已选 {selectedContracts.length} 条合同 · 已启用 {Object.values(enabled).filter(Boolean).length} 项奖金
              </p>
            </div>
            <span className="text-xl font-mono font-bold text-blue-600 tabular-nums">
              ¥{grandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function BonusCard({
  title,
  subtitle,
  enabled,
  onToggle,
  amount,
  activeLabel,
  params,
}: {
  title: string
  subtitle: string
  enabled: boolean
  onToggle: () => void
  amount: number
  activeLabel: string
  params: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <GlassCard className={`transition-all ${!enabled ? 'opacity-50' : ''}`}>
      {/* Header row */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          className="w-4 h-4 rounded accent-blue-500 cursor-pointer shrink-0"
          checked={enabled}
          onChange={onToggle}
        />
        <div className="flex-1 min-w-0" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{title}</span>
            <Info
              size={12}
              className={`text-slate-300 hover:text-blue-400 transition-colors ${expanded ? 'text-blue-400' : ''}`}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-mono font-bold text-slate-800 tabular-nums">
            {enabled ? `¥${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          </p>
          {enabled && (
            <p className="text-[8px] text-slate-400 mt-0.5 max-w-[180px] leading-relaxed">{activeLabel}</p>
          )}
        </div>
      </div>

      {/* Expanded params */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-black/5">
          <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider mb-2">参数设置</p>
          {params}
        </div>
      )}
    </GlassCard>
  )
}

function ParamRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-500 w-28 shrink-0">{label}</span>
      {children}
    </div>
  )
}

function TierRow({
  label,
  min,
  max,
  bonus,
  active,
  onMinChange,
  onMaxChange,
  onBonusChange,
  isBonus,
}: {
  label: string
  min: number
  max?: number
  bonus: number
  active: boolean
  onMinChange: (v: number) => void
  onMaxChange?: (v: number) => void
  onBonusChange: (v: number) => void
  isBonus: boolean
}) {
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded text-[10px] ${active ? 'bg-amber-50/60 ring-1 ring-amber-200' : ''}`}>
      <span className={`w-10 font-semibold shrink-0 ${active ? 'text-amber-600' : 'text-slate-400'}`}>
        {label}
        {active && ' ✓'}
      </span>
      <span className="text-slate-400 shrink-0">业绩</span>
      <span className="text-slate-400">&gt;</span>
      <MoneyInput value={min} onChange={onMinChange} />
      {max !== undefined && (
        <>
          <span className="text-slate-400">≤</span>
          <MoneyInput value={max} onChange={onMaxChange!} />
        </>
      )}
      <span className="text-slate-400 mx-1">→</span>
      {isBonus ? (
        <>
          <span className="text-slate-400">奖金</span>
          <MoneyInput value={bonus} onChange={onBonusChange} />
        </>
      ) : (
        <>
          <PctInput value={bonus} onChange={onBonusChange} />
          <span className="text-[9px] text-slate-400">%</span>
        </>
      )}
    </div>
  )
}
