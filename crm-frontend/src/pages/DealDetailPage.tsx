import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, ShieldAlert, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import GlassCard from '@/components/glass/GlassCard'
import DealDetail from '@/components/deal/DealDetail'
import PaymentSchedule from '@/components/deal/PaymentSchedule'
import ApprovalCard from '@/components/deal/ApprovalCard'
import ProjectFileArchive from '@/components/deal/ProjectFileArchive'
import { useContracts } from '@/hooks/useContracts'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'

export default function DealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const { contracts, approveContract, rejectContract } = useContracts()
  const { notifications, respondToRequest } = useNotifications()
  const contract = contracts.find(c => c.id === id)

  // General users can only view their own contracts
  const canView = contract && (isAdmin || contract.attributedTo === user?.id)

  if (!contract || !canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShieldAlert size={48} className="text-slate-300 mb-4" />
        <p className="text-sm text-slate-500">合同不存在</p>
        <button onClick={() => navigate('/deals')} className="text-xs text-blue-500 mt-2 interactive">
          返回合同列表
        </button>
      </div>
    )
  }

  const canEdit = user != null && !contract.approved && !contract.cancelled
  const isSuperAdmin = user?.permissionLevel === 'super_admin'
  const isPendingApproval = !contract.approved && !contract.cancelled && contract.submitted

  const handleApprove = () => {
    approveContract(contract.id)
    const pendingNotif = notifications.find(
      n => n.contractId === contract.id && n.type === 'contract_submitted' && n.status === 'pending'
    )
    if (pendingNotif) {
      respondToRequest(pendingNotif.id, 'approved')
    }
    toast.success('合同已审批通过')
  }

  const handleReject = () => {
    rejectContract(contract.id)
    const pendingNotif = notifications.find(
      n => n.contractId === contract.id && n.type === 'contract_submitted' && n.status === 'pending'
    )
    if (pendingNotif) {
      respondToRequest(pendingNotif.id, 'rejected')
    }
    toast.success('合同已驳回')
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate('/deals')} className="nav-icon">
          <ArrowLeft size={16} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-blue-500" />
            <h1 className="text-xl font-bold text-slate-800 font-display">成交详情</h1>
          </div>
          <p className="text-xs text-slate-400">
            {contract.projectName} — {contract.customerName}
          </p>
        </div>
        {/* Status badges + Approve/Reject */}
        <div className="ml-auto flex items-center gap-2">
          {contract.approved && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">已审批</span>
          )}
          {contract.cancelled && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">已取消</span>
          )}
          {!contract.approved && !contract.cancelled && !contract.submitted && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">待上传</span>
          )}
          {!contract.approved && !contract.cancelled && contract.submitted && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">待审批</span>
          )}
          {isSuperAdmin && isPendingApproval && (
            <>
              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-white bg-emerald-500 rounded-lg interactive"
              >
                <Check size={12} /> 通过
              </button>
              <button
                onClick={handleReject}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-white bg-red-400 rounded-lg interactive"
              >
                <X size={12} /> 驳回
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Contract Info + Payment Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <DealDetail contract={contract} canEdit={canEdit} />

          <GlassCard>
            <PaymentSchedule
              payments={contract.payments}
              contractId={contract.id}
              canEdit={canEdit}
              projectAmount={contract.projectAmount}
            />
          </GlassCard>
        </div>

        {/* Right Column - Approval + File Archive */}
        <div className="space-y-4">
          <ApprovalCard contract={contract} />
          <ProjectFileArchive contractId={contract.id} />
        </div>
      </div>
    </div>
  )
}
