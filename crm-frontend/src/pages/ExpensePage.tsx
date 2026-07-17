import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Download, Trash2 } from 'lucide-react'
import GlassPanel from '@/components/glass/GlassPanel'
import GlassCard from '@/components/glass/GlassCard'
import ExpenseTable from '@/components/expense/ExpenseTable'
import ExpenseForm from '@/components/expense/ExpenseForm'
import { useExpenses } from '@/hooks/useExpenses'
import { useAuth } from '@/hooks/useAuth'

export default function ExpensePage() {
  const { user, isAdmin } = useAuth()
  const { expenses: allExpenses, deleteExpense } = useExpenses()
  const expenses = useMemo(() =>
    isAdmin ? allExpenses : allExpenses.filter(e => e.submittedBy === user?.name),
    [allExpenses, isAdmin, user?.name])
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
  const pendingCount = expenses.filter(e => e.status === 'pending').length

  const handleBatchDelete = () => {
    if (selected.length === 0) return
    if (!window.confirm(`确定删除 ${selected.length} 条报销记录？`)) return
    selected.forEach(id => deleteExpense(id))
    toast.success(`已删除 ${selected.length} 条报销记录`)
    setSelected([])
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 font-display mb-1">报销发放</h1>
      <p className="text-xs text-slate-400 mb-5">共 {expenses.length} 条报销记录</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <GlassCard className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <span className="text-blue-500 text-sm font-bold">¥</span>
          </div>
          <div>
            <p className="text-[9px] text-slate-400">报销总额</p>
            <p className="text-sm font-mono font-bold text-slate-800 tabular-nums">¥{totalAmount.toLocaleString()}</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <span className="text-amber-500 text-sm font-bold">{pendingCount}</span>
          </div>
          <div>
            <p className="text-[9px] text-slate-400">待审批</p>
            <p className="text-sm font-mono font-bold text-slate-800">{pendingCount} 笔</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <span className="text-emerald-500 text-sm font-bold">{expenses.filter(e => e.status === 'paid').length}</span>
          </div>
          <div>
            <p className="text-[9px] text-slate-400">已发放</p>
            <p className="text-sm font-mono font-bold text-slate-800">{expenses.filter(e => e.status === 'paid').length} 笔</p>
          </div>
        </GlassCard>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-white bg-blue-500 rounded-lg interactive"
          >
            <Plus size={12} /> 新增报销
          </button>
          <button
            onClick={() => toast.success('报销数据已导出')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-slate-600 bg-white/60 rounded-lg border border-black/5 interactive"
          >
            <Download size={12} /> 导出
          </button>
        </div>
      </div>

      {selected.length > 0 && (
        <div className="glass-card p-3 my-3 flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
          <span className="text-xs text-slate-600 font-medium">已选 {selected.length} 项</span>
          <button
            onClick={handleBatchDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-red-500 bg-red-50/60 rounded-lg border border-red-100 interactive"
          >
            <Trash2 size={12} /> 批量删除
          </button>
          <button onClick={() => setSelected([])} className="ml-auto text-[10px] text-slate-400 hover:text-slate-600">
            取消选择
          </button>
        </div>
      )}

      <GlassPanel title="报销列表">
        <ExpenseTable expenses={expenses} selected={selected} onSelect={setSelected} />
      </GlassPanel>

      <ExpenseForm open={showForm} onClose={() => setShowForm(false)} />

      {/* Dynamic Approval Flow */}
      <GlassCard className="mt-4 p-4">
        <h3 className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2">审批流程</h3>
        <div className="flex items-center gap-2 text-[10px] text-slate-500 flex-wrap">
          <StepBadge label="报销人发起" active />
          <StepArrow />
          <StepBadge label="总经理审批" active={expenses.some(e => e.status === 'pending')} />
          <StepArrow />
          <StepBadge label="财务发放" active={expenses.some(e => e.status === 'approved')} />
          <StepArrow />
          <StepBadge label="报销人签收" active={expenses.some(e => e.status === 'paid')} />
        </div>
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
