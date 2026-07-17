import { useState } from 'react'
import { toast } from 'sonner'
import { MapPin, Clock, User, Edit3, Trash2 } from 'lucide-react'
import { useVisits } from '@/hooks/useVisits'
import { useAuth } from '@/hooks/useAuth'
import VisitForm from '@/components/visit/VisitForm'
import type { Visit } from '@/types'

export default function VisitTable({ visits: propVisits, selected, onSelect }: {
  visits?: Visit[]
  selected?: string[]
  onSelect?: (ids: string[]) => void
}) {
  const { visits: hookVisits, deleteVisit } = useVisits()
  const visits = propVisits ?? hookVisits
  const { user } = useAuth()
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null)
  const sel = selected ?? []
  const setSel = onSelect ?? (() => {})

  const toggleSelect = (id: string) => setSel(sel.includes(id) ? sel.filter(s => s !== id) : [...sel, id])
  const toggleAll = () => setSel(sel.length === visits.length ? [] : visits.map(v => v.id))

  const canEditOrDelete = (v: Visit) => v.salesperson === user?.name

  const handleDelete = (v: Visit) => {
    if (window.confirm(`确定删除拜访「${v.customerName}」的记录？`)) {
      deleteVisit(v.id)
      toast.success('拜访记录已删除')
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-black/5 sticky top-0 z-5 bg-white/80">
            <th className="text-left py-2 px-3 w-10">
              <input type="checkbox" checked={sel.length === visits.length && visits.length > 0} onChange={toggleAll} className="rounded border-slate-300" />
            </th>
            <th className="text-left py-2 px-3">拜访时间</th>
            <th className="text-left py-2 px-3">销售人员</th>
            <th className="text-left py-2 px-3">客户名称</th>
            <th className="text-left py-2 px-3 hidden sm:table-cell">地点</th>
            <th className="text-left py-2 px-3 hidden md:table-cell">联系人</th>
            <th className="text-center py-2 px-3">时长</th>
            <th className="text-center py-2 px-3">操作</th>
          </tr>
        </thead>
        <tbody>
          {visits.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-xs text-slate-400">暂无拜访记录</td>
            </tr>
          ) : (
            visits.map(v => (
              <tr key={v.id} className={`table-row border-b border-black/[0.02] text-xs ${sel.includes(v.id) ? 'bg-blue-50/30' : ''}`}>
                <td className="py-2.5 px-3">
                  <input type="checkbox" checked={sel.includes(v.id)} onChange={() => toggleSelect(v.id)} className="rounded border-slate-300" />
                </td>
                <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">{v.date}</td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <User size={12} className="text-slate-400" />
                    <span className="font-medium text-slate-700">{v.salesperson}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 font-medium text-slate-700">{v.customerName}</td>
                <td className="py-2.5 px-3 text-slate-500 hidden sm:table-cell">
                  <div className="flex items-center gap-1">
                    <MapPin size={11} className="text-slate-300 shrink-0" />
                    <span className="truncate max-w-[120px]">{v.location}</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-slate-600 hidden md:table-cell">{v.contact}</td>
                <td className="py-2.5 px-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock size={11} className="text-slate-400" />
                    <span className="font-mono text-xs font-medium text-slate-700">{v.duration}h</span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center">
                  {canEditOrDelete(v) && (
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setEditingVisit(v)} className="text-[9px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium interactive flex items-center gap-0.5">
                        <Edit3 size={9} /> 编辑
                      </button>
                      <button onClick={() => handleDelete(v)} className="text-[9px] text-red-400 bg-red-50 px-1.5 py-0.5 rounded font-medium interactive flex items-center gap-0.5">
                        <Trash2 size={9} /> 删除
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {editingVisit && (
        <VisitForm open={!!editingVisit} onClose={() => setEditingVisit(null)} visit={editingVisit} />
      )}
    </div>
  )
}
