import { useState, useRef, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import StatusBadge from '@/components/common/StatusBadge'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import type { Customer, FollowStatus } from '@/types'
import { canViewDetail } from '@/lib/permissions'
import { Tag, MessageSquare, Lock, RotateCcw } from 'lucide-react'

interface CustomerTableProps {
  customers: Customer[]
  selected: string[]
  onSelect: (ids: string[]) => void
}

export default function CustomerTable({ customers, selected, onSelect }: CustomerTableProps) {
  const navigate = useNavigate()
  const { getFollowRecords, addAnnotation, restoreCustomer } = useCustomers()
  const { user, isAdmin } = useAuth()
  const [expandedAnnotationId, setExpandedAnnotationId] = useState<string | null>(null)
  const [annotationText, setAnnotationText] = useState('')
  const [popoverStyle, setPopoverStyle] = useState<{ top: number; left: number } | null>(null)
  const tableWrapperRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const popoverRef = useRef<HTMLDivElement>(null)

  const recalcPopoverPosition = useCallback((customerId: string) => {
    const btn = buttonRefs.current.get(customerId)
    const wrapper = tableWrapperRef.current
    if (!btn || !wrapper) return
    const btnRect = btn.getBoundingClientRect()
    const wrapperRect = wrapper.getBoundingClientRect()
    setPopoverStyle({
      top: btnRect.top - wrapperRect.top,
      left: btnRect.left - wrapperRect.left - 264, // 256(w-64) + 8(间距)
    })
  }, [])

  useEffect(() => {
    if (!expandedAnnotationId) { setPopoverStyle(null); return }
    recalcPopoverPosition(expandedAnnotationId)
    const handleScroll = () => recalcPopoverPosition(expandedAnnotationId)
    window.addEventListener('scroll', handleScroll, true)
    window.addEventListener('resize', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll, true)
      window.removeEventListener('resize', handleScroll)
    }
  }, [expandedAnnotationId, recalcPopoverPosition])

  useEffect(() => {
    if (!expandedAnnotationId) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      const popover = popoverRef.current
      const btn = buttonRefs.current.get(expandedAnnotationId)
      if (popover && !popover.contains(target) && btn && !btn.contains(target)) {
        setExpandedAnnotationId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [expandedAnnotationId])

  const toggleSelect = (id: string) => {
    onSelect(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id])
  }

  const toggleAll = () => {
    onSelect(selected.length === customers.length ? [] : customers.map(c => c.id))
  }

  const formatAmount = (amount: number) => {
    if (amount >= 10000) return `¥${(amount / 10000).toFixed(1)}万`
    return `¥${amount.toLocaleString()}`
  }

  const getLatestFollowStatus = (customer: Customer): FollowStatus | null => {
    return getLatestProject(customer)?.followStatus ?? null
  }

  const getLatestProjectAmount = (customer: Customer): number | null => {
    return getLatestProject(customer)?.amount ?? null
  }

  const getLatestProject = (customer: Customer) => {
    const projects = customer.projects || []
    if (projects.length === 0) return null
    return projects.reduce((a, b) =>
      new Date(b.createdAt).getTime() > new Date(a.createdAt).getTime() ? b : a
    )
  }

  const getLatestProjectName = (customer: Customer): string | null => {
    return getLatestProject(customer)?.name ?? null
  }

  const getLatestFollowRecord = (customer: Customer): { content: string; recordedAt: string } | null => {
    const project = getLatestProject(customer)
    if (!project) return null
    const records = getFollowRecords(project.id)
    if (records.length === 0) return null
    const sorted = [...records].sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))
    return { content: sorted[0].content, recordedAt: sorted[0].recordedAt }
  }

  const handleSaveAnnotation = (customerId: string) => {
    if (!annotationText.trim()) {
      toast.error('请填写简标内容')
      return
    }
    const now = new Date()
    const annotatedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    addAnnotation(customerId, {
      content: annotationText.trim(),
      annotatedBy: user?.name || '当前用户',
      annotatedAt,
    })
    toast.success('简标已保存')
    setAnnotationText('')
    setExpandedAnnotationId(null)
  }

  return (
    <div className="glass-card overflow-visible" ref={tableWrapperRef}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="sticky top-0 z-5">
            <tr className="bg-white/60 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="text-left py-3 px-3 w-10">
                <input
                  type="checkbox"
                  checked={selected.length === customers.length && customers.length > 0}
                  onChange={toggleAll}
                  className="rounded border-slate-300"
                />
              </th>
              <th className="text-left py-3 px-3">客户名称</th>
              <th className="text-left py-3 px-3 hidden md:table-cell">跟进人</th>
              <th className="text-left py-3 px-3">项目名称</th>
              <th className="text-left py-3 px-3 hidden xl:table-cell">跟进时间轴</th>
              <th className="text-right py-3 px-3 hidden lg:table-cell">项目金额</th>
              <th className="text-center py-3 px-3">跟进状态</th>
              <th className="text-center py-3 px-3 whitespace-nowrap">查阅简标</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(customer => {
              const hasAccess = user ? canViewDetail(user.id, user.permissionLevel, customer) : false
              const isSoftDeleted = (customer.hiddenBy || []).length > 0
              const status = getLatestFollowStatus(customer)
              const amount = getLatestProjectAmount(customer)
              const projectName = getLatestProjectName(customer)
              return (
                <tr
                  key={customer.id}
                  className={`table-row border-b border-black/[0.02] text-xs ${isSoftDeleted ? 'opacity-60' : ''}`}
                >
                  <td className="py-3 px-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(customer.id)}
                      onChange={() => toggleSelect(customer.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="py-3 px-3">
                    {hasAccess ? (
                      <button
                        onClick={() => navigate(`/customers/${customer.id}`)}
                        className={`font-semibold hover:text-blue-500 transition-colors text-left ${isSoftDeleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}
                      >
                        {customer.name}
                      </button>
                    ) : (
                      <span className={`font-semibold text-slate-500 inline-flex items-center gap-1 ${isSoftDeleted ? 'line-through' : ''}`}>
                        <Lock size={10} className="text-slate-300" />
                        {customer.name}
                      </span>
                    )}
                    {isSoftDeleted && (
                      <span className="inline-flex items-center gap-1 ml-1.5 text-[9px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded">
                        已删除
                      </span>
                    )}
                    {isAdmin && isSoftDeleted && (
                      <button
                        onClick={(e) => { e.stopPropagation(); restoreCustomer(customer.id, user?.name || ''); toast.success(`已恢复客户「${customer.name}」`) }}
                        className="inline-flex items-center gap-0.5 ml-1 text-[9px] text-emerald-600 hover:text-emerald-700 interactive"
                        title="恢复客户"
                      >
                        <RotateCcw size={10} /> 恢复
                      </button>
                    )}
                    <div className="text-[10px] text-slate-400 mt-0.5">{customer.region}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-500 hidden md:table-cell">
                    {hasAccess && customer.accessControl.length > 0
                      ? `${customer.createdByName}、${customer.accessControl.map(a => a.userName).join('、')}`
                      : customer.createdByName
                    }
                  </td>
                  <td className="py-3 px-3 text-slate-600">
                    {hasAccess ? (projectName || <span className="text-slate-300">—</span>) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3 px-3 hidden xl:table-cell">
                    {hasAccess ? (() => {
                      const record = getLatestFollowRecord(customer)
                      if (!record) return <span className="text-slate-300 text-[10px]">—</span>
                      return (
                        <div className="flex items-start gap-1.5">
                          <MessageSquare size={10} className="text-slate-300 mt-0.5 shrink-0" />
                          <div className="text-[10px] text-slate-500 leading-relaxed min-w-0">
                            <p className="whitespace-normal break-all">{record.content}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{record.recordedAt}</p>
                          </div>
                        </div>
                      )
                    })() : <span className="text-slate-300 text-[10px]">—</span>}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs tabular-nums hidden lg:table-cell">
                    {hasAccess ? (amount ? formatAmount(amount) : <span className="text-slate-300">—</span>) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {hasAccess ? (status ? <StatusBadge status={status} /> : <span className="text-[10px] text-slate-300">—</span>) : <span className="text-[10px] text-slate-300">—</span>}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {hasAccess ? (
                      <button
                        ref={el => { if (el) buttonRefs.current.set(customer.id, el); else buttonRefs.current.delete(customer.id) }}
                        onClick={() => {
                          if (expandedAnnotationId === customer.id) {
                            setExpandedAnnotationId(null)
                          } else {
                            setExpandedAnnotationId(customer.id)
                            setAnnotationText('')
                          }
                        }}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-blue-500 transition-colors"
                        title="查阅简标"
                      >
                        <Tag size={14} />
                        {customer.annotations && customer.annotations.length > 0 && (
                          <span className="text-[9px] font-semibold bg-blue-100 text-blue-600 rounded-full px-1.5 py-0.5 leading-none">
                            {customer.annotations.length}
                          </span>
                        )}
                      </button>
                    ) : (
                      <span className="text-slate-300"><Tag size={14} /></span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {expandedAnnotationId && popoverStyle && (() => {
        const activeCustomer = customers.find(c => c.id === expandedAnnotationId)
        if (!activeCustomer) return null
        return (
          <div
            ref={popoverRef}
            className="absolute z-50 w-64 bg-white rounded-xl shadow-lg border border-slate-200 p-3 text-left"
            style={{ top: popoverStyle.top, left: popoverStyle.left }}
          >
            {(activeCustomer.annotations && activeCustomer.annotations.length > 0) ? (
              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                {[...(activeCustomer.annotations || [])].reverse().map(a => (
                  <div key={a.id} className="text-left bg-slate-50 rounded-lg p-2">
                    <p className="text-[10px] text-slate-600 leading-relaxed">{a.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-medium text-slate-500">{a.annotatedBy}</span>
                      <span className="text-[8px] text-slate-400">{a.annotatedAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 mb-3">暂无简标</p>
            )}
            <textarea
              className="input-glass w-full h-16 text-[10px] resize-none"
              placeholder="输入简标内容..."
              value={annotationText}
              onChange={e => setAnnotationText(e.target.value)}
            />
            <button
              onClick={() => handleSaveAnnotation(activeCustomer.id)}
              disabled={!annotationText.trim()}
              className="mt-2 w-full py-1.5 bg-blue-500 text-white text-[10px] font-semibold rounded-lg interactive disabled:opacity-50 disabled:cursor-not-allowed"
            >
              保存简标
            </button>
          </div>
        )
      })()}
    </div>
  )
}
