import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // ── Users ──
  const password = await bcrypt.hash('admin123', 10)
  // managerId: 直属主管（报销一级审核人）
  const users = [
    { id: '1', name: '张管理', username: 'admin', password, role: 'general_manager', permissionLevel: 'super_admin', createdAt: '2024-01-01', lastLogin: '2026-07-03', disabled: false, managerId: null },
    { id: '2', name: '李销售', username: 'sales', password, role: 'salesperson', permissionLevel: 'general', createdAt: '2024-01-15', lastLogin: '2026-07-03', disabled: false, managerId: '1' },
    { id: '3', name: '王技术', username: 'tech', password, role: 'technician', permissionLevel: 'general', createdAt: '2024-02-01', lastLogin: '2026-07-01', disabled: false, managerId: '1' },
    { id: '4', name: '赵财务', username: 'finance', password, role: 'finance', permissionLevel: 'general', createdAt: '2024-03-01', lastLogin: '2026-07-02', disabled: false, managerId: null },
    { id: '5', name: '陈助理', username: 'assistant', password, role: 'sales_assistant', permissionLevel: 'admin', createdAt: '2024-04-01', lastLogin: '2026-06-30', disabled: false, managerId: '1' },
    { id: '6', name: '刘销售', username: 'sales2', password, role: 'salesperson', permissionLevel: 'general', createdAt: '2024-05-01', lastLogin: '2026-07-03', disabled: false, managerId: '5' },
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

  // ── Expenses（外勤费用报销，SOP 新流程：两级审核 + 明细 + 票据）──
  // 占位票据：1×1 png base64
  const RECEIPT = JSON.stringify([{ name: '票据凭证.png', data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', uploadedAt: '2026-07-03 10:00' }])
  const expenses = [
    {
      // 待主管审核（李销售，关联拜访 v1）
      id: 'e1', customerId: 'c1', customerName: '华科信息技术有限公司', visitId: 'v1',
      fieldworkDate: '2026-07-01', fieldworkLocation: '深圳市南山区科技园', workContent: '拜访华科信息周总，沟通ERP系统部署方案与数据迁移细节',
      notes: null, totalAmount: 680, status: 'pending_manager', submittedById: '2', submittedByName: '李销售',
      rejectReason: null, rejectedByStage: null,
      statusHistory: JSON.stringify([{ action: 'submit', operatorId: '2', operatorName: '李销售', at: '2026-07-03 09:30' }]),
      attachments: RECEIPT, createdAt: '2026-07-03 09:30', updatedAt: '2026-07-03 09:30',
      items: [
        { id: 'ei1', category: '交通', amount: 360, date: '2026-07-01', reason: '高铁往返深圳北站' },
        { id: 'ei2', category: '住宿餐', amount: 320, date: '2026-07-01', reason: '客户现场工作午餐及市内交通' },
      ],
    },
    {
      // 待主管审核（刘销售）
      id: 'e2', customerId: 'c9', customerName: '天宇智能科技有限公司', visitId: null,
      fieldworkDate: '2026-07-03', fieldworkLocation: '深圳市福田区', workContent: '与林总高层会面前现场勘查智慧园区项目点位',
      notes: '招待费用含客户方3人，超常规标准部分已提前向部门报备', totalAmount: 1280, status: 'pending_manager', submittedById: '6', submittedByName: '刘销售',
      rejectReason: null, rejectedByStage: null,
      statusHistory: JSON.stringify([{ action: 'submit', operatorId: '6', operatorName: '刘销售', at: '2026-07-04 11:00' }]),
      attachments: RECEIPT, createdAt: '2026-07-04 11:00', updatedAt: '2026-07-04 11:00',
      items: [{ id: 'ei3', category: '招待', amount: 1280, date: '2026-07-03', reason: '工作晚餐招待客户项目负责人' }],
    },
    {
      // 待财务审核（李销售，主管已通过，关联拜访 v7）
      id: 'e3', customerId: 'c2', customerName: '鼎新科技有限公司', visitId: 'v7',
      fieldworkDate: '2026-06-28', fieldworkLocation: '北京市海淀区中关村', workContent: '赴鼎新科技进行数据平台建设合同签署前商务洽谈',
      notes: null, totalAmount: 2150, status: 'pending_finance', submittedById: '2', submittedByName: '李销售',
      rejectReason: null, rejectedByStage: null,
      statusHistory: JSON.stringify([
        { action: 'submit', operatorId: '2', operatorName: '李销售', at: '2026-06-29 09:00' },
        { action: 'manager_approve', operatorId: '1', operatorName: '张管理', comment: '外勤属实，费用合理', at: '2026-06-29 14:00' },
      ]),
      attachments: RECEIPT, createdAt: '2026-06-29 09:00', updatedAt: '2026-06-29 14:00',
      items: [
        { id: 'ei4', category: '差旅', amount: 1650, date: '2026-06-28', reason: '北京往返机票' },
        { id: 'ei5', category: '交通', amount: 500, date: '2026-06-28', reason: '机场往返及市内出行' },
      ],
    },
    {
      // 审核通过待打款（刘销售，两级审核均已通过，关联拜访 v4）
      id: 'e4', customerId: 'c5', customerName: '中科云智科技有限公司', visitId: 'v4',
      fieldworkDate: '2026-07-02', fieldworkLocation: '杭州市余杭区未来科技城', workContent: '赴杭州与陈博士进行AI算力平台需求确认与技术交流',
      notes: null, totalAmount: 4200, status: 'pending_payment', submittedById: '6', submittedByName: '刘销售',
      rejectReason: null, rejectedByStage: null,
      statusHistory: JSON.stringify([
        { action: 'submit', operatorId: '6', operatorName: '刘销售', at: '2026-07-03 08:30' },
        { action: 'manager_approve', operatorId: '5', operatorName: '陈助理', comment: '出差行程与拜访记录一致', at: '2026-07-03 10:00' },
        { action: 'finance_approve', operatorId: '4', operatorName: '赵财务', comment: '票据合规，金额无误', at: '2026-07-03 15:00' },
      ]),
      attachments: RECEIPT, createdAt: '2026-07-03 08:30', updatedAt: '2026-07-03 15:00',
      items: [
        { id: 'ei6', category: '差旅', amount: 3200, date: '2026-07-02', reason: '机票及住宿2晚' },
        { id: 'ei7', category: '住宿餐', amount: 600, date: '2026-07-02', reason: '出差期间餐费' },
        { id: 'ei8', category: '交通', amount: 400, date: '2026-07-02', reason: '杭州当地出行' },
      ],
    },
    {
      // 已打款待签收（王技术，上门服务）
      id: 'e5', customerId: 'c4', customerName: '明辉电子有限公司', visitId: null,
      fieldworkDate: '2026-06-30', fieldworkLocation: '广州市天河区', workContent: '明辉电子机房现场运维及网络设备巡检',
      notes: null, totalAmount: 560, status: 'paid', submittedById: '3', submittedByName: '王技术',
      rejectReason: null, rejectedByStage: null,
      statusHistory: JSON.stringify([
        { action: 'submit', operatorId: '3', operatorName: '王技术', at: '2026-07-01 09:00' },
        { action: 'manager_approve', operatorId: '1', operatorName: '张管理', comment: '同意', at: '2026-07-01 11:00' },
        { action: 'finance_approve', operatorId: '4', operatorName: '赵财务', comment: '审核通过', at: '2026-07-01 16:00' },
        { action: 'pay', operatorId: '4', operatorName: '赵财务', comment: '已随7月第一批次打款', at: '2026-07-02 10:00' },
      ]),
      attachments: RECEIPT, createdAt: '2026-07-01 09:00', updatedAt: '2026-07-02 10:00',
      items: [
        { id: 'ei9', category: '耗材', amount: 380, date: '2026-06-30', reason: '现场更换网线及配线架耗材' },
        { id: 'ei10', category: '交通', amount: 180, date: '2026-06-30', reason: '市内往返客户现场' },
      ],
    },
    {
      // 已核销已办结（李销售）
      id: 'e6', customerId: 'c10', customerName: '创鑫软件有限公司', visitId: null,
      fieldworkDate: '2026-06-20', fieldworkLocation: '西安市雁塔区', workContent: '创鑫软件DevOps平台项目验收支持',
      notes: null, totalAmount: 980, status: 'settled', submittedById: '2', submittedByName: '李销售',
      rejectReason: null, rejectedByStage: null,
      statusHistory: JSON.stringify([
        { action: 'submit', operatorId: '2', operatorName: '李销售', at: '2026-06-21 09:00' },
        { action: 'manager_approve', operatorId: '1', operatorName: '张管理', comment: '同意', at: '2026-06-21 10:30' },
        { action: 'finance_approve', operatorId: '4', operatorName: '赵财务', comment: '审核通过', at: '2026-06-21 15:00' },
        { action: 'pay', operatorId: '4', operatorName: '赵财务', comment: '已打款', at: '2026-06-23 09:00' },
        { action: 'settle', operatorId: '2', operatorName: '李销售', comment: '已确认到账', at: '2026-06-23 12:00' },
      ]),
      attachments: RECEIPT, createdAt: '2026-06-21 09:00', updatedAt: '2026-06-23 12:00',
      items: [{ id: 'ei11', category: '差旅', amount: 980, date: '2026-06-20', reason: '西安往返高铁及住宿1晚' }],
    },
    {
      // 已驳回（主管驳回：刘销售，缺支付凭证）
      id: 'e7', customerId: 'c3', customerName: '远航集团有限公司', visitId: 'v2',
      fieldworkDate: '2026-07-01', fieldworkLocation: '上海市浦东新区陆家嘴', workContent: '与钱经理沟通安防监控系统产品演示安排',
      notes: null, totalAmount: 420, status: 'rejected', submittedById: '6', submittedByName: '刘销售',
      rejectReason: '交通费缺少行程单及支付凭证，请补充材料后重新提交', rejectedByStage: 'manager',
      statusHistory: JSON.stringify([
        { action: 'submit', operatorId: '6', operatorName: '刘销售', at: '2026-07-02 09:00' },
        { action: 'manager_reject', operatorId: '5', operatorName: '陈助理', comment: '交通费缺少行程单及支付凭证，请补充材料后重新提交', at: '2026-07-02 14:00' },
      ]),
      attachments: RECEIPT, createdAt: '2026-07-02 09:00', updatedAt: '2026-07-02 14:00',
      items: [{ id: 'ei12', category: '交通', amount: 420, date: '2026-07-01', reason: '上海市内出行' }],
    },
    {
      // 已驳回（财务驳回：李销售，发票抬头错误）
      id: 'e8', customerId: 'c1', customerName: '华科信息技术有限公司', visitId: null,
      fieldworkDate: '2026-06-25', fieldworkLocation: '深圳市南山区', workContent: '华科信息ERP项目驻场需求调研',
      notes: null, totalAmount: 750, status: 'rejected', submittedById: '2', submittedByName: '李销售',
      rejectReason: '住宿发票抬头为个人姓名，不符合报销制度，请换开公司抬头发票后重新提交', rejectedByStage: 'finance',
      statusHistory: JSON.stringify([
        { action: 'submit', operatorId: '2', operatorName: '李销售', at: '2026-06-26 09:00' },
        { action: 'manager_approve', operatorId: '1', operatorName: '张管理', comment: '外勤属实', at: '2026-06-26 11:00' },
        { action: 'finance_reject', operatorId: '4', operatorName: '赵财务', comment: '住宿发票抬头为个人姓名，不符合报销制度，请换开公司抬头发票后重新提交', at: '2026-06-26 16:30' },
      ]),
      attachments: RECEIPT, createdAt: '2026-06-26 09:00', updatedAt: '2026-06-26 16:30',
      items: [{ id: 'ei13', category: '住宿餐', amount: 750, date: '2026-06-25', reason: '驻场调研住宿1晚' }],
    },
  ]
  for (const e of expenses) {
    const { items, ...data } = e
    await prisma.expense.upsert({
      where: { id: data.id },
      update: {},
      create: { ...data, items: { create: items } },
    })
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
    { id: 't1', title: '提交华科信息ERP技术方案', content: '根据周总反馈完成数据迁移详细说明并发送', assignedBy: '李销售', assignedTo: '李销售', createdAt: '2026-07-02', deadline: '2026-07-05', completed: false, status: 'pending', source: 'customer' },
    { id: 't2', title: '鼎新科技合同审批', content: '鼎新科技数据平台合同待超级管理员审核', assignedBy: '李销售', assignedTo: '李销售', createdAt: '2026-07-01', deadline: '2026-07-04', completed: false, status: 'pending', source: 'contract' },
    { id: 't3', title: '完成月度销售报告', content: '汇总6月份销售数据和项目跟进情况', assignedBy: '张管理', assignedTo: '李销售', createdAt: '2026-07-01', deadline: '2026-07-07', completed: false, status: 'pending', source: 'office' },
    { id: 't4', title: '远航集团产品演示', content: '为重点客户安排安防系统产品演示', assignedBy: '刘销售', assignedTo: '刘销售', createdAt: '2026-07-02', deadline: '2026-07-08', completed: false, status: 'pending', source: 'customer' },
    { id: 't5', title: '报销审批', content: '李销售6月差旅费用报销申请', assignedBy: '李销售', assignedTo: '张管理', createdAt: '2026-07-02', deadline: '2026-07-05', completed: false, status: 'pending', source: 'office' },
    { id: 't6', title: '中科云智商务条款修改', content: '根据上次沟通调整商务条款', assignedBy: '刘销售', assignedTo: '刘销售', createdAt: '2026-07-03', deadline: '2026-07-10', completed: false, status: 'pending', source: 'customer' },
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
