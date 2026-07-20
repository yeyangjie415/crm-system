import { useState, useRef, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import GlassPanel from '@/components/glass/GlassPanel'
import RegionSelector from '@/components/common/RegionSelector'
import { useCustomers } from '@/hooks/useCustomers'
import type { UpdateCustomerInput } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/hooks/useUsers'
import { isSuperAdmin, isCreator } from '@/lib/permissions'
import type { Customer, RegionValue } from '@/types'
import { CUSTOMER_TYPE_LABELS, CUSTOMER_POSITIONING_LABELS, CUSTOMER_ATTRIBUTE_LABELS, SHARE_PERMISSION_LABELS } from '@/types'
import type { CustomerType, CustomerPositioning, CustomerAttribute } from '@/types'
import { Building2, MapPin, Share2, Pencil, X, Check, UserCog, ChevronDown } from 'lucide-react'

interface CustomerInfoProps {
  customer: Customer
  canEdit: boolean
  canShare: boolean
  onOpenShare: () => void
}

export default function CustomerInfo({ customer, canEdit, canShare, onOpenShare }: CustomerInfoProps) {
  const { updateCustomer } = useCustomers()
  const { user } = useAuth()
  const { users } = useUsers()
  const [editing, setEditing] = useState(false)
  const lastRegionPrefix = useRef('')
  const [showUserPicker, setShowUserPicker] = useState(false)
  const userPickerRef = useRef<HTMLDivElement>(null)

  // Only super admin or the customer creator can reassign
  const canReassign = user && (isSuperAdmin(user.permissionLevel) || isCreator(user.id, customer))

  useEffect(() => {
    if (!showUserPicker) return
    const handler = (e: MouseEvent) => {
      if (userPickerRef.current && !userPickerRef.current.contains(e.target as Node)) {
        setShowUserPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showUserPicker])

  const handleRegionChange = useCallback((rv: RegionValue) => {
    setEditRegion(rv)
    const prefix = [rv.provinceName, rv.cityName, rv.districtName].filter(Boolean).join(' ')
    if (!prefix) return
    setEditDetailedAddress(prev => {
      if (lastRegionPrefix.current && prev.startsWith(lastRegionPrefix.current)) {
        return prefix + prev.slice(lastRegionPrefix.current.length)
      }
      return prefix + (prev ? ' ' + prev : '')
    })
    lastRegionPrefix.current = prefix
  }, [])

  const [editName, setEditName] = useState(customer.name)
  const [editType, setEditType] = useState<CustomerType>(customer.type)
  const [editPositioning, setEditPositioning] = useState<CustomerPositioning>(customer.positioning)
  const [editAttribute, setEditAttribute] = useState<CustomerAttribute>(customer.customerAttribute || 'company')
  const [editDetailedAddress, setEditDetailedAddress] = useState(customer.detailedAddress || '')
  const [editCreatedBy, setEditCreatedBy] = useState(customer.createdBy)
  const [editCreatedByName, setEditCreatedByName] = useState(customer.createdByName)
  const [editRegion, setEditRegion] = useState<RegionValue>({
    provinceCode: customer.provinceCode,
    provinceName: customer.provinceName,
    cityCode: customer.cityCode,
    cityName: customer.cityName,
    districtCode: customer.districtCode,
    districtName: customer.districtName,
  })

  const startEdit = () => {
    setEditName(customer.name)
    setEditType(customer.type)
    setEditPositioning(customer.positioning)
    setEditAttribute(customer.customerAttribute || 'company')
    setEditDetailedAddress(customer.detailedAddress || '')
    setEditCreatedBy(customer.createdBy)
    setEditCreatedByName(customer.createdByName)
    const initPrefix = [customer.provinceName, customer.cityName, customer.districtName].filter(Boolean).join(' ')
    lastRegionPrefix.current = initPrefix
    setEditRegion({
      provinceCode: customer.provinceCode,
      provinceName: customer.provinceName,
      cityCode: customer.cityCode,
      cityName: customer.cityName,
      districtCode: customer.districtCode,
      districtName: customer.districtName,
    })
    setEditing(true)
  }

  const cancelEdit = () => {
    setEditing(false)
  }

  const saveEdit = () => {
    if (!editName.trim()) {
      toast.error('请填写客户名称')
      return
    }
    const input: UpdateCustomerInput = {
      name: editName.trim(),
      type: editType,
      positioning: editPositioning,
      customerAttribute: editAttribute,
      provinceCode: editRegion.provinceCode,
      provinceName: editRegion.provinceName,
      cityCode: editRegion.cityCode,
      cityName: editRegion.cityName,
      districtCode: editRegion.districtCode,
      districtName: editRegion.districtName,
      detailedAddress: editDetailedAddress.trim() || undefined,
      createdBy: canReassign ? editCreatedBy : undefined,
      createdByName: canReassign ? editCreatedByName : undefined,
    }
    updateCustomer(customer.id, input)
    // No immediate success toast — hook shows error toast on API failure
    setEditing(false)
  }

  const regionDisplay = customer.provinceName
    ? `${customer.provinceName} ${customer.cityName || ''} ${customer.districtName || ''}`
    : customer.region

  if (editing) {
    return (
      <GlassPanel title="客户信息" className="relative z-20">
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">客户名称 *</label>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="input-glass w-full text-xs"
              placeholder="客户名称"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">客户类型</label>
              <select
                value={editType}
                onChange={e => setEditType(e.target.value as CustomerType)}
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
                value={editPositioning}
                onChange={e => setEditPositioning(e.target.value as CustomerPositioning)}
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
              <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">客户地区</label>
              <RegionSelector value={editRegion} onChange={handleRegionChange} />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">客户属性</label>
              <select
                value={editAttribute}
                onChange={e => setEditAttribute(e.target.value as CustomerAttribute)}
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
              value={editDetailedAddress}
              onChange={e => setEditDetailedAddress(e.target.value)}
              className="input-glass w-full text-xs"
              placeholder="例如：XX市XX区XX路XX号XX栋XX楼"
            />
          </div>
          {canReassign && (
            <div ref={userPickerRef}>
              <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">创建人</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserPicker(!showUserPicker)}
                  className="input-glass w-full text-xs py-2 px-3 flex items-center justify-between text-left"
                >
                  <span className={editCreatedByName ? 'text-slate-700' : 'text-slate-400'}>
                    {editCreatedByName || '选择用户'}
                  </span>
                  <ChevronDown size={12} className={`text-slate-400 transition-transform ${showUserPicker ? 'rotate-180' : ''}`} />
                </button>
                {showUserPicker && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-40 overflow-y-auto z-30">
                    {users.filter(u => !u.disabled).map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setEditCreatedBy(u.id)
                          setEditCreatedByName(u.name)
                          setShowUserPicker(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors flex items-center justify-between ${
                          editCreatedBy === u.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600'
                        }`}
                      >
                        <span>{u.name}</span>
                        <span className="text-[9px] text-slate-400">{u.role === 'general_manager' ? '总经理' : u.role === 'salesperson' ? '销售员' : u.role === 'technician' ? '技术员' : u.role === 'finance' ? '财务' : u.role === 'sales_assistant' ? '销售助理' : u.role}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={saveEdit}
              className="flex-1 py-2 text-xs font-semibold text-white bg-blue-500 rounded-lg interactive flex items-center justify-center gap-1"
            >
              <Check size={12} /> 保存
            </button>
            <button
              onClick={cancelEdit}
              className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg interactive flex items-center justify-center gap-1"
            >
              <X size={12} /> 取消
            </button>
          </div>
        </div>
      </GlassPanel>
    )
  }

  return (
    <GlassPanel
      title="客户信息"
      action={
        canEdit && (
          <button onClick={startEdit} className="nav-icon" title="编辑客户信息">
            <Pencil size={14} />
          </button>
        )
      }
    >
      <div className="space-y-4">
        <div className="border-b border-black/[0.04] pb-3">
          <div className="text-[10px] text-slate-400 mb-1">客户名称</div>
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-slate-400" />
            <span className="text-sm font-semibold text-slate-800">{customer.name}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] mb-0.5">客户地区</span>
            <div className="flex items-center gap-1 text-slate-700">
              <MapPin size={12} className="text-slate-400 shrink-0" />
              <span>{regionDisplay || '未填写'}</span>
            </div>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] mb-0.5">客户类型</span>
            <span className="text-slate-700">{CUSTOMER_TYPE_LABELS[customer.type]}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] mb-0.5">客户属性</span>
            <span className="text-slate-700">
              {customer.customerAttribute ? CUSTOMER_ATTRIBUTE_LABELS[customer.customerAttribute] : '—'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] mb-0.5">客户定位</span>
            <span className="text-slate-700">{CUSTOMER_POSITIONING_LABELS[customer.positioning]}</span>
          </div>
        </div>

        {customer.detailedAddress && (
          <div className="border-t border-black/[0.04] pt-3">
            <span className="text-slate-400 block text-[10px] mb-0.5">客户详细地址</span>
            <span className="text-slate-700 text-xs">{customer.detailedAddress}</span>
          </div>
        )}

        <div className="border-t border-black/[0.04] pt-3 grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] mb-0.5">创建时间</span>
            <span className="text-slate-700">{customer.createdAt}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] mb-0.5">创建人</span>
            <span className="text-slate-700">{customer.createdByName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] mb-0.5">跟进人</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-700">{customer.createdByName}</span>
              {customer.accessControl.map((ac, i) => (
                <span key={i} className="text-[9px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">
                  {ac.userName} ({SHARE_PERMISSION_LABELS[ac.permission]})
                </span>
              ))}
              {canShare && (
                <button onClick={onOpenShare} className="text-[10px] text-blue-500 hover:text-blue-600 flex items-center gap-0.5 interactive">
                  <Share2 size={10} /> 分享管理
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </GlassPanel>
  )
}
