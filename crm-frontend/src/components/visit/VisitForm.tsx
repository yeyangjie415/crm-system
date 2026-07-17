import { useState, useMemo, useEffect } from 'react'
import { toast } from 'sonner'
import GlassModal from '@/components/glass/GlassModal'
import { useVisits } from '@/hooks/useVisits'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import { canViewInList } from '@/lib/permissions'
import type { Visit } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
  visit?: Visit  // if provided, switches to edit mode
}

export default function VisitForm({ open, onClose, visit }: Props) {
  const { user, isAdmin } = useAuth()
  const { customers: allCustomers } = useCustomers()
  const customers = useMemo(() =>
    isAdmin ? allCustomers : allCustomers.filter(c => !c.deleted && canViewInList(user?.id || '', user?.permissionLevel || 'general', c)),
    [allCustomers, isAdmin, user?.id, user?.permissionLevel])
  const { addVisit, updateVisit } = useVisits()
  const isEditing = !!visit

  const [date, setDate] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [location, setLocation] = useState('')
  const [contact, setContact] = useState('')
  const [duration, setDuration] = useState('')

  // Pre-fill when editing
  useEffect(() => {
    if (visit) {
      setDate(visit.date)
      setCustomerId(visit.customerId)
      setLocation(visit.location)
      setContact(visit.contact)
      setDuration(String(visit.duration))
    } else {
      setDate('')
      setCustomerId('')
      setLocation('')
      setContact('')
      setDuration('')
    }
  }, [visit, open])

  const selectedCustomer = customers.find(c => c.id === customerId)

  const handleCustomerChange = (id: string) => {
    setCustomerId(id)
    const c = customers.find(c => c.id === id)
    if (c) {
      setLocation(c.detailedAddress || c.region)
      setContact(c.contacts[0]?.name || '')
    }
  }

  const handleSubmit = () => {
    if (!date || !customerId || !location) {
      toast.error('请填写必填项')
      return
    }
    const c = customers.find(c => c.id === customerId)
    const data = {
      date: date.replace('T', ' '),
      salesperson: user?.name || '未知用户',
      customerId,
      customerName: c?.name || '',
      location,
      contact: contact || '未填写',
      duration: Number(duration) || 0,
    }
    if (isEditing && visit) {
      updateVisit(visit.id, data)
      toast.success('拜访记录已更新')
    } else {
      addVisit(data)
      toast.success('拜访记录已添加')
    }
    onClose()
  }

  return (
    <GlassModal open={open} onClose={onClose} title={isEditing ? '编辑拜访' : '新增拜访'}>
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">拜访时间 *</label>
          <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="input-glass w-full text-xs" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">客户名称 *</label>
          <select value={customerId} onChange={e => handleCustomerChange(e.target.value)} className="input-glass w-full text-xs">
            <option value="">请选择客户</option>
            {customers.filter(c => !c.deleted).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">地点 *</label>
          <input value={location} onChange={e => setLocation(e.target.value)} className="input-glass w-full text-xs" placeholder="拜访地址" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">联系人</label>
          <input value={contact} onChange={e => setContact(e.target.value)} className="input-glass w-full text-xs" placeholder="联系人姓名" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">时长（小时）</label>
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="input-glass w-full text-xs" placeholder="拜访时长" step="0.5" min="0" />
        </div>
        <button onClick={handleSubmit} className="w-full py-2.5 text-xs font-semibold text-white bg-blue-500 rounded-lg interactive mt-2">
          提交拜访记录
        </button>
      </div>
    </GlassModal>
  )
}
