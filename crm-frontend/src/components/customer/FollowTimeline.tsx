import { useState } from 'react'
import { toast } from 'sonner'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import GlassModal from '@/components/glass/GlassModal'
import { MessageSquare, Plus, CalendarClock } from 'lucide-react'

interface FollowTimelineProps {
  projectId: string
  canEdit?: boolean
}

function isPlanRecord(content: string): boolean {
  return content.includes('下一步计划')
}

function parsePlanContent(content: string): { plan: string; date: string } {
  const withoutPrefix = content.replace(/^📋\s*下一步计划[：:]\s*/, '')
  const dateMatch = withoutPrefix.match(/\(计划时间[：:]?\s*(\d{4}-\d{2}-\d{2})\)/)
  const date = dateMatch ? dateMatch[1] : ''
  const plan = dateMatch ? withoutPrefix.replace(/\s*\(计划时间[：:]?\s*\d{4}-\d{2}-\d{2}\)\s*$/, '') : withoutPrefix
  return { plan: plan.trim(), date }
}

export default function FollowTimeline({ projectId, canEdit = true }: FollowTimelineProps) {
  const [showAddFollow, setShowAddFollow] = useState(false)
  const [showAddPlan, setShowAddPlan] = useState(false)
  const [followContent, setFollowContent] = useState('')
  const [planContent, setPlanContent] = useState('')
  const [planDate, setPlanDate] = useState('')
  const { getFollowRecords, addFollowRecord } = useCustomers()
  const { user } = useAuth()
  const records = getFollowRecords(projectId)
  const recordedByName = user?.name || '当前用户'

  const planRecords = records.filter(r => isPlanRecord(r.content))
  const followRecords = records.filter(r => !isPlanRecord(r.content))

  const now = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  /* ── Save follow record ── */
  const handleSaveFollow = () => {
    if (!followContent.trim()) {
      toast.error('请填写跟进内容')
      return
    }
    addFollowRecord(projectId, {
      content: followContent.trim(),
      recordedBy: recordedByName,
      recordedAt: now(),
    })
    toast.success('跟进记录已保存')
    setFollowContent('')
    setShowAddFollow(false)
  }

  /* ── Save follow plan ── */
  const handleSavePlan = () => {
    if (!planContent.trim()) {
      toast.error('请填写计划内容')
      return
    }
    const content = `📋 下一步计划：${planContent.trim()}${planDate ? ` (计划时间：${planDate})` : ''}`
    addFollowRecord(projectId, {
      content,
      recordedBy: recordedByName,
      recordedAt: now(),
    })
    toast.success('跟进计划已保存')
    setPlanContent('')
    setPlanDate('')
    setShowAddPlan(false)
  }

  return (
    <>
      <div className="p-3">
        {/* ── Plan Timeline ── */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">计划时间轴</span>
            {canEdit && (
              <button
                onClick={() => setShowAddPlan(true)}
                className="text-[10px] text-blue-500 font-medium interactive px-2 py-1 rounded-md bg-blue-50/50 flex items-center gap-1"
              >
                <Plus size={10} />添加跟进计划
              </button>
            )}
          </div>
          {planRecords.length === 0 ? (
            <p className="text-[10px] text-slate-400 py-4 text-center">暂无跟进计划</p>
          ) : (
            <div className="relative pl-5">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-blue-200" />
              <div className="space-y-3">
                {planRecords.map(record => {
                  const parsed = parsePlanContent(record.content)
                  return (
                    <div key={record.id} className="relative">
                      <div className="absolute left-[-14px] top-2 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-white" />
                      <div className="bg-blue-50/40 rounded-lg p-2.5 border border-blue-100">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-semibold text-slate-600">{record.recordedBy}</span>
                          <span className="text-[9px] text-slate-400 flex items-center gap-1">
                            <CalendarClock size={9} />{record.recordedAt}
                          </span>
                          {parsed.date && (
                            <span className="text-[9px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                              <CalendarClock size={9} />计划时间 {parsed.date}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{parsed.plan}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Follow Timeline ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">跟进时间轴</span>
            {canEdit && (
              <button
                onClick={() => setShowAddFollow(true)}
                className="text-[10px] text-blue-500 font-medium interactive px-2 py-1 rounded-md bg-blue-50/50 flex items-center gap-1"
              >
                <Plus size={10} />添加跟进
              </button>
            )}
          </div>
          {followRecords.length === 0 ? (
            <p className="text-[10px] text-slate-400 py-4 text-center">暂无跟进记录</p>
          ) : (
            <div className="relative pl-5">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
              <div className="space-y-3">
                {followRecords.map(record => (
                  <div key={record.id} className="relative">
                    <div className="absolute left-[-14px] top-2 w-2.5 h-2.5 rounded-full bg-slate-400 border-2 border-white" />
                    <div className="bg-white/60 rounded-lg p-2.5 border border-black/[0.03]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold text-slate-600">{record.recordedBy}</span>
                        <span className="text-[9px] text-slate-400 flex items-center gap-1">
                          <MessageSquare size={9} />{record.recordedAt}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{record.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Follow Plan Modal ── */}
      <GlassModal open={showAddPlan} onClose={() => { setShowAddPlan(false); setPlanContent(''); setPlanDate('') }} title="添加跟进计划">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 font-semibold block mb-1">计划内容 *</label>
            <textarea
              className="input-glass w-full h-28 resize-none"
              placeholder="填写跟进计划内容..."
              value={planContent}
              onChange={e => setPlanContent(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold block mb-1">计划时间</label>
            <input
              type="date"
              className="input-glass w-full text-xs"
              value={planDate}
              onChange={e => setPlanDate(e.target.value)}
            />
          </div>
          <button
            onClick={handleSavePlan}
            className="w-full py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg interactive"
          >
            保存跟进计划
          </button>
        </div>
      </GlassModal>

      {/* ── Add Follow Record Modal ── */}
      <GlassModal open={showAddFollow} onClose={() => { setShowAddFollow(false); setFollowContent('') }} title="添加跟进记录">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 font-semibold block mb-1">跟进内容 *</label>
            <textarea
              className="input-glass w-full h-28 resize-none"
              placeholder="记录跟进详情..."
              value={followContent}
              onChange={e => setFollowContent(e.target.value)}
            />
          </div>
          <button
            onClick={handleSaveFollow}
            className="w-full py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg interactive"
          >
            保存跟进记录
          </button>
        </div>
      </GlassModal>
    </>
  )
}
