import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Download } from 'lucide-react'
import GlassPanel from '@/components/glass/GlassPanel'
import GlassCard from '@/components/glass/GlassCard'
import ExpenseTable from '@/components/expense/ExpenseTable'
import ExpenseForm from '@/components/expense/ExpenseForm'
import { useExpenses } from '@/hooks/useExpenses'
import { useAuth } from '@/hooks/useAuth'
import { canManagerReview, canFinanceAct } from '@/lib/expensePermissions'
import { useUsers } from '@/hooks/useUsers'
import { EXPENSE_STATUS_LABELS, EXPENSE_CATEGORIES } from '@/types'
import type { ExpenseStatus } from '@/types'

export default function ExpensePage() {
  const { user } = useAuth()
  const { getUser } = useUsers()
  const { expenses } = useExpenses()  // 服务端已按权限返回可见单据
  const [showForm, setShowForm] = useState(false)

  // ── 筛选条件 ──
  const [filterStatus, setFilterStatus] = useState<'' | ExpenseStatus>('')
  const [filterCustomer, setFilterCustomer] = useState('')
  const [filterSubmitter, setFilterSubmitter] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const customerOptions = useMemo(() => [...new Set(expenses.map(e => e.customerName))], [expenses])
  const submitterOptions = useMemo(() => [...new Set(expenses.map(e => e.submittedByName))], [expenses])

  const filtered = useMemo(() => expenses.filter(e => {
    if (filterStatus && e.status !== filterStatus) return false
    if (filterCustomer && e.customerName !== filterCustomer) return false
    if (filterSubmitter && e.submittedByName !== filterSubmitter) return false
    if (filterCategory && !e.items.some(i => i.category === filterCategory)) return false
    const submitDate = e.createdAt.slice(0, 10)
    if (dateFrom && submitDate < dateFrom) return false
    if (dateTo && submitDate > dateTo) return false
    return true
  }), [expenses, filterStatus, filterCustomer, filterSubmitter, filterCategory, dateFrom, dateTo])

  // ── 统计 ──
  const totalAmount = expenses.filter(e => e.status !== 'rejected').reduce((s, e) => s + e.totalAmount, 0)
  const pendingManagerCount = expenses.filter(e => e.status === 'pending_manager').length
  const pendingFinanceCount = expenses.filter(e => e.status === 'pending_finance').length
  const pendingPaymentCount = expenses.filter(e => e.status === 'pending_payment').length
  const myReviewCount = expenses.filter(e =>
    e.status === 'pending_manager' && canManagerReview(user, getUser(e.submittedById))).length
  const financeActionCount = expenses.filter(e =>
    (e.status === 'pending_finance' || e.status === 'pending_payment') && canFinanceAct(user)).length

  // ── CSV 导出（当前筛选结果）──
  const handleExport = () => {
    if (filtered.length === 0) { toast.error('当前筛选结果为空，无可导出数据'); return }
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const header = ['单据编号', '关联客户', '外勤时间', '外勤地点', '工作内容', '明细笔数', '费用类型', '总金额', '提交人', '提交时间', '状态', '驳回原因']
    const rows = filtered.map(e => [
      e.id, e.customerName, e.fieldworkDate, e.fieldworkLocation, e.workContent,
      e.items.length, [...new Set(e.items.map(i => i.category))].join('/'),
      e.totalAmount, e.submittedByName, e.createdAt,
      EXPENSE_STATUS_LABELS[e.status], e.rejectReason || '',
    ])
    const csv = String.fromCharCode(0xFEFF) + [header, ...rows].map(r => r.map(esc).join(',')).join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `外勤费用报销台账_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`已导出 ${filtered.length} 条报销记录`)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 font-display mb-1">外勤费用报销</h1>
      <p className="text-xs text-slate-400 mb-5">共 {expenses.length} 张报销单 · 事前有据 / 据实报销 / 标准可控 / 数据闭环</p>

      {/* 统计卡 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <GlassCard className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <span className="text-blue-500 text-sm font-bold">¥</span>
          </div>
          <div>
            <p className="text-[9px] text-slate-400">报销总额（不含驳回）</p>
            <p className="text-sm font-mono font-bold text-slate-800 tabular-nums">¥{totalAmount.toLocaleString()}</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <span className="text-amber-500 text-sm font-bold">{pendingManagerCount}</span>
          </div>
          <div>
            <p className="text-[9px] text-slate-400">待主管审核{myReviewCount > 0 ? `（我审 ${myReviewCount}）` : ''}</p>
            <p className="text-sm font-mono font-bold text-slate-800">{pendingManagerCount} 张</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <span className="text-blue-500 text-sm font-bold">{pendingFinanceCount}</span>
          </div>
          <div>
            <p className="text-[9px] text-slate-400">待财务审核</p>
            <p className="text-sm font-mono font-bold text-slate-800">{pendingFinanceCount} 张</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <span className="text-indigo-500 text-sm font-bold">{pendingPaymentCount}</span>
          </div>
          <div>
            <p className="text-[9px] text-slate-400">待打款{financeActionCount > 0 ? `（财务待办 ${financeActionCount}）` : ''}</p>
            <p className="text-sm font-mono font-bold text-slate-800">{pendingPaymentCount} 张</p>
          </div>
        </GlassCard>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-white bg-blue-500 rounded-lg interactive"
          >
            <Plus size={12} /> 新增报销
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-slate-600 bg-white/60 rounded-lg border border-black/5 interactive"
          >
            <Download size={12} /> 导出 CSV
          </button>
        </div>
      </div>

      {/* 筛选栏 */}
      <GlassCard className="p-3 mb-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as '' | ExpenseStatus)} className="input-glass w-full text-[11px]">
            <option value="">全部状态</option>
            {(Object.keys(EXPENSE_STATUS_LABELS) as ExpenseStatus[]).map(s => (
              <option key={s} value={s}>{EXPENSE_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} className="input-glass w-full text-[11px]">
            <option value="">全部客户</option>
            {customerOptions.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterSubmitter} onChange={e => setFilterSubmitter(e.target.value)} className="input-glass w-full text-[11px]">
            <option value="">全部提交人</option>
            {submitterOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="input-glass w-full text-[11px]">
            <option value="">全部费用类型</option>
            {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-glass w-full text-[11px]" title="提交时间起" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-glass w-full text-[11px]" title="提交时间止" />
        </div>
      </GlassCard>

      <GlassPanel title={`报销单列表（${filtered.length}）`}>
        <ExpenseTable expenses={filtered} />
      </GlassPanel>

      <ExpenseForm open={showForm} onClose={() => setShowForm(false)} />

      {/* 审批流程可视化（SOP 两级审核） */}
      <GlassCard className="mt-4 p-4">
        <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">审批流程（SOP）</h3>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
          <StepBadge label="员工发起申请" active />
          <StepArrow />
          <StepBadge label="直属主管一级审核" active={expenses.some(e => e.status === 'pending_manager')} />
          <StepArrow />
          <StepBadge label="财务二级审核" active={expenses.some(e => e.status === 'pending_finance')} />
          <StepArrow />
          <StepBadge label="核销打款" active={expenses.some(e => e.status === 'pending_payment')} />
          <StepArrow />
          <StepBadge label="申请人签收" active={expenses.some(e => e.status === 'paid')} />
          <StepArrow />
          <StepBadge label="核销办结归档" active={expenses.some(e => e.status === 'settled')} />
        </div>
        {expenses.some(e => e.status === 'rejected') && (
          <p className="text-[10px] text-red-400 mt-2">⟲ 有 {expenses.filter(e => e.status === 'rejected').length} 张单据被驳回，申请人可整改后重新提交</p>
        )}
      </GlassCard>
    </div>
  )
}

function StepBadge({ label, active }: { label: string; active?: boolean }) {
  return (
    <span className={`px-2 py-1 rounded font-medium whitespace-nowrap ${active ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'}`}>
      {label}
    </span>
  )
}

function StepArrow() {
  return <span className="text-slate-300">→</span>
}
