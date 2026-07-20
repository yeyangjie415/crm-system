import { useState } from 'react'
import { toast } from 'sonner'
import GlassPanel from '@/components/glass/GlassPanel'
import GlassModal from '@/components/glass/GlassModal'
import StatusBadge from '@/components/common/StatusBadge'
import FollowTimeline from './FollowTimeline'
import { useCustomers } from '@/hooks/useCustomers'
import type { UpdateProjectInput } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import type { Project, Contact, FollowStatus, ReportStatus } from '@/types'
import { REPORT_STATUS_LABELS, FOLLOW_STATUS_LABELS } from '@/types'
import { ChevronDown, ChevronUp, Clock, DollarSign, Pencil, Trash2 } from 'lucide-react'

interface ProjectListProps {
  projects: Project[]
  customerId: string
  customerName: string
  contacts: Contact[]
  canEdit: boolean
}

export default function ProjectList({ projects, customerId, customerName, contacts, canEdit }: ProjectListProps) {
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [contactId, setContactId] = useState('')
  const [reportStatus, setReportStatus] = useState<ReportStatus>('exclusive')
  const [followStatus, setFollowStatus] = useState<FollowStatus>('following')
  const [amount, setAmount] = useState('')
  const [nextFollowUp, setNextFollowUp] = useState('')
  const [nextFollowUpDate, setNextFollowUpDate] = useState('')
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editProjectName, setEditProjectName] = useState('')
  const [editContactId, setEditContactId] = useState('')
  const [editReportStatus, setEditReportStatus] = useState<ReportStatus>('exclusive')
  const [editFollowStatus, setEditFollowStatus] = useState<FollowStatus>('following')
  const [editAmount, setEditAmount] = useState('')
  const [editNextFollowUp, setEditNextFollowUp] = useState('')
  const [editNextFollowUpDate, setEditNextFollowUpDate] = useState('')
  const { addProject, updateProject, deleteProject, addFollowRecord } = useCustomers()
  const today = new Date().toISOString().slice(0, 10)
  const { user } = useAuth()

  const formatContactDisplay = (ct: Contact) => `${ct.name} ${ct.position} ${ct.phone}`

  const resetForm = () => {
    setProjectName('')
    setContactId('')
    setReportStatus('exclusive')
    setFollowStatus('following')
    setAmount('')
    setNextFollowUp('')
    setNextFollowUpDate('')
  }

  const handleAddProject = () => {
    if (!projectName.trim()) {
      toast.error('请填写项目名称')
      return
    }
    const selectedContact = contacts.find(c => c.id === contactId)
    const contactDisplay = selectedContact ? formatContactDisplay(selectedContact) : undefined
    const newProject = addProject(customerId, {
      name: projectName.trim(),
      customerName,
      contactName: contactDisplay,
      reportStatus,
      followStatus,
      amount: Number(amount) || 0,
      nextFollowUp: nextFollowUp.trim() || undefined,
      nextFollowUpDate: nextFollowUpDate || undefined,
      createdBy: user?.name || '未知用户',
    })
    // Sync follow-up plan as a follow record
    if (nextFollowUp.trim()) {
      const now = new Date()
      const recordedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      addFollowRecord(newProject.id, {
        content: `📋 创建项目时设定跟进计划：${nextFollowUp.trim()}${nextFollowUpDate ? ` (计划时间：${nextFollowUpDate})` : ''}`,
        recordedBy: user?.name || '未知用户',
        recordedAt,
      })
    }
    toast.success('项目已添加')
    resetForm()
    setShowAdd(false)
  }

  const openEditModal = (project: Project) => {
    setEditingProject(project)
    setEditProjectName(project.name)
    const matchedContact = contacts.find(c => project.contactName && formatContactDisplay(c) === project.contactName)
    setEditContactId(matchedContact?.id || '')
    setEditReportStatus(project.reportStatus)
    setEditFollowStatus(project.followStatus)
    setEditAmount(String(project.amount || ''))
    setEditNextFollowUp(project.nextFollowUp || '')
    setEditNextFollowUpDate(project.nextFollowUpDate || '')
  }

  const handleUpdateProject = () => {
    if (!editingProject) return
    if (!editProjectName.trim()) {
      toast.error('请填写项目名称')
      return
    }
    const selectedContact = contacts.find(c => c.id === editContactId)
    const contactDisplay = selectedContact ? formatContactDisplay(selectedContact) : undefined
    const input: UpdateProjectInput = {
      name: editProjectName.trim(),
      contactName: contactDisplay,
      reportStatus: editReportStatus,
      followStatus: editFollowStatus,
      amount: Number(editAmount) || 0,
      nextFollowUp: editNextFollowUp.trim() || undefined,
      nextFollowUpDate: editNextFollowUpDate || undefined,
    }
    updateProject(customerId, editingProject.id, input)
    toast.success('项目已更新')
    setEditingProject(null)
  }

  const handleDeleteProject = (project: Project) => {
    if (!window.confirm(`确定要删除项目「${project.name}」吗？删除后该项目下的跟进记录也将一并清除。此操作不可撤销。`)) return
    deleteProject(customerId, project.id)
    toast.success('项目已删除')
    if (expandedProject === project.id) setExpandedProject(null)
    if (editingProject?.id === project.id) setEditingProject(null)
  }

  const formatAmount = (amount: number) => {
    if (amount >= 10000) return `¥${(amount / 10000).toFixed(1)}万`
    return `¥${amount.toLocaleString()}`
  }

  const reportColor = (status: string) => {
    switch (status) {
      case 'exclusive': return 'bg-green-50 text-green-600'
      case 'joint': return 'bg-amber-50 text-amber-600'
      case 'failed': return 'bg-red-50 text-red-500'
      default: return 'bg-slate-50 text-slate-500'
    }
  }

  return (
    <>
      <GlassPanel
      title={`项目信息 (${projects.length})`}
      action={
        canEdit ? (
          <button
            onClick={() => setShowAdd(true)}
            className="text-[10px] text-blue-500 font-medium interactive px-2 py-1 rounded-md bg-blue-50/50"
          >
            ＋ 添加项目
          </button>
        ) : undefined
      }
    >
      {projects.length === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">暂无项目，点击上方按钮添加</p>
      ) : (
        <div className="space-y-3">
          {projects.map(project => {
            const isExpanded = expandedProject === project.id
            return (
              <div key={project.id} className="rounded-lg border border-black/[0.04] bg-white/40 overflow-hidden">
                <button
                  onClick={() => setExpandedProject(isExpanded ? null : project.id)}
                  className="w-full p-3 flex items-center gap-3 text-left hover:bg-white/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-800 truncate">{project.name}</span>
                      <StatusBadge status={project.followStatus} />
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 flex-wrap">
                      <span className={`px-1.5 py-0.5 rounded ${reportColor(project.reportStatus)}`}>
                        {REPORT_STATUS_LABELS[project.reportStatus]}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign size={10} />{formatAmount(project.amount)}
                      </span>
                      {project.contactName && (
                        <span className="text-slate-400 truncate max-w-[200px]">{project.contactName}</span>
                      )}
                      <span className="text-slate-300">创建人 {project.createdBy} · {project.createdAt}</span>
                    </div>
                  </div>
                  {project.nextFollowUp && (
                    <span className="text-[9px] text-slate-400 flex items-center gap-1 shrink-0">
                      <Clock size={9} />{project.nextFollowUpDate}
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={14} className="text-slate-400 shrink-0" /> : <ChevronDown size={14} className="text-slate-400 shrink-0" />}
                  {canEdit && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); openEditModal(project) }}
                        className="p-1 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-500 interactive shrink-0"
                        title="编辑项目"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteProject(project) }}
                        className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 interactive shrink-0"
                        title="删除项目"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </button>
                {isExpanded && (
                  <div className="border-t border-black/[0.04]">
                    <FollowTimeline projectId={project.id} canEdit={canEdit} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </GlassPanel>

      <GlassModal open={editingProject !== null} onClose={() => setEditingProject(null)} title="编辑项目">
        {editingProject && (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">项目名称 *</label>
              <input
                className="input-glass w-full text-xs"
                placeholder="输入项目名称"
                value={editProjectName}
                onChange={e => setEditProjectName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">联系人</label>
              {contacts.length === 0 ? (
                <p className="text-[10px] text-slate-400 py-1.5">暂无联系人，请先在客户信息中添加</p>
              ) : (
                <select
                  value={editContactId}
                  onChange={e => setEditContactId(e.target.value)}
                  className="input-glass w-full text-xs"
                >
                  <option value="">不选择联系人</option>
                  {contacts.map(ct => (
                    <option key={ct.id} value={ct.id}>{ct.name} — {ct.position} — {ct.phone}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">报备情况</label>
                <select
                  value={editReportStatus}
                  onChange={e => setEditReportStatus(e.target.value as ReportStatus)}
                  className="input-glass w-full text-xs"
                >
                  {Object.entries(REPORT_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">跟进状态</label>
                <select
                  value={editFollowStatus}
                  onChange={e => setEditFollowStatus(e.target.value as FollowStatus)}
                  className="input-glass w-full text-xs"
                >
                  {Object.entries(FOLLOW_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">项目金额</label>
              <input
                type="number"
                className="input-glass w-full text-xs"
                placeholder="请输入金额"
                value={editAmount}
                onChange={e => setEditAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">下一步跟进计划</label>
              <input
                className="input-glass w-full text-xs"
                placeholder="计划内容（可选）"
                value={editNextFollowUp}
                onChange={e => setEditNextFollowUp(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">计划时间</label>
              <input
                type="date"
                className="input-glass w-full text-xs"
                value={editNextFollowUpDate}
                onChange={e => setEditNextFollowUpDate(e.target.value)}
              />
            </div>
            <button
              onClick={handleUpdateProject}
              className="w-full py-2.5 text-xs font-semibold text-white bg-blue-500 rounded-lg interactive mt-2"
            >
              保存修改
            </button>
          </div>
        )}
      </GlassModal>

      <GlassModal open={showAdd} onClose={() => { setShowAdd(false); resetForm() }} title="添加项目">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">项目名称 *</label>
            <input
              className="input-glass w-full text-xs"
              placeholder="输入项目名称"
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">联系人</label>
            {contacts.length === 0 ? (
              <p className="text-[10px] text-slate-400 py-1.5">暂无联系人，请先在客户信息中添加</p>
            ) : (
              <select
                value={contactId}
                onChange={e => setContactId(e.target.value)}
                className="input-glass w-full text-xs"
              >
                <option value="">不选择联系人</option>
                {contacts.map(ct => (
                  <option key={ct.id} value={ct.id}>{ct.name} — {ct.position} — {ct.phone}</option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">报备情况</label>
              <select
                value={reportStatus}
                onChange={e => setReportStatus(e.target.value as ReportStatus)}
                className="input-glass w-full text-xs"
              >
                {Object.entries(REPORT_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">跟进状态</label>
              <select
                value={followStatus}
                onChange={e => setFollowStatus(e.target.value as FollowStatus)}
                className="input-glass w-full text-xs"
              >
                {Object.entries(FOLLOW_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">项目金额</label>
            <input
              type="number"
              className="input-glass w-full text-xs"
              placeholder="请输入金额"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">创建时间</label>
            <input
              className="input-glass w-full text-xs text-slate-400 bg-white/30"
              value={today}
              readOnly
              disabled
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">下一步跟进计划</label>
            <input
              className="input-glass w-full text-xs"
              placeholder="计划内容（可选）"
              value={nextFollowUp}
              onChange={e => setNextFollowUp(e.target.value)}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">计划时间</label>
            <input
              type="date"
              className="input-glass w-full text-xs"
              value={nextFollowUpDate}
              onChange={e => setNextFollowUpDate(e.target.value)}
            />
          </div>
          <button
            onClick={handleAddProject}
            className="w-full py-2.5 text-xs font-semibold text-white bg-blue-500 rounded-lg interactive mt-2"
          >
            添加项目
          </button>
        </div>
      </GlassModal>
    </>
  )
}
