import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCustomers } from '@/hooks/useCustomers'
import { useAuth } from '@/hooks/useAuth'
import { canViewDetail, canEdit, canShare } from '@/lib/permissions'
import { useUsers } from '@/hooks/useUsers'
import { ArrowLeft } from 'lucide-react'
import CustomerInfo from '@/components/customer/CustomerInfo'
import ContactList from '@/components/customer/ContactList'
import ProjectList from '@/components/customer/ProjectList'
import ShareModal from '@/components/customer/ShareModal'

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getCustomer } = useCustomers()
  const { users } = useUsers()
  const customer = getCustomer(id!)
  const [showShareModal, setShowShareModal] = useState(false)

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-slate-400 text-sm mb-4">客户不存在</p>
        <button onClick={() => navigate('/customers')} className="text-blue-500 text-xs interactive">
          返回列表
        </button>
      </div>
    )
  }

  if (user && !canViewDetail(user.id, user.permissionLevel, customer)) {
    return (
      <div>
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-4 interactive"
        >
          <ArrowLeft size={14} /> 返回客户列表
        </button>
        <div className="glass-card p-8 text-center">
          <p className="text-sm text-slate-500 mb-2">您没有查看此客户详情的权限</p>
          <p className="text-xs text-slate-400">
            客户「{customer.name}」由 {customer.createdByName} 创建。
            如需查看详情，请联系创建人或管理员为您开通访问权限。
          </p>
          <button
            onClick={() => navigate('/customers')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white text-xs font-semibold rounded-lg interactive"
          >
            返回客户列表
          </button>
        </div>
      </div>
    )
  }

  const hasEdit = user ? canEdit(user.id, user.permissionLevel, customer) : false
  const hasShare = user ? canShare(user.id, user.permissionLevel, customer) : false

  return (
    <div>
      <button
        onClick={() => navigate('/customers')}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 mb-4 interactive"
      >
        <ArrowLeft size={14} /> 返回客户列表
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <CustomerInfo customer={customer} canEdit={hasEdit} canShare={hasShare} onOpenShare={() => setShowShareModal(true)} />
          <ContactList contacts={customer.contacts} customerId={customer.id} canEdit={hasEdit} />
        </div>
        <div className="lg:col-span-3">
          <ProjectList projects={customer.projects} customerId={customer.id} customerName={customer.name} contacts={customer.contacts} canEdit={hasEdit} />
        </div>
      </div>

      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        customer={customer}
        allUsers={users.map(u => ({ id: u.id, name: u.name, role: u.role }))}
      />
    </div>
  )
}
