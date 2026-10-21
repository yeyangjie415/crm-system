import { useState, useEffect, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import GlassCard from '@/components/glass/GlassCard'
import { useContracts } from '@/hooks/useContracts'
import { useCustomers } from '@/hooks/useCustomers'
import { useUsers } from '@/hooks/useUsers'
import { CUSTOMER_ATTRIBUTE_LABELS } from '@/types'
import type { Contract } from '@/types'
import { Pencil, Check, X, Building2, FileText, DollarSign, ChevronDown } from 'lucide-react'

interface Props {
  contract: Contract
  canEdit: boolean
}

/* ------------------------------------------------------------------ */
/*  tiny shared primitives                                            */
/* ------------------------------------------------------------------ */

function EditIcon({ onClick, title }: { onClick: () => void; title?: string }) {
  return (
    <button onClick={onClick} className="p-0.5 rounded text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors shrink-0" title={title || '编辑'}>
      <Pencil size={11} />
    </button>
  )
}

function SaveCancel({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1 shrink-0">
      <button onClick={onSave} className="p-0.5 rounded text-emerald-500 hover:bg-emerald-50" title="保存"><Check size={11} /></button>
      <button onClick={onCancel} className="p-0.5 rounded text-red-400 hover:bg-red-50" title="取消"><X size={11} /></button>
    </span>
  )
}

/* ------------------------------------------------------------------ */
/*  hook — state for a single inline field                            */
/* ------------------------------------------------------------------ */

function useInlineField(initial: string) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initial)
  const begin = () => { setDraft(initial); setEditing(true) }
  const cancel = () => setEditing(false)
  return { editing, draft, setDraft, begin, cancel, setEditing }
}

/* ================================================================== */

export default function DealDetail({ contract, canEdit }: Props) {
  const { updateContract } = useContracts()
  const { getCustomer } = useCustomers()
  const { users } = useUsers()
  const customer = getCustomer(contract.customerId)

  const fc = useInlineField(contract.isFirstContract ? 'yes' : 'no')
  const cd = useInlineField(contract.contractDate)
  const pa = useInlineField(String(contract.projectAmount))
  const sa = useInlineField(String(contract.settlementAmount))
  const ea = useInlineField(String(contract.extraAmount))

  /* ---- 归属人 picker ---- */
  const [editingOwner, setEditingOwner] = useState(false)
  const [showOwnerPicker, setShowOwnerPicker] = useState(false)
  const ownerPickerRef = useRef<HTMLDivElement>(null)

  // Owner can only be chosen from: creator + followers (accessControl) of the customer
  const ownerOptions = useMemo(() => {
    if (!customer) return []
    const seen = new Set<string>()
    const result: { id: string; name: string }[] = []
    // Creator always first
    if (customer.createdBy && !seen.has(customer.createdBy)) {
      seen.add(customer.createdBy)
      result.push({ id: customer.createdBy, name: customer.createdByName })
    }
    // Followers
    for (const ac of customer.accessControl || []) {
      if (!seen.has(ac.userId)) {
        seen.add(ac.userId)
        result.push({ id: ac.userId, name: ac.userName })
      }
    }
    // If current attributedTo is not in the list (legacy data), add them
    if (contract.attributedTo && !seen.has(contract.attributedTo)) {
      // Look up user name
      const u = users.find(x => x.id === contract.attributedTo)
      result.push({ id: contract.attributedTo, name: u?.name || contract.attributedToName })
    }
    return result
  }, [customer, contract.attributedTo, contract.attributedToName, users])

  useEffect(() => {
    if (!showOwnerPicker) return
    const handler = (e: MouseEvent) => {
      if (ownerPickerRef.current && !ownerPickerRef.current.contains(e.target as Node)) {
        setShowOwnerPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showOwnerPicker])

  const handleOwnerChange = (userId: string, userName: string) => {
    updateContract(contract.id, { attributedTo: userId, attributedToName: userName })
    setEditingOwner(false)
    setShowOwnerPicker(false)
    toast.success('归属人已更新')
  }

  const save = (field: string, value: string) => {
    const num = Number(value)
    const patch: Record<string, unknown> = {}
    switch (field) {
      case 'projectAmount':    patch.projectAmount = isNaN(num) ? 0 : num; break
      case 'settlementAmount': patch.settlementAmount = isNaN(num) ? 0 : num; break
      case 'extraAmount':      { const n = isNaN(num) ? 0 : num; patch.extraAmount = n; patch.extraTaxIncluded = n > 0 ? contract.extraTaxIncluded : false; } break
      case 'isFirstContract':  patch.isFirstContract = value === 'yes'; break
      case 'contractDate':     patch.contractDate = value; break
    }
    updateContract(contract.id, patch as any)
    toast.success('已更新')
    fc.setEditing(false); cd.setEditing(false); pa.setEditing(false); sa.setEditing(false); ea.setEditing(false)
  }

  const attr = contract.customerAttribute ? CUSTOMER_ATTRIBUTE_LABELS[contract.customerAttribute] : '公司'

  return (
    <div className="space-y-4">

      {/* ========== Customer Info ========== */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-slate-700 mb-3">客户信息</h3>
        <div className="grid grid-cols-2 gap-3">

          {/* company name — auto */}
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">公司名称</p>
            <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"><Building2 size={13} className="text-slate-400" />{contract.customerName}</p>
          </div>
          {/* project name — auto */}
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">项目名称</p>
            <p className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"><FileText size={13} className="text-slate-400" />{contract.projectName}</p>
          </div>
          {/* customer attribute — auto */}
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">客户属性</p>
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${contract.customerAttribute === 'individual' ? 'text-purple-500 bg-purple-50' : 'text-blue-500 bg-blue-50'}`}>{attr}</span>
          </div>
          {/* attributed to — editable by anyone who can edit, limited to creator+followers */}
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">归属人</p>
            {editingOwner && canEdit ? (
              <div ref={ownerPickerRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowOwnerPicker(!showOwnerPicker)}
                  className="input-glass w-full text-xs py-1.5 px-2 flex items-center justify-between text-left"
                >
                  <span className="text-slate-700">{contract.attributedToName}</span>
                  <ChevronDown size={12} className={`text-slate-400 transition-transform ${showOwnerPicker ? 'rotate-180' : ''}`} />
                </button>
                {showOwnerPicker && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-40 overflow-y-auto z-30">
                    {ownerOptions.length === 0 ? (
                      <p className="px-3 py-2 text-[10px] text-slate-400">无可选人员</p>
                    ) : (
                      ownerOptions.map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleOwnerChange(opt.id, opt.name)}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors ${
                            contract.attributedTo === opt.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-slate-600'
                          }`}
                        >
                          {opt.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
                <SaveCancel
                  onSave={() => setEditingOwner(false)}
                  onCancel={() => { setEditingOwner(false); setShowOwnerPicker(false) }}
                />
              </div>
            ) : (
              <span className="inline-flex items-center gap-1">
                <span className="text-xs text-slate-600">{contract.attributedToName}</span>
                {canEdit && <EditIcon onClick={() => setEditingOwner(true)} />}
              </span>
            )}
          </div>

          {/* isFirstContract — manual */}
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">首次合同</p>
            {fc.editing && canEdit ? (
              <span className="inline-flex items-center gap-1">
                <select value={fc.draft} onChange={e => fc.setDraft(e.target.value)} className="input-glass text-[10px] py-0.5 px-1">
                  <option value="no">否</option><option value="yes">是</option>
                </select>
                <SaveCancel onSave={() => save('isFirstContract', fc.draft)} onCancel={fc.cancel} />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${contract.isFirstContract ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>{contract.isFirstContract ? '是' : '否'}</span>
                {canEdit && <EditIcon onClick={fc.begin} />}
              </span>
            )}
          </div>

          {/* contractDate — manual */}
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-0.5">合同日期</p>
            {cd.editing && canEdit ? (
              <span className="inline-flex items-center gap-1">
                <input type="date" value={cd.draft} onChange={e => cd.setDraft(e.target.value)} className="input-glass text-[10px] py-0.5 px-1.5 w-36" />
                <SaveCancel onSave={() => save('contractDate', cd.draft)} onCancel={cd.cancel} />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <span className="text-xs text-slate-600">{contract.contractDate}</span>
                {canEdit && <EditIcon onClick={cd.begin} />}
              </span>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ========== Settlement ========== */}
      <GlassCard>
        <h3 className="text-xs font-semibold text-slate-700 mb-3">结算信息</h3>
        <div className="grid grid-cols-2 gap-3">

          {/* project amount */}
          <div className="p-2.5 rounded-lg bg-white/50 border border-black/3">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-[9px] text-slate-400">项目金额</p>
              {canEdit && !pa.editing && <EditIcon onClick={pa.begin} />}
            </div>
            {pa.editing && canEdit ? (
              <div className="flex items-center gap-1.5">
                <input type="number" value={pa.draft} onChange={e => pa.setDraft(e.target.value)} className="input-glass text-xs w-28" />
                <SaveCancel onSave={() => save('projectAmount', pa.draft)} onCancel={pa.cancel} />
              </div>
            ) : (
              <p className="text-sm font-mono font-semibold text-slate-800 tabular-nums flex items-center gap-1"><DollarSign size={12} className="text-slate-400" />¥{contract.projectAmount.toLocaleString()}</p>
            )}
          </div>

          {/* settlement amount */}
          <div className="p-2.5 rounded-lg bg-white/50 border border-black/3">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-[9px] text-slate-400">结算金额</p>
              {canEdit && !sa.editing && <EditIcon onClick={sa.begin} />}
            </div>
            {sa.editing && canEdit ? (
              <div className="flex items-center gap-1.5">
                <input type="number" value={sa.draft} onChange={e => sa.setDraft(e.target.value)} className="input-glass text-xs w-28" />
                <SaveCancel onSave={() => save('settlementAmount', sa.draft)} onCancel={sa.cancel} />
              </div>
            ) : (
              <p className="text-sm font-mono font-semibold text-slate-800 tabular-nums flex items-center gap-1"><DollarSign size={12} className="text-slate-400" />¥{contract.settlementAmount.toLocaleString()}</p>
            )}
          </div>
        </div>

        {/* extra amount block */}
        {(contract.extraAmount > 0 || (canEdit && ea.editing)) && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-50/50 border border-amber-100">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-1 mb-0.5">
                  <p className="text-[9px] text-amber-600 font-medium">高开金额</p>
                  {canEdit && !ea.editing && <EditIcon onClick={ea.begin} />}
                </div>
                {ea.editing && canEdit ? (
                  <div className="flex items-center gap-1.5">
                    <input type="number" value={ea.draft} onChange={e => ea.setDraft(e.target.value)} className="input-glass text-xs w-28" />
                    <SaveCancel onSave={() => save('extraAmount', ea.draft)} onCancel={ea.cancel} />
                  </div>
                ) : (
                  <p className="text-sm font-mono font-semibold text-amber-700 tabular-nums">¥{contract.extraAmount.toLocaleString()}</p>
                )}
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-0.5">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${contract.extraPaid ? 'text-emerald-500 bg-emerald-50' : 'text-amber-500 bg-amber-50'}`}>{contract.extraPaid ? '已支付' : '未支付'}</span>
                  {canEdit && (
                    <EditIcon onClick={() => {
                      const v = !contract.extraPaid
                      updateContract(contract.id, { extraPaid: v })
                      toast.success(v ? '已设为已支付' : '已设为未支付')
                    }} title="切换支付状态" />
                  )}
                </div>
                <div className="flex items-center justify-end gap-0.5 mt-0.5">
                  <p className="text-[9px] text-amber-500">{contract.extraTaxIncluded ? '含税' : '不含税'}</p>
                  {canEdit && (
                    <EditIcon onClick={() => {
                      const v = !contract.extraTaxIncluded
                      updateContract(contract.id, { extraTaxIncluded: v })
                      toast.success(v ? '已设为含税' : '已设为不含税')
                    }} title="切换含税" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
