import { useState, useMemo } from 'react'
import { Plus, Send, Clock, CheckCircle, Eye, EyeOff } from 'lucide-react'
import GlassCard from '@/components/glass/GlassCard'
import OfficeTaskList from '@/components/office/OfficeTaskList'
import OfficeTaskForm from '@/components/office/OfficeTaskForm'
import { useTasks } from '@/hooks/useTasks'
import { useAuth } from '@/hooks/useAuth'

export default function OfficePage() {
  const { user, isAdmin } = useAuth()
  const { tasks: allTasks } = useTasks()
  const tasks = useMemo(() =>
    isAdmin ? allTasks : allTasks.filter(t => t.assignedBy === user?.name || t.assignedTo === user?.name),
    [allTasks, isAdmin, user?.name])
  const [showForm, setShowForm] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)

  const activeCount = tasks.filter(t => !t.completed).length
  const doneCount = tasks.filter(t => t.completed).length
  const pendingConfirmCount = tasks.filter(t => t.status === 'submitted').length

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 font-display mb-1">协同办公</h1>
      <p className="text-xs text-slate-400 mb-5">任务分发与协作</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <GlassCard className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Send size={14} className="text-blue-500" />
          </div>
          <div>
            <p className="text-[9px] text-slate-400">协同任务总数</p>
            <p className="text-lg font-mono font-bold text-slate-800">{tasks.length}</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <Clock size={14} className="text-amber-500" />
          </div>
          <div>
            <p className="text-[9px] text-slate-400">待处理</p>
            <p className="text-lg font-mono font-bold text-slate-800">{activeCount}</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
            <Clock size={14} className="text-orange-500" />
          </div>
          <div>
            <p className="text-[9px] text-slate-400">待发件人确认</p>
            <p className="text-lg font-mono font-bold text-slate-800">{pendingConfirmCount}</p>
          </div>
        </GlassCard>
        <GlassCard className="flex items-center gap-3 p-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle size={14} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-[9px] text-slate-400">已完成</p>
            <p className="text-lg font-mono font-bold text-slate-800">{doneCount}</p>
          </div>
        </GlassCard>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-white bg-blue-500 rounded-lg interactive"
        >
          <Plus size={12} /> 分派任务
        </button>
        {doneCount > 0 && (
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium rounded-lg border interactive ${
              showCompleted ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-white/60 text-slate-500 border-black/5'
            }`}
          >
            {showCompleted ? <EyeOff size={12} /> : <Eye size={12} />}
            {showCompleted ? '隐藏已完成' : '已完成'}
          </button>
        )}
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
            {showCompleted ? '已完成任务' : '协同任务列表'}
          </h3>
          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
            {showCompleted ? `${doneCount} 项已完成` : `${activeCount} 项待处理`}
          </span>
        </div>
        <OfficeTaskList tasks={tasks} showCompleted={showCompleted} />
      </GlassCard>

      <OfficeTaskForm open={showForm} onClose={() => setShowForm(false)} />
    </div>
  )
}
