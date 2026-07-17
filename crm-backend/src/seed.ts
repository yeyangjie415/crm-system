import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ── Users ──
  const password = await bcrypt.hash('admin123', 10)
  const users = [
    { id: '1', name: '张管理', username: 'admin', password, role: 'general_manager', permissionLevel: 'super_admin', createdAt: '2024-01-01', lastLogin: '2026-07-03', disabled: false },
    { id: '2', name: '李销售', username: 'sales', password, role: 'salesperson', permissionLevel: 'general', createdAt: '2024-01-15', lastLogin: '2026-07-03', disabled: false },
    { id: '3', name: '王技术', username: 'tech', password, role: 'technician', permissionLevel: 'general', createdAt: '2024-02-01', lastLogin: '2026-07-01', disabled: false },
    { id: '4', name: '赵财务', username: 'finance', password, role: 'finance', permissionLevel: 'general', createdAt: '2024-03-01', lastLogin: '2026-07-02', disabled: false },
    { id: '5', name: '陈助理', username: 'assistant', password, role: 'sales_assistant', permissionLevel: 'admin', createdAt: '2024-04-01', lastLogin: '2026-06-30', disabled: false },
    { id: '6', name: '刘销售', username: 'sales2', password, role: 'salesperson', permissionLevel: 'general', createdAt: '2024-05-01', lastLogin: '2026-07-03', disabled: false },
  ]
  for (const u of users) {
    await prisma.user.upsert({ where: { id: u.id }, update: u, create: u })
  }
  console.log(`  ✓ ${users.length} users`)

  // ── Customers ──
  const customers = [
    {
      id: 'c1', name: '华科信息技术有限公司', shortName: '华科信息', region: '深圳',
      type: 'owner', positioning: 'vip', createdBy: '2', createdByName: '李销售',
      createdAt: '2024-03-15', deleted: false, ownedBy: '2', ownedByName: '李销售', lastActivityAt: '2026-07-02 16:00',
      accessControl: '[]', annotations: JSON.stringify([
        { id: 'a1', content: '关键决策人周总偏好技术细节，交流时需要准备详细方案', annotatedBy: '李销售', annotatedAt: '2026-06-20 15:00' },
        { id: 'a2', content: '预算充足，但采购流程较长，需提前推进', annotatedBy: '李销售', annotatedAt: '2026-07-01 09:00' },
      ]), hiddenBy: '[]',
      contacts: [{ id: 'ct1', name: '周总', phone: '13800138001', position: '技术总监', description: '决策人' }, { id: 'ct2', name: '吴经理', phone: '13800138002', position: '采购经理' }],
      projects: [{ id: 'p1', name: 'ERP系统部署', customerName: '华科信息技术有限公司', contactName: '周总', reportStatus: 'exclusive', followStatus: 'following', amount: 320000, nextFollowUp: '提交技术方案', nextFollowUpDate: '2026-07-05', createdAt: '2024-04-01', createdBy: '2' }],
    },
    {
      id: 'c2', name: '鼎新科技有限公司', shortName: '鼎新科技', region: '北京',
      type: 'integrator', positioning: 'key', createdBy: '2', createdByName: '李销售',
      createdAt: '2024-04-10', deleted: false, ownedBy: '2', ownedByName: '李销售', lastActivityAt: '2026-06-28',
      accessControl: JSON.stringify([{ userId: '6', userName: '刘销售', permission: 'edit', grantedAt: '2024-04-10' }]),
      annotations: '[]', hiddenBy: '[]',
      contacts: [{ id: 'ct3', name: '郑总', phone: '13800138003', position: 'CEO' }],
      projects: [{ id: 'p2', name: '数据平台建设', customerName: '鼎新科技有限公司', contactName: '郑总', reportStatus: 'exclusive', followStatus: 'won', amount: 580000, nextFollowUp: '合同签署', createdAt: '2024-05-01', createdBy: '2' }],
    },
    {
      id: 'c3', name: '远航集团有限公司', shortName: '远航集团', region: '上海',
      type: 'owner', positioning: 'key', createdBy: '6', createdByName: '刘销售',
      createdAt: '2024-05-20', deleted: false, ownedBy: '6', ownedByName: '刘销售', lastActivityAt: '2026-07-01',
      accessControl: JSON.stringify([{ userId: '2', userName: '李销售', permission: 'edit', grantedAt: '2024-05-20' }]),
      annotations: JSON.stringify([{ id: 'a3', content: '孙总（副总裁）是关键拍板人，需推动高层对话', annotatedBy: '刘销售', annotatedAt: '2026-06-25 11:30' }]),
      hiddenBy: '[]',
      contacts: [{ id: 'ct4', name: '孙总', phone: '13800138004', position: '副总裁' }, { id: 'ct5', name: '钱经理', phone: '13800138005', position: 'IT经理' }],
      projects: [{ id: 'p3', name: '安防监控系统', customerName: '远航集团有限公司', contactName: '钱经理', reportStatus: 'joint', followStatus: 'following', amount: 1200000, nextFollowUp: '演示产品', nextFollowUpDate: '2026-07-08', createdAt: '2024-06-01', createdBy: '6' }],
    },
    {
      id: 'c4', name: '明辉电子有限公司', shortName: '明辉电子', region: '广州',
      type: 'channel', positioning: 'normal', createdBy: '2', createdByName: '李销售',
      createdAt: '2024-06-15', deleted: false, ownedBy: '2', ownedByName: '李销售', lastActivityAt: '2026-07-02',
      accessControl: '[]', annotations: '[]', hiddenBy: '[]',
      contacts: [{ id: 'ct6', name: '冯经理', phone: '13800138006', position: '销售总监' }],
      projects: [],
    },
    {
      id: 'c5', name: '中科云智科技有限公司', shortName: '中科云智', region: '杭州',
      type: 'owner', positioning: 'vip', createdBy: '6', createdByName: '刘销售',
      createdAt: '2024-07-01', deleted: false, ownedBy: '6', ownedByName: '刘销售', lastActivityAt: '2026-07-02',
      accessControl: '[]', annotations: JSON.stringify([{ id: 'a4', content: '项目金额大，需重点关注回款节奏', annotatedBy: '刘销售', annotatedAt: '2026-07-02 14:00' }]),
      hiddenBy: '[]',
      contacts: [{ id: 'ct7', name: '陈博士', phone: '13800138007', position: 'CTO', description: '技术决策者' }],
      projects: [{ id: 'p4', name: 'AI算力平台', customerName: '中科云智科技有限公司', contactName: '陈博士', reportStatus: 'exclusive', followStatus: 'following', amount: 2500000, nextFollowUp: '商务谈判', nextFollowUpDate: '2026-07-10', createdAt: '2024-08-01', createdBy: '6' }],
    },
    {
      id: 'c6', name: '博创科技股份', shortName: '博创科技', region: '成都',
      type: 'integrator', positioning: 'normal', createdBy: '2', createdByName: '李销售',
      createdAt: '2024-08-10', deleted: false, ownedBy: '2', ownedByName: '李销售', lastActivityAt: '2025-05-01',
      accessControl: '[]', annotations: '[]', hiddenBy: '[]',
      contacts: [{ id: 'ct8', name: '黄总', phone: '13800138008', position: '总经理' }],
      projects: [{ id: 'p5', name: '云安全加固', customerName: '博创科技股份', contactName: '黄总', reportStatus: 'joint', followStatus: 'lost', amount: 180000, createdAt: '2024-09-01', createdBy: '2' }],
    },
    {
      id: 'c7', name: '恒达通信有限公司', shortName: '恒达通信', region: '武汉',
      type: 'channel', positioning: 'low', createdBy: '6', createdByName: '刘销售',
      createdAt: '2024-09-15', deleted: false, ownedBy: '6', ownedByName: '刘销售', lastActivityAt: '2024-10-01',
      accessControl: '[]', annotations: '[]', hiddenBy: '[]',
      contacts: [], projects: [],
    },
    {
      id: 'c8', name: '瑞联数据科技', shortName: '瑞联数据', region: '南京',
      type: 'owner', positioning: 'pending', createdBy: '2', createdByName: '李销售',
      createdAt: '2024-10-01', deleted: false, ownedBy: '2', ownedByName: '李销售', lastActivityAt: '2024-11-01',
      accessControl: '[]', annotations: '[]', hiddenBy: '[]',
      contacts: [{ id: 'ct9', name: '马经理', phone: '13800138009', position: '数据总监' }],
      projects: [],
    },
    {
      id: 'c9', name: '天宇智能科技有限公司', shortName: '天宇智能', region: '深圳',
      type: 'owner', positioning: 'key', createdBy: '6', createdByName: '刘销售',
      createdAt: '2024-11-01', deleted: false, ownedBy: '6', ownedByName: '刘销售', lastActivityAt: '2026-07-03',
      accessControl: JSON.stringify([{ userId: '2', userName: '李销售', permission: 'edit', grantedAt: '2024-11-01' }]),
      annotations: '[]', hiddenBy: '[]',
      contacts: [{ id: 'ct10', name: '林总', phone: '13800138010', position: '创始人', description: '最终决策人' }],
      projects: [{ id: 'p6', name: '智慧园区项目', customerName: '天宇智能科技有限公司', contactName: '林总', reportStatus: 'exclusive', followStatus: 'following', amount: 3500000, nextFollowUp: '高层会面', nextFollowUpDate: '2026-07-15', createdAt: '2024-12-01', createdBy: '6' }],
    },
    {
      id: 'c10', name: '创鑫软件有限公司', shortName: '创鑫软件', region: '西安',
      type: 'integrator', positioning: 'normal', createdBy: '2', createdByName: '李销售',
      createdAt: '2025-01-15', deleted: false, ownedBy: '2', ownedByName: '李销售', lastActivityAt: '2026-06-30',
      accessControl: '[]', annotations: '[]', hiddenBy: '[]',
      contacts: [{ id: 'ct11', name: '杨总监', phone: '13800138011', position: '研发总监' }],
      projects: [{ id: 'p7', name: 'DevOps平台', customerName: '创鑫软件有限公司', contactName: '杨总监', reportStatus: 'exclusive', followStatus: 'won', amount: 420000, createdAt: '2025-02-01', createdBy: '2' }],
    },
  ]

  for (const c of customers) {
    const { contacts, projects, ...data } = c
    await prisma.customer.upsert({
      where: { id: data.id },
      update: {},
      create: {
        ...data,
        contacts: { create: contacts },
        projects: { create: projects },
      },
    })
  }
  console.log(`  ✓ ${customers.length} customers`)

  // ── Follow Records ──
  const followRecords = [
    { id: 'f1', projectId: 'p1', content: '初次拜访周总，了解ERP需求，对方目前使用金蝶系统，希望升级到更灵活的方案。', recordedBy: '李销售', recordedAt: '2026-06-20 14:30' },
    { id: 'f2', projectId: 'p1', content: '发送技术方案初稿，等待周总反馈。周总提到对数据迁移比较关注。', recordedBy: '李销售', recordedAt: '2026-06-28 10:00' },
    { id: 'f3', projectId: 'p1', content: '周总电话回复方案整体满意，希望就数据迁移部分做详细说明。', recordedBy: '李销售', recordedAt: '2026-07-02 16:00' },
    { id: 'f4', projectId: 'p3', content: '与钱经理进行了产品演示，对方对安防AI分析功能很感兴趣。', recordedBy: '刘销售', recordedAt: '2026-06-25 11:00' },
    { id: 'f5', projectId: 'p3', content: '钱经理反馈内部需要评估预算，预计下周给回复。', recordedBy: '刘销售', recordedAt: '2026-07-01 09:30' },
    { id: 'f6', projectId: 'p4', content: '与陈博士进行了技术交流，确认AI算力平台的需求规格。', recordedBy: '刘销售', recordedAt: '2026-06-22 14:00' },
    { id: 'f7', projectId: 'p4', content: '商务条款初步沟通，双方差距较大，需要进一步谈判。', recordedBy: '刘销售', recordedAt: '2026-07-02 11:00' },
  ]
  for (const f of followRecords) {
    await prisma.followRecord.upsert({ where: { id: f.id }, update: f, create: f })
  }
  console.log(`  ✓ ${followRecords.length} follow records`)

  // ── Contracts ──
  const contracts = [
    {
      id: 'cn1', customerId: 'c2', customerName: '鼎新科技有限公司', projectId: 'p2', projectName: '数据平台建设',
      contractDate: '2026-06-15', attributedTo: '2', attributedToName: '李销售',
      projectAmount: 580000, settlementAmount: 550000, extraAmount: 30000, extraTaxIncluded: true, extraPaid: false,
      customerAttribute: 'company', isFirstContract: false, approved: false, cancelled: false, submitted: true,
      stampContractUploaded: true, invoiceUploaded: false, processFiles: '[]',
      payments: [
        { id: 'pm1', condition: '合同签订', amount: 165000, completed: true, paymentDate: '2026-06-20' },
        { id: 'pm2', condition: '系统上线', amount: 220000, completed: false },
        { id: 'pm3', condition: '验收完成', amount: 165000, completed: false },
      ],
    },
    {
      id: 'cn2', customerId: 'c10', customerName: '创鑫软件有限公司', projectId: 'p7', projectName: 'DevOps平台',
      contractDate: '2026-05-20', attributedTo: '2', attributedToName: '李销售',
      projectAmount: 420000, settlementAmount: 420000, extraAmount: 0, extraTaxIncluded: false, extraPaid: false,
      customerAttribute: 'company', isFirstContract: false, approved: false, cancelled: false, submitted: false,
      stampContractUploaded: true, invoiceUploaded: true, processFiles: '[]',
      payments: [
        { id: 'pm4', condition: '合同签订', amount: 210000, completed: true, paymentDate: '2026-05-25' },
        { id: 'pm5', condition: '项目验收', amount: 210000, completed: true, paymentDate: '2026-06-30' },
      ],
    },
    {
      id: 'cn3', customerId: 'c1', customerName: '华科信息技术有限公司', projectId: 'p1', projectName: 'ERP系统部署',
      contractDate: '2026-07-01', attributedTo: '2', attributedToName: '李销售',
      projectAmount: 320000, settlementAmount: 300000, extraAmount: 20000, extraTaxIncluded: false, extraPaid: false,
      customerAttribute: 'individual', isFirstContract: true, approved: false, cancelled: false, submitted: false,
      stampContractUploaded: false, invoiceUploaded: false, processFiles: '[]',
      payments: [
        { id: 'pm6', condition: '合同签订', amount: 120000, completed: true, paymentDate: '2026-07-02' },
        { id: 'pm7', condition: '系统部署完成', amount: 90000, completed: false },
        { id: 'pm8', condition: '培训验收', amount: 90000, completed: false },
      ],
    },
    {
      id: 'cn4', customerId: 'c9', customerName: '天宇智能科技有限公司', projectId: 'p6', projectName: '智慧园区项目',
      contractDate: '2026-06-28', attributedTo: '6', attributedToName: '刘销售',
      projectAmount: 3500000, settlementAmount: 3400000, extraAmount: 100000, extraTaxIncluded: true, extraPaid: false,
      customerAttribute: 'company', isFirstContract: false, approved: false, cancelled: false, submitted: false,
      stampContractUploaded: true, invoiceUploaded: true, processFiles: '[]',
      payments: [
        { id: 'pm9', condition: '合同签订', amount: 1020000, completed: true, paymentDate: '2026-07-01' },
        { id: 'pm10', condition: '第一阶段交付', amount: 1020000, completed: false },
        { id: 'pm11', condition: '第二阶段交付', amount: 680000, completed: false },
        { id: 'pm12', condition: '最终验收', amount: 680000, completed: false },
      ],
    },
    {
      id: 'cn5', customerId: 'c3', customerName: '远航集团有限公司', projectId: 'p3', projectName: '安防监控系统',
      contractDate: '2026-06-20', attributedTo: '6', attributedToName: '刘销售',
      projectAmount: 1200000, settlementAmount: 1150000, extraAmount: 50000, extraTaxIncluded: true, extraPaid: true,
      customerAttribute: 'company', isFirstContract: false, approved: false, cancelled: false, submitted: false,
      stampContractUploaded: true, invoiceUploaded: true, processFiles: '[]',
      payments: [
        { id: 'pm13', condition: '合同签订', amount: 460000, completed: true, paymentDate: '2026-06-25' },
        { id: 'pm14', condition: '设备到场', amount: 345000, completed: true, paymentDate: '2026-07-01' },
        { id: 'pm15', condition: '调试完成', amount: 345000, completed: false },
      ],
    },
    {
      id: 'cn6', customerId: 'c5', customerName: '中科云智科技有限公司', projectId: 'p4', projectName: 'AI算力平台',
      contractDate: '2026-06-10', attributedTo: '6', attributedToName: '刘销售',
      projectAmount: 2500000, settlementAmount: 2400000, extraAmount: 100000, extraTaxIncluded: false, extraPaid: false,
      customerAttribute: 'individual', isFirstContract: true, approved: false, cancelled: false, submitted: false,
      stampContractUploaded: true, invoiceUploaded: false, processFiles: '[]',
      payments: [
        { id: 'pm16', condition: '合同签订', amount: 960000, completed: true, paymentDate: '2026-06-15' },
        { id: 'pm17', condition: '硬件交付', amount: 720000, completed: false },
        { id: 'pm18', condition: '平台上线', amount: 720000, completed: false },
      ],
    },
    {
      id: 'cn7', customerId: 'c4', customerName: '明辉电子有限公司', projectId: '', projectName: '网络改造项目',
      contractDate: '2026-07-02', attributedTo: '2', attributedToName: '李销售',
      projectAmount: 180000, settlementAmount: 170000, extraAmount: 10000, extraTaxIncluded: false, extraPaid: false,
      customerAttribute: 'company', isFirstContract: false, approved: false, cancelled: true, submitted: false,
      stampContractUploaded: false, invoiceUploaded: false, processFiles: '[]',
      payments: [
        { id: 'pm19', condition: '合同签订', amount: 85000, completed: false },
        { id: 'pm20', condition: '验收完成', amount: 85000, completed: false },
      ],
    },
  ]
  for (const c of contracts) {
    const { payments, ...data } = c
    await prisma.contract.upsert({
      where: { id: data.id },
      update: {},
      create: { ...data, payments: { create: payments } },
    })
  }
  console.log(`  ✓ ${contracts.length} contracts`)

  // ── Expenses ──
  const expenses = [
    { id: 'e1', date: '2026-06-15', category: '差旅', amount: 2800, hasInvoice: true, project: 'ERP系统部署', reason: '拜访华科信息技术周总', notes: '高铁往返+住宿一晚', status: 'approved', submittedBy: '李销售' },
    { id: 'e2', date: '2026-06-20', category: '招待', amount: 1500, hasInvoice: true, project: '数据平台建设', reason: '宴请鼎新科技决策团队', status: 'paid', submittedBy: '李销售' },
    { id: 'e3', date: '2026-06-25', category: '交通', amount: 320, hasInvoice: false, project: '智慧园区项目', reason: '市内考察园区现场', notes: '出租车', status: 'approved', submittedBy: '刘销售' },
    { id: 'e4', date: '2026-06-28', category: '办公', amount: 850, hasInvoice: true, reason: '采购办公用品', notes: '打印纸、墨盒、文件夹', status: 'pending', submittedBy: '李销售' },
    { id: 'e5', date: '2026-07-01', category: '差旅', amount: 4200, hasInvoice: true, project: 'AI算力平台', reason: '杭州出差拜访中科云智陈博士', notes: '机票+住宿2晚', status: 'pending', submittedBy: '刘销售' },
    { id: 'e6', date: '2026-07-02', category: '招待', amount: 2200, hasInvoice: true, project: '安防监控系统', reason: '远航集团高管接待', status: 'paid', submittedBy: '刘销售' },
    { id: 'e7', date: '2026-06-18', category: '交通', amount: 180, hasInvoice: false, reason: '市内拜访客户', notes: '地铁+共享单车', status: 'paid', submittedBy: '王技术' },
    { id: 'e8', date: '2026-06-22', category: '其他', amount: 600, hasInvoice: true, reason: '技术培训报名费', notes: '云计算认证考试', status: 'confirmed', submittedBy: '王技术' },
  ]
  for (const e of expenses) {
    await prisma.expense.upsert({ where: { id: e.id }, update: e, create: e })
  }
  console.log(`  ✓ ${expenses.length} expenses`)

  // ── Visits ──
  const visits = [
    { id: 'v1', date: '2026-07-01 09:00', salesperson: '李销售', customerId: 'c1', customerName: '华科信息技术有限公司', location: '深圳市南山区科技园', contact: '周总', duration: 2.5 },
    { id: 'v2', date: '2026-07-01 14:00', salesperson: '刘销售', customerId: 'c3', customerName: '远航集团有限公司', location: '上海市浦东新区陆家嘴', contact: '钱经理', duration: 1.5 },
    { id: 'v3', date: '2026-07-02 10:00', salesperson: '李销售', customerId: 'c4', customerName: '明辉电子有限公司', location: '广州市天河区', contact: '冯经理', duration: 2 },
    { id: 'v4', date: '2026-07-02 15:00', salesperson: '刘销售', customerId: 'c5', customerName: '中科云智科技有限公司', location: '杭州市余杭区未来科技城', contact: '陈博士', duration: 3 },
    { id: 'v5', date: '2026-07-03 09:30', salesperson: '李销售', customerId: 'c6', customerName: '博创科技股份', location: '成都市高新区', contact: '黄总', duration: 1 },
    { id: 'v6', date: '2026-07-03 13:00', salesperson: '刘销售', customerId: 'c9', customerName: '天宇智能科技有限公司', location: '深圳市福田区', contact: '林总', duration: 2 },
    { id: 'v7', date: '2026-06-28 11:00', salesperson: '李销售', customerId: 'c2', customerName: '鼎新科技有限公司', location: '北京市海淀区中关村', contact: '郑总', duration: 2 },
    { id: 'v8', date: '2026-06-27 09:00', salesperson: '刘销售', customerId: 'c10', customerName: '创鑫软件有限公司', location: '西安市雁塔区', contact: '杨总监', duration: 1.5 },
    { id: 'v9', date: '2026-06-26 14:00', salesperson: '李销售', customerId: 'c8', customerName: '瑞联数据科技', location: '南京市鼓楼区', contact: '马经理', duration: 2 },
    { id: 'v10', date: '2026-06-25 10:00', salesperson: '刘销售', customerId: 'c7', customerName: '恒达通信有限公司', location: '武汉市光谷', contact: '采购部', duration: 1 },
  ]
  for (const v of visits) {
    await prisma.visit.upsert({ where: { id: v.id }, update: v, create: v })
  }
  console.log(`  ✓ ${visits.length} visits`)

  // ── Tasks ──
  const tasks = [
    { id: 't1', title: '提交华科信息ERP技术方案', content: '根据周总反馈完成数据迁移详细说明并发送', assignedBy: '李销售', assignedTo: '李销售', createdAt: '2026-07-02', deadline: '2026-07-05', completed: false, source: 'customer' },
    { id: 't2', title: '鼎新科技合同审批', content: '鼎新科技数据平台合同待超级管理员审核', assignedBy: '李销售', assignedTo: '李销售', createdAt: '2026-07-01', deadline: '2026-07-04', completed: false, source: 'contract' },
    { id: 't3', title: '完成月度销售报告', content: '汇总6月份销售数据和项目跟进情况', assignedBy: '张管理', assignedTo: '李销售', createdAt: '2026-07-01', deadline: '2026-07-07', completed: false, source: 'office' },
    { id: 't4', title: '远航集团产品演示', content: '为重点客户安排安防系统产品演示', assignedBy: '刘销售', assignedTo: '刘销售', createdAt: '2026-07-02', deadline: '2026-07-08', completed: false, source: 'customer' },
    { id: 't5', title: '报销审批', content: '李销售6月差旅费用报销申请', assignedBy: '李销售', assignedTo: '张管理', createdAt: '2026-07-02', deadline: '2026-07-05', completed: false, source: 'office' },
    { id: 't6', title: '中科云智商务条款修改', content: '根据上次沟通调整商务条款', assignedBy: '刘销售', assignedTo: '刘销售', createdAt: '2026-07-03', deadline: '2026-07-10', completed: false, source: 'customer' },
  ]
  for (const t of tasks) {
    await prisma.task.upsert({ where: { id: t.id }, update: t, create: t })
  }
  console.log(`  ✓ ${tasks.length} tasks`)

  // ── AppConfig (defaults) ──
  await prisma.appConfig.upsert({
    where: { id: 'reclaim_days' },
    update: {},
    create: { id: 'reclaim_days', value: '30' },
  })

  console.log('\nSeed complete!')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
