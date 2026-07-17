import { useNavigate } from 'react-router-dom'
import { FileText, Search } from 'lucide-react'
import GlassPanel from '@/components/glass/GlassPanel'
import type { Contract } from '@/types'

interface Props {
  contracts: Contract[]
  selected: string[]
  onSelect: (ids: string[]) => void
}

function getPaymentStatus(c: Contract) {
  const total = c.payments.reduce((s, p) => s + p.amount, 0)
  const paid = c.payments.filter(p => p.completed).reduce((s, p) => s + p.amount, 0)
  if (paid >= total && total > 0) return { label: '已收完', color: 'text-emerald-500 bg-emerald-50' }
  if (paid > 0) return { label: `已收 ¥${(paid / 10000).toFixed(1)}万`, color: 'text-amber-500 bg-amber-50' }
  return { label: '未收款', color: 'text-slate-400 bg-slate-100' }
}

function getInvoiceStatus(c: Contract) {
  if (c.invoiceUploaded) return { label: '已开票', color: 'text-emerald-500 bg-emerald-50' }
  return { label: '未开', color: 'text-slate-400 bg-slate-100' }
}

function getExtraStatus(c: Contract) {
  if (c.extraAmount <= 0) return { label: '—', color: 'text-slate-300' }
  if (c.extraPaid) return { label: '已支付', color: 'text-emerald-500 bg-emerald-50' }
  return { label: '未支付', color: 'text-red-400 bg-red-50' }
}

function getStampStatus(c: Contract) {
  if (c.stampContractUploaded) return { label: '已上传', color: 'text-emerald-500' }
  return { label: '未上传', color: 'text-red-400' }
}

const formatAmount = (amount: number) => {
  if (amount >= 10000) return `¥${(amount / 10000).toFixed(1)}万`
  return `¥${amount.toLocaleString()}`
}

export default function DealTable({ contracts, selected, onSelect }: Props) {
  const navigate = useNavigate()

  const toggleSelect = (id: string) => {
    if (selected.includes(id)) {
      onSelect(selected.filter(s => s !== id))
    } else {
      onSelect([...selected, id])
    }
  }

  const toggleAll = () => {
    if (selected.length === contracts.length && contracts.length > 0) {
      onSelect([])
    } else {
      onSelect(contracts.map(c => c.id))
    }
  }

  return (
    <GlassPanel title={`合同列表 (${contracts.length})`}>
      {contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Search size={32} className="mb-2 text-slate-300" />
          <p className="text-xs">没有符合条件的结果</p>
          <p className="text-[10px] mt-0.5">尝试调整搜索条件</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-black/5 sticky top-0 z-5 bg-white/80">
                <th className="text-center py-2 px-2 w-10">
                  <input
                    type="checkbox"
                    checked={selected.length === contracts.length && contracts.length > 0}
                    onChange={toggleAll}
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="text-left py-2 px-3 whitespace-nowrap">合同日期</th>
                <th className="text-left py-2 px-3 whitespace-nowrap">公司名称</th>
                <th className="text-left py-2 px-3 whitespace-nowrap">项目名称</th>
                <th className="text-right py-2 px-3 whitespace-nowrap">结算金额</th>
                <th className="text-center py-2 px-3 whitespace-nowrap">回款情况</th>
                <th className="text-center py-2 px-3 whitespace-nowrap">开票情况</th>
                <th className="text-center py-2 px-3 whitespace-nowrap">高开支付情况</th>
                <th className="text-center py-2 px-3 whitespace-nowrap">双章合同</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => {
              const pStatus = getPaymentStatus(c)
              const iStatus = getInvoiceStatus(c)
              const eStatus = getExtraStatus(c)
              const sStatus = getStampStatus(c)
              return (
                <tr
                  key={c.id}
                  className="table-row border-b border-black/[0.02] text-xs"
                >
                  <td className="py-2.5 px-2 text-center" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.includes(c.id)}
                      onChange={() => toggleSelect(c.id)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap cursor-pointer" onClick={() => navigate(`/deals/${c.id}`)}>
                    <div className="flex items-center gap-1.5">
                      <FileText size={12} className="text-slate-300" />
                      {c.contractDate}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap max-w-[140px] truncate cursor-pointer" onClick={() => navigate(`/deals/${c.id}`)}>
                    {c.customerName}
                  </td>
                  <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap max-w-[160px] truncate cursor-pointer" onClick={() => navigate(`/deals/${c.id}`)}>
                    {c.projectName}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs font-medium text-slate-700 tabular-nums whitespace-nowrap cursor-pointer" onClick={() => navigate(`/deals/${c.id}`)}>
                    {formatAmount(c.settlementAmount)}
                  </td>
                  <td className="py-2.5 px-3 text-center cursor-pointer" onClick={() => navigate(`/deals/${c.id}`)}>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${pStatus.color}`}>
                      {pStatus.label}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center cursor-pointer" onClick={() => navigate(`/deals/${c.id}`)}>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${iStatus.color}`}>
                      {iStatus.label}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center cursor-pointer" onClick={() => navigate(`/deals/${c.id}`)}>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${eStatus.color}`}>
                      {eStatus.label}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center cursor-pointer" onClick={() => navigate(`/deals/${c.id}`)}>
                    <span className={`text-[9px] font-medium whitespace-nowrap ${sStatus.color}`}>
                      {sStatus.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}
    </GlassPanel>
  )
}
