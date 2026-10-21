export type PermissionLevel = 'super_admin' | 'admin' | 'general'

export const PERMISSION_LEVEL_LABELS: Record<PermissionLevel, string> = {
  super_admin: '超级管理员',
  admin: '管理员',
  general: '一般用户',
}

export type UserRole = 'general_manager' | 'sales_assistant' | 'finance' | 'salesperson' | 'technician'

export const ROLE_LABELS: Record<UserRole, string> = {
  general_manager: '总经理',
  sales_assistant: '销售助理',
  finance: '财务',
  salesperson: '销售员',
  technician: '技术员',
}

export const JOB_ROLES: UserRole[] = ['general_manager', 'sales_assistant', 'finance', 'salesperson', 'technician']

export interface User {
  id: string
  name: string
  username: string
  password: string
  role: UserRole
  permissionLevel: PermissionLevel
  avatar?: string
  createdAt: string
  lastLogin?: string
  disabled: boolean
  /** 直属主管（报销一级审核人） */
  managerId?: string | null
}

export type CustomerType = 'owner' | 'integrator' | 'channel'
export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  owner: '业主',
  integrator: '集成商',
  channel: '渠道商',
}

export type CustomerPositioning = 'vip' | 'key' | 'normal' | 'low' | 'pending'
export const CUSTOMER_POSITIONING_LABELS: Record<CustomerPositioning, string> = {
  vip: 'VIP客户',
  key: '重点客户',
  normal: '普通客户',
  low: '低价值',
  pending: '待筛选',
}

export type FollowStatus = 'following' | 'won' | 'lost'
export const FOLLOW_STATUS_LABELS: Record<FollowStatus, string> = {
  following: '跟进中',
  won: '成交',
  lost: '丢单',
}

export type ReportStatus = 'failed' | 'exclusive' | 'joint'
export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  failed: '报备失败',
  exclusive: '独家报备',
  joint: '共同跟进',
}

export interface Contact {
  id: string
  name: string
  phone: string
  position: string
  description?: string
  describedBy?: string
  customerId: string
}

export interface Project {
  id: string
  name: string
  customerId: string
  customerName: string
  contactName?: string
  reportStatus: ReportStatus
  followStatus: FollowStatus
  amount: number
  nextFollowUp?: string
  nextFollowUpDate?: string
  createdAt: string
  createdBy: string
}

export interface FollowRecord {
  id: string
  projectId: string
  content: string
  recordedBy: string
  recordedAt: string
}

export type SharePermission = 'view' | 'edit'

export const SHARE_PERMISSION_LABELS: Record<SharePermission, string> = {
  view: '仅查看',
  edit: '可编辑',
}

export interface CustomerAccess {
  userId: string
  userName: string
  permission: SharePermission
  grantedAt: string
}

export interface CustomerAnnotation {
  id: string
  content: string
  annotatedBy: string
  annotatedAt: string
  projectId?: string
}

export interface Customer {
  id: string
  name: string
  shortName?: string
  region: string
  type: CustomerType
  positioning: CustomerPositioning
  customerAttribute?: CustomerAttribute
  createdBy: string
  createdByName: string
  accessControl: CustomerAccess[]
  createdAt: string
  contacts: Contact[]
  projects: Project[]
  notes?: string
  annotations?: CustomerAnnotation[]
  deleted: boolean
  hiddenBy?: string[]
  deletedBy?: string
  deletedAt?: string
  /* Public pool / 公海 */
  ownedBy?: string
  ownedByName?: string
  lastActivityAt?: string
  reclaimedAt?: string
  reclaimDays?: number
  /* Location */
  provinceCode?: string
  provinceName?: string
  cityCode?: string
  cityName?: string
  districtCode?: string
  districtName?: string
  /* Detailed address */
  detailedAddress?: string
}

export type ArchivedFileCategory = 'contract' | 'invoice' | 'project_doc'

export const ARCHIVED_FILE_CATEGORY_LABELS: Record<ArchivedFileCategory, string> = {
  contract: '合同文件',
  invoice: '发票',
  project_doc: '项目资料',
}

export interface ArchivedFile {
  id: string
  name: string
  category: ArchivedFileCategory
  data: string
  uploadedAt: string
}

export interface Contract {
  id: string
  customerId: string
  customerName: string
  projectId: string
  projectName: string
  contractDate: string
  attributedTo: string
  attributedToName: string
  projectAmount: number
  settlementAmount: number
  extraAmount: number
  extraTaxIncluded: boolean
  extraPaid: boolean
  customerAttribute: 'company' | 'individual'
  isFirstContract: boolean
  payments: Payment[]
  contractFile?: string
  invoiceFile?: string
  processFiles: string[]
  archivedFiles: ArchivedFile[]
  approved: boolean
  cancelled: boolean
  submitted: boolean
  stampContractUploaded: boolean
  invoiceUploaded: boolean
}

export interface Payment {
  id: string
  condition: string
  amount: number
  completed: boolean
  paymentDate?: string
  voucherFile?: string
}

export type TaskStatus = 'pending' | 'submitted' | 'completed'

export interface Task {
  id: string
  title: string
  content: string
  assignedBy: string
  assignedTo: string
  createdAt: string
  deadline: string
  completed: boolean
  /** 任务状态机：pending 进行中 / submitted 待发件人确认 / completed 已完成 */
  status: TaskStatus
  source: 'customer' | 'office' | 'contract'
  /** Optional deep-link: /customers/:id or /deals/:id or /office */
  linkTo?: string
}

export interface Visit {
  id: string
  date: string
  salesperson: string
  customerId: string
  customerName: string
  location: string
  contact: string
  duration: number
}

/* ---------------- 外勤费用报销（SOP 流程） ---------------- */

export const EXPENSE_CATEGORIES = ['交通', '差旅', '住宿餐', '招待', '耗材', '杂费'] as const
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

export type ExpenseStatus = 'pending_manager' | 'pending_finance' | 'pending_payment' | 'paid' | 'settled' | 'rejected'

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  pending_manager: '待主管审核',
  pending_finance: '待财务审核',
  pending_payment: '审核通过，待打款',
  paid: '已打款，待签收',
  settled: '已核销，已办结',
  rejected: '已驳回',
}

export interface ExpenseItem {
  id?: string
  category: string
  amount: number
  date: string      // 消费日期
  reason: string    // 消费事由
}

export interface ExpenseAttachment {
  name: string
  data: string      // base64 DataURL
  uploadedAt: string
}

export interface ExpenseHistoryEntry {
  action: string    // submit/manager_approve/manager_reject/finance_approve/finance_reject/pay/settle/resubmit
  operatorId: string
  operatorName: string
  comment?: string
  at: string
}

export const EXPENSE_ACTION_LABELS: Record<string, string> = {
  submit: '提交申请',
  manager_approve: '主管审核通过',
  manager_reject: '主管驳回',
  finance_approve: '财务审核通过',
  finance_reject: '财务驳回',
  pay: '财务打款',
  settle: '申请人签收确认',
  resubmit: '整改后重新提交',
}

export interface Expense {
  id: string
  customerId: string
  customerName: string
  visitId?: string | null
  fieldworkDate: string
  fieldworkLocation: string
  workContent: string
  notes?: string | null
  totalAmount: number
  status: ExpenseStatus
  submittedById: string
  submittedByName: string
  rejectReason?: string | null
  rejectedByStage?: 'manager' | 'finance' | null
  statusHistory: ExpenseHistoryEntry[]
  attachments: ExpenseAttachment[]
  items: ExpenseItem[]
  createdAt: string
  updatedAt: string
}

export interface CommissionRule {
  type: 'sales_quarterly' | 'sales_fixed_bonus' | 'sales_new_customer' | 'sales_floating' | 'tech'
  name: string
  description: string
  rate?: number
  settlementCycle: string
  paymentCycle: string
}

export interface DashboardStats {
  totalCustomers: number
  newCustomersThisMonth: number
  potentialAmount: number
  contractAmount: number
}

export type Permission = 'view_all' | 'edit_all' | 'export' | 'manage_users' | 'batch_assign'

export const PERMISSION_LEVEL_PERMISSIONS: Record<PermissionLevel, Permission[]> = {
  super_admin: ['view_all', 'edit_all', 'export', 'manage_users', 'batch_assign'],
  admin: ['view_all', 'edit_all', 'manage_users', 'batch_assign'],
  general: [],
}

/** @deprecated 使用 PERMISSION_LEVEL_PERMISSIONS */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  general_manager: ['view_all', 'edit_all', 'export', 'manage_users', 'batch_assign'],
  sales_assistant: [],
  finance: [],
  salesperson: [],
  technician: [],
}

export type AuditAction =
  | 'login' | 'logout'
  | 'create_customer' | 'edit_customer' | 'soft_delete_customer'
  | 'hard_delete_customer' | 'restore_customer' | 'reassign_customer'
  | 'create_user' | 'edit_user' | 'delete_user' | 'toggle_disable_user'
  | 'edit_permissions' | 'change_password'
  | 'expense_submit' | 'expense_edit' | 'expense_resubmit' | 'expense_delete'
  | 'expense_manager_approve' | 'expense_manager_reject'
  | 'expense_finance_approve' | 'expense_finance_reject'
  | 'expense_pay' | 'expense_settle'

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  login: '登录', logout: '退出',
  create_customer: '新建客户', edit_customer: '编辑客户',
  soft_delete_customer: '删除客户（软删除）', hard_delete_customer: '永久删除客户',
  restore_customer: '恢复客户', reassign_customer: '重分配客户',
  create_user: '创建用户', edit_user: '编辑用户',
  delete_user: '删除用户', toggle_disable_user: '启用/禁用用户',
  edit_permissions: '修改权限配置', change_password: '修改密码',
  expense_submit: '提交报销', expense_edit: '修改报销单', expense_resubmit: '重新提交报销',
  expense_delete: '删除报销单',
  expense_manager_approve: '报销一级审核通过', expense_manager_reject: '报销一级审核驳回',
  expense_finance_approve: '报销财务审核通过', expense_finance_reject: '报销财务审核驳回',
  expense_pay: '报销打款', expense_settle: '报销签收核销',
}

export interface AuditLogEntry {
  id: string
  userId: string
  userName: string
  action: AuditAction
  targetType: 'customer' | 'user' | 'system' | 'expense'
  targetId?: string
  targetName?: string
  detail: string
  timestamp: string
}

// 客户属性（公司/个人）
export type CustomerAttribute = 'company' | 'individual'
export const CUSTOMER_ATTRIBUTE_LABELS: Record<CustomerAttribute, string> = {
  company: '公司',
  individual: '个人',
}

// 通知类型
export type NotificationType = 'co_follow_request' | 'co_follow_approved' | 'co_follow_rejected' | 'contract_submitted' | 'contract_approved' | 'contract_rejected'
  | 'expense_submitted' | 'expense_manager_approved' | 'expense_finance_approved' | 'expense_paid' | 'expense_rejected'
  | 'task_submitted' | 'task_approved' | 'task_rejected'
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  co_follow_request: '申请共同跟进',
  co_follow_approved: '共同跟进已通过',
  co_follow_rejected: '共同跟进已拒绝',
  contract_submitted: '合同审批提交',
  contract_approved: '合同已通过',
  contract_rejected: '合同已驳回',
  expense_submitted: '报销单待审核',
  expense_manager_approved: '报销单待财务审核',
  expense_finance_approved: '报销审核通过',
  expense_paid: '报销已打款',
  expense_rejected: '报销被驳回',
  task_submitted: '任务待确认',
  task_approved: '任务已确认',
  task_rejected: '任务被驳回',
}

export interface Notification {
  id: string
  type: NotificationType
  fromUserId: string
  fromUserName: string
  toUserId: string
  customerId: string
  customerName: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  read: boolean
  contractId?: string
  expenseId?: string
  taskId?: string
  comment?: string
}

// 省市区结构
export interface RegionData {
  code: string
  name: string
  children?: RegionData[]
}

export interface RegionValue {
  provinceCode?: string
  provinceName?: string
  cityCode?: string
  cityName?: string
  districtCode?: string
  districtName?: string
}
