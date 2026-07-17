import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { X, Plus } from 'lucide-react'
import GlassModal from '@/components/glass/GlassModal'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/hooks/useUsers'
import { CUSTOMER_TYPE_LABELS, CUSTOMER_POSITIONING_LABELS, CUSTOMER_ATTRIBUTE_LABELS } from '@/types'
import type { CustomerType, CustomerPositioning, CustomerAttribute } from '@/types'
import CustomerNameInput from '@/components/customer/CustomerNameInput'
import RegionSelector from '@/components/common/RegionSelector'
import type { RegionValue } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

interface ContactEntry {
  name: string
  phone: string
  position: string
  description: string
}

export default function CustomerForm({ open, onClose }: Props) {
  const { user } = useAuth()
  const { customers, addCustomer } = useCustomers()
  const { users } = useUsers()
  const activeUsers = users.filter(u => !u.disabled)

  const [name, setName] = useState('')
  const [type, setType] = useState<CustomerType>('owner')
  const [positioning, setPositioning] = useState<CustomerPositioning>('normal')
  const [customerAttribute, setCustomerAttribute] = useState<CustomerAttribute>('company')
  const [detailedAddress, setDetailedAddress] = useState('')
  const [createdByName, setCreatedByName] = useState(user?.name || '')
  const [contactEntries, setContactEntries] = useState<ContactEntry[]>([{ name: '', phone: '', position: '', description: '' }])
  const [isExactDuplicate, setIsExactDuplicate] = useState(false)
  const [regionValue, setRegionValue] = useState<RegionValue>({})
  const lastRegionPrefix = useRef('')

  const handleRegionChange = useCallback((rv: RegionValue) => {
    setRegionValue(rv)
    const prefix = [rv.provinceName, rv.cityName, rv.districtName].filter(Boolean).join(' ')
    if (!prefix) return
    setDetailedAddress(prev => {
      if (lastRegionPrefix.current && prev.startsWith(lastRegionPrefix.current)) {
        return prefix + prev.slice(lastRegionPrefix.current.length)
      }
      return prefix + (prev ? ' ' + prev : '')
    })
    lastRegionPrefix.current = prefix
  }, [])

  const addContactEntry = () => {
    setContactEntries(prev => [...prev, { name: '', phone: '', position: '', description: '' }])
  }

  const removeContactEntry = (index: number) => {
    setContactEntries(prev => prev.filter((_, i) => i !== index))
  }

  const updateContactEntry = (index: number, field: keyof ContactEntry, value: string) => {
    setContactEntries(prev => prev.map((entry, i) =>
      i === index ? { ...entry, [field]: value } : entry
    ))
  }

  const resetForm = () => {
    setName('')
    setType('owner')
    setPositioning('normal')
    setCustomerAttribute('company')
    setDetailedAddress('')
    setCreatedByName(user?.name || '')
    setContactEntries([{ name: '', phone: '', position: '', description: '' }])
    setIsExactDuplicate(false)
    setRegionValue({})
    lastRegionPrefix.current = ''
  }

  const doCreate = () => {
    const creatorName = createdByName.trim() || user?.name || '未知用户'
    addCustomer({
      name: name.trim(),
      region: '未填写',
      type,
      positioning,
      customerAttribute,
      provinceCode: regionValue.provinceCode,
      provinceName: regionValue.provinceName,
      cityCode: regionValue.cityCode,
      cityName: regionValue.cityName,
      districtCode: regionValue.districtCode,
      districtName: regionValue.districtName,
      detailedAddress: detailedAddress.trim() || undefined,
      createdBy: user?.id || 'unknown',
      createdByName: creatorName,
      contacts: contactEntries
        .filter(e => e.name.trim())
        .map(e => ({ name: e.name.trim(), phone: e.phone.trim(), position: e.position.trim(), description: e.description.trim() || undefined })),
    })
    toast.success('客户创建成功')
    resetForm()
    onClose()
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('请填写客户名称')
      return
    }
    doCreate()
  }

  return (
    <GlassModal open={open} onClose={onClose} title="新建客户">
      <div className="space-y-3">
        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">客户名称 *</label>
          <CustomerNameInput
            value={name}
            onChange={setName}
            customers={customers}
            currentUserId={user?.id || ''}
            currentUserName={user?.name || ''}
            onExactMatchChange={setIsExactDuplicate}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">客户类型</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as CustomerType)}
              className="input-glass w-full text-xs"
            >
              {Object.entries(CUSTOMER_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">客户定位</label>
            <select
              value={positioning}
              onChange={e => setPositioning(e.target.value as CustomerPositioning)}
              className="input-glass w-full text-xs"
            >
              {Object.entries(CUSTOMER_POSITIONING_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">客户地区 *</label>
            <RegionSelector
              value={regionValue}
              onChange={handleRegionChange}
              required
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">客户属性</label>
            <select
              value={customerAttribute}
              onChange={e => setCustomerAttribute(e.target.value as CustomerAttribute)}
              className="input-glass w-full text-xs"
            >
              {Object.entries(CUSTOMER_ATTRIBUTE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">客户详细地址</label>
          <input
            value={detailedAddress}
            onChange={e => setDetailedAddress(e.target.value)}
            className="input-glass w-full text-xs"
            placeholder="例如：XX市XX区XX路XX号XX栋XX楼"
          />
        </div>

        <div>
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">创建人</label>
          <select
            value={createdByName}
            onChange={e => setCreatedByName(e.target.value)}
            className="input-glass w-full text-xs"
          >
            <option value="">请选择创建人</option>
            {activeUsers.map(u => (
              <option key={u.id} value={u.name}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Contacts section */}
        <div className="pt-1 border-t border-black/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">联系人</span>
            <button
              type="button"
              onClick={addContactEntry}
              className="text-[10px] text-blue-500 font-medium flex items-center gap-1 interactive"
            >
              <Plus size={10} /> 添加
            </button>
          </div>
          {contactEntries.map((entry, i) => (
            <div key={i} className="mb-2">
              <div className="flex gap-2 items-start">
                <input
                  value={entry.name}
                  onChange={e => updateContactEntry(i, 'name', e.target.value)}
                  className="input-glass flex-1 text-xs"
                  placeholder="姓名"
                />
                <input
                  value={entry.phone}
                  onChange={e => updateContactEntry(i, 'phone', e.target.value)}
                  className="input-glass w-28 text-xs"
                  placeholder="电话"
                />
                <input
                  value={entry.position}
                  onChange={e => updateContactEntry(i, 'position', e.target.value)}
                  className="input-glass w-20 text-xs"
                  placeholder="职位"
                />
                <button
                  type="button"
                  onClick={() => removeContactEntry(i)}
                  className="p-1.5 text-slate-300 hover:text-red-400 shrink-0"
                  title="移除"
                >
                  <X size={12} />
                </button>
              </div>
              <input
                value={entry.description}
                onChange={e => updateContactEntry(i, 'description', e.target.value)}
                className="input-glass w-full text-xs mt-1"
                placeholder="联系人描述（选填）"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isExactDuplicate || !name.trim()}
          className="w-full py-2.5 text-xs font-semibold text-white bg-blue-500 rounded-lg interactive mt-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          创建客户
        </button>
      </div>
    </GlassModal>
  )
}
