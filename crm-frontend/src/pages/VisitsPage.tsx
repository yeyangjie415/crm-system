import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import GlassPanel from '@/components/glass/GlassPanel'
import VisitTable from '@/components/visit/VisitTable'
import VisitForm from '@/components/visit/VisitForm'
import VisitSummary from '@/components/visit/VisitSummary'
import { useVisits } from '@/hooks/useVisits'
import { useAuth } from '@/hooks/useAuth'

export default function VisitsPage() {
  const { user, isAdmin } = useAuth()
  const { visits: allVisits, deleteVisit } = useVisits()
  const visits = useMemo(() =>
    isAdmin ? allVisits : allVisits.filter(v => v.salesperson === user?.name),
    [allVisits, isAdmin, user?.name])
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<string[]>([])

  const handleBatchDelete = () => {
    if (selected.length === 0) return
    if (!window.confirm(`确定删除 ${selected.length} 条拜访记录？`)) return
    selected.forEach(id => deleteVisit(id))
    toast.success(`已删除 ${selected.length} 条拜访记录`)
    setSelected([])
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 font-display mb-1">外勤管理</h1>
      <p className="text-xs text-slate-400 mb-5">共 {visits.length} 条拜访记录</p>

      <VisitSummary visits={visits} />

      <div className="mb-3">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-white bg-blue-500 rounded-lg interactive"
        >
          <Plus size={12} /> 新增拜访
        </button>
      </div>

      {selected.length > 0 && (
        <div className="glass-card p-3 my-3 flex items-center gap-3 animate-in slide-in-from-top-2 duration-200">
          <span className="text-xs text-slate-600 font-medium">已选 {selected.length} 项</span>
          <button onClick={handleBatchDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-red-500 bg-red-50/60 rounded-lg border border-red-100 interactive">
            <Trash2 size={12} /> 批量删除
          </button>
          <button onClick={() => setSelected([])} className="ml-auto text-[10px] text-slate-400 hover:text-slate-600">取消选择</button>
        </div>
      )}

      <GlassPanel title="拜访记录">
        <VisitTable visits={visits} selected={selected} onSelect={setSelected} />
      </GlassPanel>

      <VisitForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
