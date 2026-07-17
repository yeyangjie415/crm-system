import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import GlassModal from '@/components/glass/GlassModal'
import { useTasks } from '@/hooks/useTasks'
import { useUsers } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import type { Task } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  task?: Task  // if provided, switches to edit mode
}

export default function OfficeTaskForm({ open, onClose, task }: Props) {
  const { user } = useAuth()
  const { users } = useUsers()
  const { addTask, updateTask } = useTasks()
  const isEditing = !!task

  const [assignee, setAssignee] = useState('')
  const [content, setContent] = useState('')
  const [deadline, setDeadline] = useState('')

  // Pre-fill when editing
  useEffect(() => {
    if (task) {
      setAssignee(task.assignedTo)
      setContent(task.content)
      setDeadline(task.deadline)
    } else {
      setAssignee('')
      setContent('')
      setDeadline('')
    }
  }, [task, open])

  const handleSubmit = () => {
    if (!assignee || !content || !deadline) {
      toast.error('请填写必填项')
      return
    }
    if (isEditing && task) {
      updateTask(task.id, {
        title: content.slice(0, 30),
        content: content.trim(),
        assignedTo: assignee,
        deadline,
        source: 'office',
      })
      toast.success('任务已更新')
    } else {
      addTask({
        title: content.slice(0, 30),
        content: content.trim(),
        assignedBy: user?.name || '未知用户',
        assignedTo: assignee,
        deadline,
        source: 'office',
      })
      toast.success('任务已分派，对方将收到提醒')
    }
    onClose()
  }

  return (
    <GlassModal open={open} onClose={onClose} title={isEditing ? '编辑任务' : '分派任务'}>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">指派给 *</label>
          <select value={assignee} onChange={e => setAssignee(e.target.value)} className="input-glass w-full text-xs">
            <option value="">请选择同事</option>
            {users.filter(u => !u.disabled).map(u => (
              <option key={u.id} value={u.name}>{u.name}（{u.username}）</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">任务内容 *</label>
          <textarea value={content} onChange={e => setContent(e.target.value)} className="input-glass w-full text-xs h-20 resize-none" placeholder="请描述任务内容和要求" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">截止时间 *</label>
          <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="input-glass w-full text-xs" />
        </div>
        <button onClick={handleSubmit} className="w-full py-2.5 text-xs font-semibold text-white bg-blue-500 rounded-lg interactive mt-2">
          发送任务
        </button>
      </div>
    </GlassModal>
  )
}
