import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useParallax } from '@/hooks/useParallax'
import StatsCard from '@/components/dashboard/StatsCard'
import TaskList from '@/components/dashboard/TaskList'
import QuickActions from '@/components/dashboard/QuickActions'
import GlassCard from '@/components/glass/GlassCard'
import CustomerForm from '@/components/customer/CustomerForm'
import ContractForm from '@/components/deal/ContractForm'
import ExpenseForm from '@/components/expense/ExpenseForm'
import { useCustomers } from '@/hooks/useCustomers'
import { useContracts } from '@/hooks/useContracts'
import { useVisits } from '@/hooks/useVisits'
import { useExpenses } from '@/hooks/useExpenses'
import { useTasks } from '@/hooks/useTasks'
import { formatLargeAmount } from '@/lib/utils'
import { canViewInList } from '@/lib/permissions'
import { PERMISSION_LEVEL_LABELS } from '@/types'
import { Users, TrendingUp, ClipboardList, Receipt, Clock, MapPin } from 'lucide-react'
import { isBackendAvailable } from '@/lib/api'

export default function DashboardPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth()
  const { customers: allCustomers } = useCustomers()
  const { contracts: allContracts } = useContracts()
  const { visits: allVisits } = useVisits()
  const { expenses: allExpenses } = useExpenses()
  const { tasks: allTasks } = useTasks()
  const scrollY = useParallax()
  const navigate = useNavigate()

  /* ---- Filter data by user permission ---- */
  const customers = useMemo(() =>
    isAdmin ? allCustomers : allCustomers.filter(c => !c.deleted && canViewInList(user?.id || '', user?.permissionLevel || 'general', c)),
    [allCustomers, isAdmin, user?.id, user?.permissionLevel])

  const contracts = useMemo(() =>
    isAdmin ? allContracts : allContracts.filter(c => c.attributedTo === user?.id),
    [allContracts, isAdmin, user?.id])

  const visits = useMemo(() =>
    isAdmin ? allVisits : allVisits.filter(v => v.salesperson === user?.name),
    [allVisits, isAdmin, user?.name])

  const expenses = useMemo(() =>
    isAdmin ? allExpenses : allExpenses.filter(e => e.submittedBy === user?.name),
    [allExpenses, isAdmin, user?.name])

  // Tasks — general users see own tasks or assigned tasks
  const tasks = useMemo(() =>
    isAdmin ? allTasks : allTasks.filter(t => t.assignedBy === user?.name || t.assignedTo === user?.name),
    [allTasks, isAdmin, user?.name])

  /* ---- Modal state for quick actions ---- */
  const [showCustomerForm, setShowCustomerForm] = useState(false)
  const [showContractForm, setShowContractForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)

  /* ---- Backend health check ---- */
  useEffect(() => {
    const check = () => {
      isBackendAvailable().then(ok => {
        if (!ok) toast.error('数据库运行异常，请重启软件', { duration: 0, id: 'db-error' })
      })
    }
    const interval = setInterval(check, 30000)
    check() // initial check
    return () => clearInterval(interval)
  }, [])

  const totalCustomers = customers.filter(c => !c.deleted).length
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()

  const newThisMonth = customers.filter(c => {
    if (c.deleted) return false
    const d = new Date(c.createdAt)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  }).length

  const potentialAmount = customers
    .filter(c => !c.deleted)
    .flatMap(c => c.projects || [])
    .filter(p => p.followStatus === 'following')
    .reduce((sum, p) => sum + p.amount, 0)

  const wonAmount = customers
    .filter(c => !c.deleted)
    .flatMap(c => c.projects || [])
    .filter(p => p.followStatus === 'won')
    .reduce((sum, p) => sum + p.amount, 0)

  /* ---- derived dashboard stats ---- */
  const pendingExpenses = expenses.filter(e => e.status === 'pending').length
  const activeTasks = tasks.filter(t => !t.completed).length
  const pendingApprovals = contracts.filter(c => c.submitted && !c.approved && !c.cancelled).length

  const overduePayments = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return contracts.filter(c => {
      if (c.cancelled) return false
      return c.payments.some(p => !p.completed && p.paymentDate && p.paymentDate < today)
    }).length
  }, [contracts])

  const weekVisits = useMemo(() => {
    const dayOfWeek = now.getDay() || 7 // Sunday = 7, Monday = 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek + 1)
    weekStart.setHours(0, 0, 0, 0)
    return visits.filter(v => new Date(v.date) >= weekStart).length
  }, [visits, now])

  /* ---- recent activity ---- */
  const recentActivity = useMemo(() => {
    const items: { time: string; text: string; person: string }[] = []

    // Recent customers
    customers
      .filter(c => !c.deleted)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 3)
      .forEach(c => items.push({
        time: c.createdAt,
        text: `新建客户「${c.name}」`,
        person: c.createdByName || '—',
      }))

    // Recent contracts
    contracts
      .filter(c => !c.cancelled)
      .sort((a, b) => b.contractDate.localeCompare(a.contractDate))
      .slice(0, 3)
      .forEach(c => items.push({
        time: c.contractDate,
        text: `签订合同「${c.projectName}」¥${(c.settlementAmount / 10000).toFixed(1)}万`,
        person: c.attributedToName || '—',
      }))

    // Recent visits
    visits
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3)
      .forEach(v => items.push({
        time: v.date,
        text: `拜访「${v.customerName}」`,
        person: v.salesperson || '—',
      }))

    // Recent expenses
    expenses
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3)
      .forEach(e => items.push({
        time: e.date,
        text: `报销「${e.reason}」¥${e.amount.toLocaleString()}`,
        person: e.submittedBy || '—',
      }))

    return items
      .sort((a, b) => b.time.localeCompare(a.time))
      .slice(0, 10)
  }, [customers, contracts, visits, expenses])

  return (
    <div className="relative">
      {/* Parallax background orbs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-[5%] right-[10%] w-[300px] h-[300px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
            transform: `translateY(${scrollY * 0.3}px)`,
          }}
        />
        <div
          className="absolute bottom-[10%] left-[5%] w-[250px] h-[250px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)',
            transform: `translateY(${scrollY * -0.2}px)`,
          }}
        />
      </div>

      <div className="relative z-5">
        <h1 className="text-xl font-bold text-slate-800 font-display mb-1">仪表盘</h1>
        <p className="text-xs text-slate-400 mb-6">欢迎回来，{user?.name}</p>

        {/* Stats row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <StatsCard
            title="客户总数"
            value={totalCustomers}
            sub={`↑ ${newThisMonth} 本月新增`}
            subColor="green"
            delay={0}
          />
          <StatsCard
            title="潜在金额"
            value={formatLargeAmount(potentialAmount)}
            sub={`${customers.filter(c => !c.deleted).flatMap(c => c.projects || []).filter(p => p.followStatus === 'following').length} 个项目跟进中`}
            delay={100}
          />
          <StatsCard
            title="成交金额"
            value={formatLargeAmount(wonAmount)}
            sub={`${customers.filter(c => !c.deleted).flatMap(c => c.projects || []).filter(p => p.followStatus === 'won').length} 个合同已成交`}
            delay={200}
          />
        </div>

        {/* Stats row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          {isAdmin && (
            <GlassCard
              className="flex items-center gap-3 p-3 cursor-pointer interactive hover:bg-amber-50/50 transition-colors"
              onClick={() => navigate('/expenses')}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Receipt size={14} className="text-amber-500" />
              </div>
              <div>
                <p className="text-[9px] text-slate-400">待审批报销</p>
                <p className="text-lg font-mono font-bold text-slate-800">{pendingExpenses}</p>
              </div>
            </GlassCard>
          )}
          <GlassCard
            className="flex items-center gap-3 p-3 cursor-pointer interactive hover:bg-purple-50/50 transition-colors"
            onClick={() => navigate('/deals')}
          >
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <ClipboardList size={14} className="text-purple-500" />
            </div>
            <div>
              <p className="text-[9px] text-slate-400">待审批合同</p>
              <p className="text-lg font-mono font-bold text-slate-800">{pendingApprovals}</p>
            </div>
          </GlassCard>
          <GlassCard className="flex items-center gap-3 p-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Clock size={14} className="text-red-500" />
            </div>
            <div>
              <p className="text-[9px] text-slate-400">回款逾期</p>
              <p className="text-lg font-mono font-bold text-slate-800">{overduePayments}</p>
            </div>
          </GlassCard>
          <GlassCard className="flex items-center gap-3 p-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <MapPin size={14} className="text-emerald-500" />
            </div>
            <div>
              <p className="text-[9px] text-slate-400">本周拜访</p>
              <p className="text-lg font-mono font-bold text-slate-800">{weekVisits}</p>
            </div>
          </GlassCard>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <TaskList />

            {/* Recent Activity — only visible to super admin */}
            {isSuperAdmin && (
              <GlassCard reveal revealDelay={600}>
                <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-3">近期活动</h3>
                {recentActivity.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">暂无近期活动</p>
                ) : (
                  <div className="space-y-2">
                    {recentActivity.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 text-xs">
                        <span className="text-[9px] text-slate-400 whitespace-nowrap shrink-0 w-20">{item.time}</span>
                        <span className="text-slate-600 flex-1">{item.text}</span>
                        <span className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap">{item.person}</span>
                      </div>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}
          </div>
          <div>
            <QuickActions
              onNewCustomer={() => setShowCustomerForm(true)}
              onNewContract={() => setShowContractForm(true)}
              onNewExpense={() => setShowExpenseForm(true)}
            />

            {/* User info card */}
            <GlassCard reveal revealDelay={800} className="mt-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                  {user?.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">{user?.name}</p>
                  <p className="text-[10px] text-slate-400">{user ? PERMISSION_LEVEL_LABELS[user.permissionLevel] : ''}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-black/[0.04]">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Users size={12} className="text-slate-400" />
                  客户数：{totalCustomers}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <TrendingUp size={12} className="text-slate-400" />
                  本月新增：{newThisMonth}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Clock size={12} className="text-slate-400" />
                  待办任务：{activeTasks}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <MapPin size={12} className="text-slate-400" />
                  本周拜访：{weekVisits}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      <CustomerForm open={showCustomerForm} onClose={() => setShowCustomerForm(false)} />
      <ContractForm open={showContractForm} onClose={() => setShowContractForm(false)} />
      <ExpenseForm open={showExpenseForm} onClose={() => setShowExpenseForm(false)} />
    </div>
  )
}
