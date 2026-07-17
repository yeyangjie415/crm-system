import { useState } from 'react'
import { toast } from 'sonner'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import GlassModal from '@/components/glass/GlassModal'
import { MessageSquare, Plus } from 'lucide-react'

interface FollowTimelineProps {
  projectId: string
  canEdit?: boolean
}

export default function FollowTimeline({ projectId, canEdit = true }: FollowTimelineProps) {
  const [showAdd, setShowAdd] = useState(false)
  const [content, setContent] = useState('')
  const [nextFollowUp, setNextFollowUp] = useState('')
  const [nextFollowUpDate, setNextFollowUpDate] = useState('')
  const { getFollowRecords, addFollowRecord } = useCustomers()
  const { user } = useAuth()
  const records = getFollowRecords(projectId)
  const recordedByName = user?.name || '当前用户'

  const resetForm = () => {
    setContent('')
    setNextFollowUp('')
    setNextFollowUpDate('')
  }

  const handleSave = () => {
    if (!content.trim() && !nextFollowUp.trim()) {
      toast.error('请填写跟进内容或下一步计划')
      return
    }
    const now = new Date()
    const recordedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    if (content.trim()) {
      addFollowRecord(projectId, {
        content: content.trim(),
        recordedBy: recordedByName,
        recordedAt,
      })
    }
    if (nextFollowUp.trim()) {
      addFollowRecord(projectId, {
        content: `📋 下一步计划：${nextFollowUp.trim()}${nextFollowUpDate ? ` (计划时间：${nextFollowUpDate})` : ''}`,
        recordedBy: recordedByName,
        recordedAt,
      })
    }
    toast.success('跟进记录已保存')
    resetForm()
    setShowAdd(false)
  }

  return (
    <>
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">跟进时间轴</span>
          {canEdit && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-[10px] text-blue-500 font-medium interactive px-2 py-1 rounded-md bg-blue-50/50 flex items-center gap-1"
            >
              <Plus size={10} />添加跟进
            </button>
          )}
        </div>
        {records.length === 0 ? (
          <p className="text-[10px] text-slate-400 py-6 text-center">暂无跟进记录</p>
        ) : (
          <div className="relative pl-5">
            {/* Timeline line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
            <div className="space-y-3">
              {records.map(record => (
                <div key={record.id} className="relative">
                  <div className="absolute left-[-14px] top-2 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-white" />
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

      <GlassModal open={showAdd} onClose={() => { setShowAdd(false); resetForm() }} title="添加跟进记录">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 font-semibold block mb-1">跟进内容 *</label>
            <textarea
              className="input-glass w-full h-28 resize-none"
              placeholder="记录跟进详情..."
              value={content}
              onChange={e => setContent(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold block mb-1">下一步跟进计划</label>
            <input
              className="input-glass w-full text-xs"
              placeholder="下一步计划（可选）"
              value={nextFollowUp}
              onChange={e => setNextFollowUp(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <input
              type="date"
              className="input-glass flex-1 text-xs"
              value={nextFollowUpDate}
              onChange={e => setNextFollowUpDate(e.target.value)}
            />
          </div>
          <button
            onClick={handleSave}
            className="w-full py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg interactive"
          >
            保存跟进记录
          </button>
        </div>
      </GlassModal>
    </>
  )
}
