import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Calculator, Send } from 'lucide-react'
import GlassPanel from '@/components/glass/GlassPanel'
import GlassModal from '@/components/glass/GlassModal'
import CommissionTable from '@/components/commission/CommissionTable'
import CommissionCalculator from '@/components/commission/CommissionCalculator'
import type { CommissionBreakdown } from '@/components/commission/CommissionCalculator'
import type { Contract } from '@/types'
import { useAuth } from '@/hooks/useAuth'

export default function CommissionPage() {
  const { user, isSuperAdmin } = useAuth()
  const navigate = useNavigate()

  // Only super admin can access this page
  useEffect(() => {
    if (!isSuperAdmin) navigate('/', { replace: true })
  }, [isSuperAdmin, navigate])

  if (!isSuperAdmin) return null
  const [selectedContracts, setSelectedContracts] = useState<Contract[]>([])
  const [disbursedContractIds, setDisbursedContractIds] = useState<string[]>([])
  const [breakdown, setBreakdown] = useState<CommissionBreakdown[]>([])
  const [showModal, setShowModal] = useState(false)

  const handleBreakdownChange = useCallback((b: CommissionBreakdown[]) => {
    setBreakdown(b)
  }, [])

  const handleDisburse = () => {
    const ids = selectedContracts.map(c => c.id)
    setDisbursedContractIds(prev => {
      const merged = new Set([...prev, ...ids])
      return Array.from(merged)
    })
    toast.success(`已标记 ${ids.length} 条合同的提成为"已发放"，等待归属人确认`)
    setSelectedContracts([])
    setShowModal(false)
  }

  // Derived totals for modal
  const totalSales = breakdown.reduce((s, b) => s + b.salesCommission, 0)
  const totalTech = breakdown.reduce((s, b) => s + b.techCommission, 0)

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 font-display mb-1">提成发放</h1>
      <p className="text-xs text-slate-400 mb-5">合同审查与提成计算</p>

      <GlassPanel title="合同审查">
        <CommissionTable
          onSelectionChange={setSelectedContracts}
          disbursedContractIds={disbursedContractIds}
        />
      </GlassPanel>

      <CommissionCalculator
        selectedContracts={selectedContracts}
        onBreakdownChange={handleBreakdownChange}
      />

      {selectedContracts.length > 0 && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-blue-500 rounded-lg interactive hover:bg-blue-600 transition-colors"
          >
            下一步
            <span className="opacity-70">→</span>
          </button>
        </div>
      )}

      {/* ===== Summary Modal ===== */}
      <GlassModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={`提成发放确认 · 共 ${breakdown.length} 条合同`}
        className="!max-w-3xl"
      >
        {/* Body - scrollable table */}
        <div className="max-h-[50vh] overflow-y-auto -mx-1">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-slate-500 uppercase tracking-wider border-b border-black/5 sticky top-0 bg-white/80">
                <th className="text-left py-2 px-2 font-semibold">客户全称</th>
                <th className="text-right py-2 px-2 font-semibold">结算金额</th>
                <th className="text-left py-2 px-2 font-semibold">销售提成接收人员</th>
                <th className="text-right py-2 px-2 font-semibold">销售提成金额</th>
                <th className="text-left py-2 px-2 font-semibold">技术提成接收人员</th>
                <th className="text-right py-2 px-2 font-semibold">技术提成金额</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                breakdown.map((b, i) => (
                  <tr key={b.contractId || i} className="border-b border-black/[0.02] hover:bg-blue-50/30">
                    <td className="py-2.5 px-2 font-medium text-slate-700">{b.customerName}</td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600">
                      ¥{b.settlementAmount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600">{b.salesPersonName}</td>
                    <td className="py-2.5 px-2 text-right font-mono font-medium tabular-nums text-blue-600">
                      ¥{b.salesCommission.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600">
                      {b.techCommission > 0 ? b.techPersonName : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-medium tabular-nums text-purple-600">
                      {b.techCommission > 0 ? `¥${b.techCommission.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="border-t border-black/5 pt-4 mt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[9px] text-slate-400">销售提成合计</p>
                <p className="text-sm font-mono font-bold text-blue-600 tabular-nums">
                  ¥{totalSales.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400">技术提成合计</p>
                <p className="text-sm font-mono font-bold text-purple-600 tabular-nums">
                  ¥{totalTech.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400">总计</p>
                <p className="text-sm font-mono font-bold text-slate-800 tabular-nums">
                  ¥{(totalSales + totalTech).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={handleDisburse}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-blue-500 rounded-lg interactive hover:bg-blue-600 transition-colors"
            >
              <Send size={14} />
              确认并发送
            </button>
          </div>
          <p className="text-[9px] text-slate-400">
            点击「确认并发送」后，提成信息将分别发送给对应人员确认。
          </p>
        </div>
      </GlassModal>
    </div>
  )
}
