import { useState, useMemo, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { X, Plus, Search } from 'lucide-react'
import GlassModal from '@/components/glass/GlassModal'
import { useContracts } from '@/hooks/useContracts'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import { canViewInList } from '@/lib/permissions'
import { CUSTOMER_ATTRIBUTE_LABELS } from '@/types'
import type { CustomerAttribute } from '@/types'

interface Props {
  open: boolean
  onClose: () => void
}

interface PaymentEntry {
  condition: string
  amount: string
}

export default function ContractForm({ open, onClose }: Props) {
  const { addContract } = useContracts()
  const { customers: allCustomers } = useCustomers()
  const { user, isAdmin } = useAuth()

  const customers = useMemo(() =>
    isAdmin ? allCustomers : allCustomers.filter(c => !c.deleted && canViewInList(user?.id || '', user?.permissionLevel || 'general', c)),
    [allCustomers, isAdmin, user?.id, user?.permissionLevel])

  const [projectQuery, setProjectQuery] = useState('')
  const [projectOpen, setProjectOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<{
    projectId: string
    projectName: string
    customerId: string
    customerName: string
    customerAttribute: CustomerAttribute
    amount: number
  } | null>(null)

  const [projectAmount, setProjectAmount] = useState('')
  const [settlementAmount, setSettlementAmount] = useState('')
  const [extraAmount, setExtraAmount] = useState('')
  const [extraTaxIncluded, setExtraTaxIncluded] = useState(false)
  const [isFirstContract, setIsFirstContract] = useState(false)
  const [contractDate, setContractDate] = useState(new Date().toISOString().slice(0, 10))
  const [paymentEntries, setPaymentEntries] = useState<PaymentEntry[]>([{ condition: '', amount: '' }])

  const projectRef = useRef<HTMLDivElement>(null)

  // Search projects across all customers
  const allProjects = useMemo(() => {
    return customers.flatMap(c =>
      c.projects.map(p => ({
        projectId: p.id,
        projectName: p.name,
        customerId: c.id,
        customerName: c.name,
        customerAttribute: c.customerAttribute || 'company' as CustomerAttribute,
        amount: p.amount,
      }))
    )
  }, [customers])

  const filteredProjects = useMemo(() => {
    if (!projectQuery.trim()) return allProjects.slice(0, 20)
    const q = projectQuery.toLowerCase()
    const scored = allProjects
      .map(p => {
        const nameLower = p.projectName.toLowerCase()
        const custLower = p.customerName.toLowerCase()
        let score = 0
        if (nameLower === q) score = 100
        else if (nameLower.startsWith(q)) score = 80
        else if (nameLower.includes(q)) score = 60
        else if (custLower.includes(q)) score = 40
        return { ...p, score }
      })
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
    return scored.slice(0, 20)
  }, [allProjects, projectQuery])

  useEffect(() => {
    if (!projectOpen) return
    const handler = (e: MouseEvent) => {
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) {
        setProjectOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [projectOpen])

  const selectProject = (p: typeof allProjects[number]) => {
    setSelectedProject(p)
    setProjectQuery(p.projectName)
    setProjectOpen(false)
    setProjectAmount(String(p.amount))
  }

  const addPaymentEntry = () => {
    setPaymentEntries(prev => [...prev, { condition: '', amount: '' }])
  }

  const removePaymentEntry = (index: number) => {
    setPaymentEntries(prev => prev.filter((_, i) => i !== index))
  }

  const updatePaymentEntry = (index: number, field: keyof PaymentEntry, value: string) => {
    setPaymentEntries(prev => prev.map((e, i) =>
      i === index ? { ...e, [field]: value } : e
    ))
  }

  const resetForm = () => {
    setProjectQuery('')
    setSelectedProject(null)
    setProjectAmount('')
    setSettlementAmount('')
    setExtraAmount('')
    setExtraTaxIncluded(false)
    setIsFirstContract(false)
    setContractDate(new Date().toISOString().slice(0, 10))
    setPaymentEntries([{ condition: '', amount: '' }])
  }

  const handleSubmit = () => {
    if (!selectedProject) {
      toast.error('请选择关联项目')
      return
    }
    if (!contractDate) {
      toast.error('请选择合同日期')
      return
    }
    const payments = paymentEntries.filter(e => e.condition.trim())
    if (payments.length === 0) {
      toast.error('请至少填写一条收款计划')
      return
    }
    for (const p of payments) {
      if (!p.amount.trim() || isNaN(Number(p.amount))) {
        toast.error('请填写正确的收款金额')
        return
      }
    }

    addContract({
      projectId: selectedProject.projectId,
      projectName: selectedProject.projectName,
      customerId: selectedProject.customerId,
      customerName: selectedProject.customerName,
      contractDate,
      attributedTo: user?.id || 'unknown',
      attributedToName: user?.name || '未知用户',
      projectAmount: Number(projectAmount) || selectedProject.amount,
      settlementAmount: Number(settlementAmount) || 0,
      extraAmount: Number(extraAmount) || 0,
      extraTaxIncluded: extraAmount ? extraTaxIncluded : false,
      customerAttribute: selectedProject.customerAttribute,
      isFirstContract,
      payments: payments.map(p => ({
        condition: p.condition.trim(),
        amount: Number(p.amount),
        completed: false,
      })),
    })
    toast.success('成交信息已添加')
    resetForm()
    onClose()
  }

  return (
    <GlassModal open={open} onClose={onClose} title="添加成交信息">
      <div className="space-y-3">
        {/* A. 项目名称 */}
        <div ref={projectRef} className="relative">
          <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">项目名称 *</label>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={projectQuery}
              onChange={e => { setProjectQuery(e.target.value); setProjectOpen(true); if (selectedProject) setSelectedProject(null) }}
              onFocus={() => setProjectOpen(true)}
              className="input-glass w-full text-xs pl-8"
              placeholder="输入项目名称搜索..."
            />
          </div>
          {projectOpen && filteredProjects.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 glass-card rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto border border-white/80">
              {filteredProjects.map(p => (
                <button
                  key={p.projectId}
                  onClick={() => selectProject(p)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 transition-colors border-b border-black/[0.03] last:border-0"
                >
                  <span className="font-medium text-slate-700">{p.projectName}</span>
                  <span className="text-slate-400 ml-2">— {p.customerName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* B. 公司名称 + F. 客户属性 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">公司名称</label>
            <input
              value={selectedProject?.customerName || ''}
              readOnly
              className="input-glass w-full text-xs bg-white/30 text-slate-500"
              placeholder="选择项目后自动匹配"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">客户属性</label>
            <input
              value={selectedProject ? CUSTOMER_ATTRIBUTE_LABELS[selectedProject.customerAttribute] : ''}
              readOnly
              className="input-glass w-full text-xs bg-white/30 text-slate-500"
              placeholder="自动匹配"
            />
          </div>
        </div>

        {/* C. 项目金额 + D. 结算金额 + E. 高开金额 */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">项目金额 (元)</label>
            <input
              type="number"
              value={projectAmount}
              onChange={e => setProjectAmount(e.target.value)}
              className="input-glass w-full text-xs"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">结算金额 (元)</label>
            <input
              type="number"
              value={settlementAmount}
              onChange={e => setSettlementAmount(e.target.value)}
              className="input-glass w-full text-xs"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">高开金额 (元)</label>
            <input
              type="number"
              value={extraAmount}
              onChange={e => setExtraAmount(e.target.value)}
              className="input-glass w-full text-xs"
              placeholder="0"
            />
          </div>
        </div>

        {/* 高开含税 */}
        {extraAmount && Number(extraAmount) > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-semibold text-slate-600">高开含税</label>
            <select
              value={extraTaxIncluded ? 'yes' : 'no'}
              onChange={e => setExtraTaxIncluded(e.target.value === 'yes')}
              className="input-glass text-xs"
            >
              <option value="no">不含税</option>
              <option value="yes">含税</option>
            </select>
          </div>
        )}

        {/* G. 首次合同 + I. 合同日期 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">首次合同</label>
            <select
              value={isFirstContract ? 'yes' : 'no'}
              onChange={e => setIsFirstContract(e.target.value === 'yes')}
              className="input-glass w-full text-xs"
            >
              <option value="no">否</option>
              <option value="yes">是</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-600 uppercase block mb-1">合同日期</label>
            <input
              type="date"
              value={contractDate}
              onChange={e => setContractDate(e.target.value)}
              className="input-glass w-full text-xs"
            />
          </div>
        </div>

        {/* H. 收款计划 */}
        <div className="pt-1 border-t border-black/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">收款计划</span>
            <button
              type="button"
              onClick={addPaymentEntry}
              className="text-[10px] text-blue-500 font-medium flex items-center gap-1 interactive"
            >
              <Plus size={10} /> 添加
            </button>
          </div>
          {paymentEntries.map((entry, i) => (
            <div key={i} className="flex gap-2 mb-2 items-center">
              <input
                value={entry.condition}
                onChange={e => updatePaymentEntry(i, 'condition', e.target.value)}
                className="input-glass flex-1 text-xs"
                placeholder="收款条件"
              />
              <div className="relative w-28">
                <input
                  type="number"
                  value={entry.amount}
                  onChange={e => updatePaymentEntry(i, 'amount', e.target.value)}
                  className="input-glass w-full text-xs pr-6"
                  placeholder="金额"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">元</span>
              </div>
              <button
                type="button"
                onClick={() => removePaymentEntry(i)}
                className="p-1.5 text-slate-300 hover:text-red-400 shrink-0"
                title="移除"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          className="w-full py-2.5 text-xs font-semibold text-white bg-blue-500 rounded-lg interactive mt-2"
        >
          添加成交信息
        </button>
      </div>
    </GlassModal>
  )
}
