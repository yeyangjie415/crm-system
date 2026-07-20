import { useMemo } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { Check, Clock, ExternalLink } from 'lucide-react'
import GlassCard from '@/components/glass/GlassCard'
import { useTasks } from '@/hooks/useTasks'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import { getDeadlineLabel } from '@/lib/utils'
import type { Task } from '@/types'

interface PlanItem {
  id: string
  title: string
  content: string
  deadline: string
  person: string
  linkTo?: string
}

function parseNextPlan(record: { id: string; content: string; recordedBy: string; recordedAt: string; projectId: string }): { plan: string; date: string } | null {
  const text = record.content
  // Remove the "📋 下一步计划：" prefix
  if (!text.includes('下一步计划')) return null
  const withoutPrefix = text.replace(/^📋\s*下一步计划[：:]\s*/, '')
  // Extract date portion
  const dateMatch = withoutPrefix.match(/\(计划时间[：:]?\s*(\d{4}-\d{2}-\d{2})\)/)
  const date = dateMatch ? dateMatch[1] : ''
  const plan = dateMatch ? withoutPrefix.replace(/\s*\(计划时间[：:]?\s*\d{4}-\d{2}-\d{2}\)\s*$/, '') : withoutPrefix
  return { plan: plan.trim(), date }
}

function getSourceLabel(source: Task['source']) {
  switch (source) {
    case 'customer': return { label: '客户跟进', color: 'text-blue-500 bg-blue-50', link: '/customers' }
    case 'contract': return { label: '合同审批', color: 'text-purple-500 bg-purple-50', link: '/deals' }
    case 'office': return { label: '协同办公', color: 'text-emerald-500 bg-emerald-50', link: '/office' }
  }
}

export default function TaskList() {
  const { user, isAdmin } = useAuth()
  const { tasks: allTasks, updateTask } = useTasks()
  const { customers, followRecords, deleteFollowRecord } = useCustomers()
  const navigate = useNavigate()

  /* ---- Filter tasks by user permission ---- */
  const tasks = useMemo(() =>
    isAdmin ? allTasks : allTasks.filter(t => t.assignedBy === user?.name || t.assignedTo === user?.name),
    [allTasks, isAdmin, user?.name])

  /* ---- Derive follow-up plan items from follow timeline ---- */
  const planItems = useMemo<PlanItem[]>(() => {
    // Build a map: projectId -> { projectName, customerName, customerId }
    const projectMap = new Map<string, { projectName: string; customerName: string; customerId: string }>()
    for (const c of customers) {
      if (c.deleted) continue
      for (const p of c.projects || []) {
        projectMap.set(p.id, { projectName: p.name, customerName: c.name, customerId: c.id })
      }
    }

    return followRecords
      .map(r => {
        const parsed = parseNextPlan(r)
        if (!parsed) return null
        const project = projectMap.get(r.projectId)
        return {
          id: `plan-${r.id}`,
          title: parsed.plan,
          content: project ? `${project.customerName} — ${project.projectName}` : '跟进项目',
          deadline: parsed.date,
          person: r.recordedBy || '—',
          linkTo: project ? `/customers/${project.customerId}` : undefined,
        } as PlanItem
      })
      .filter((item): item is PlanItem => item !== null)
      .sort((a, b) => {
        // Sort with deadline (soonest first); no deadline goes last
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return a.deadline.localeCompare(b.deadline)
      })
  }, [customers, followRecords])

  const handleComplete = (taskId: string) => {
    updateTask(taskId, { completed: true })
    toast.success('任务已完成')
  }

  const handlePlanComplete = (planId: string) => {
    const recordId = planId.replace(/^plan-/, '')
    deleteFollowRecord(recordId)
    toast.success('跟进计划已完成')
  }

  const handleNavigate = (task: Task) => {
    if (task.linkTo) {
      navigate(task.linkTo)
    } else {
      const defaultLink = getSourceLabel(task.source).link
      navigate(defaultLink)
    }
  }

  const activeTasks = tasks.filter(t => !t.completed)
  const totalItems = activeTasks.length + planItems.length

  return (
    <GlassCard reveal revealDelay={400}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">待办提醒</h3>
        <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{totalItems} 项待处理</span>
      </div>
      {totalItems === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">🎉 所有任务已完成</p>
      ) : (
        <div className="space-y-1.5">
          {/* Office / customer / contract tasks */}
          {activeTasks.map(task => {
            const deadline = getDeadlineLabel(task.deadline)
            const source = getSourceLabel(task.source)
            return (
              <div key={task.id} className="table-row w-full p-2.5 rounded-lg border border-black/3 bg-white/40">
                <div className="flex items-center gap-3 w-full">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleComplete(task.id) }}
                    className="w-5 h-5 rounded-md border-2 border-slate-200 flex items-center justify-center shrink-0 interactive hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                  >
                    <Check size={12} className="text-emerald-500 opacity-0 hover:opacity-100" />
                  </button>
                  <div
                    className="flex-1 min-w-0 cursor-pointer group"
                    onClick={() => handleNavigate(task)}
                    title="点击跳转到相关页面"
                  >
                    <p className="text-xs font-medium text-slate-700 truncate group-hover:text-blue-500 transition-colors">
                      {task.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{task.content}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNavigate(task) }}
                    className="shrink-0 text-slate-300 hover:text-blue-500 transition-colors p-0.5"
                    title="跳转到相关页面"
                  >
                    <ExternalLink size={12} />
                  </button>
                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${source.color}`}>
                      {source.label}
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex items-center gap-1 ${deadline.color}`}>
                      <Clock size={9} />{deadline.label}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Follow-up plan items from customer timeline */}
          {planItems.map(item => (
            <div key={item.id} className="table-row w-full p-2.5 rounded-lg border border-black/3 bg-blue-50/30">
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePlanComplete(item.id) }}
                  className="w-5 h-5 rounded-md border-2 border-blue-200 flex items-center justify-center shrink-0 interactive hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                  title="标记为已完成"
                >
                  <Check size={12} className="text-emerald-500 opacity-0 hover:opacity-100" />
                </button>
                <div
                  className="flex-1 min-w-0 cursor-pointer group"
                  onClick={() => item.linkTo && navigate(item.linkTo)}
                  title={item.linkTo ? '点击跳转到客户页面' : undefined}
                >
                  <p className="text-xs font-medium text-blue-700 truncate group-hover:text-blue-500 transition-colors">
                    {item.title}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{item.content}</p>
                </div>
                {item.linkTo && (
                  <button
                    onClick={() => navigate(item.linkTo!)}
                    className="shrink-0 text-slate-300 hover:text-blue-500 transition-colors p-0.5"
                    title="跳转到客户页面"
                  >
                    <ExternalLink size={12} />
                  </button>
                )}
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap text-blue-500 bg-blue-50">
                    跟进计划
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap text-slate-400 bg-slate-100">
                    {item.person}
                  </span>
                  {item.deadline && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex items-center gap-1 text-amber-600 bg-amber-50">
                      <Clock size={9} />{item.deadline}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
