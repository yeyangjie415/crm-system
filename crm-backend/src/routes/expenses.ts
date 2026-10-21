import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const expensesRouter = Router()
expensesRouter.use(requireAuth)

/* ------------------------------------------------------------------ */
/*  外勤费用报销 SOP 状态机                                            */
/*  pending_manager → pending_finance → pending_payment → paid → settled */
/*  任一审核环节可驳回 → rejected（申请人修改后重新提交回 pending_manager）*/
/* ------------------------------------------------------------------ */

const CATEGORIES = ['交通', '差旅', '住宿餐', '招待', '耗材', '杂费']

const now = () => new Date().toISOString().replace('T', ' ').slice(0, 16)

const genId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

interface HistoryEntry {
  action: string
  operatorId: string
  operatorName: string
  comment?: string
  at: string
}

interface Attachment {
  name: string
  data: string
  uploadedAt: string
}

interface ItemInput {
  id?: string
  category: string
  amount: number
  date: string
  reason: string
}

/* ---------- 权限辅助 ---------- */

const isAdminLevel = (u: { permissionLevel: string }) =>
  u.permissionLevel === 'admin' || u.permissionLevel === 'super_admin'

/** 财务动作：财务岗位或管理员级 */
const canFinanceAct = (u: { role: string; permissionLevel: string }) =>
  u.role === 'finance' || isAdminLevel(u)

/** 一级审核：提交人的直属主管；提交人未设主管时由管理员级兜底 */
async function canManagerReview(actor: { id: string; permissionLevel: string }, expense: { submittedById: string }) {
  if (isAdminLevel(actor)) return true
  const submitter = await prisma.user.findUnique({ where: { id: expense.submittedById } })
  return !!submitter?.managerId && submitter.managerId === actor.id
}

async function getActor(req: Request) {
  return prisma.user.findUnique({ where: { id: req.auth!.userId } })
}

/* ---------- 审计 + 通知 + 流水 ---------- */

async function writeAudit(
  user: { id: string; name: string },
  action: string,
  expense: { id: string; customerName: string },
  detail: string,
) {
  await prisma.auditLog.create({
    data: {
      id: genId('log'),
      userId: user.id,
      userName: user.name,
      action,
      targetType: 'expense',
      targetId: expense.id,
      targetName: expense.customerName,
      detail,
      timestamp: now(),
    },
  })
}

function parseHistory(raw: string): HistoryEntry[] {
  try { return JSON.parse(raw) as HistoryEntry[] } catch { return [] }
}

async function appendHistory(expenseId: string, currentRaw: string, entry: HistoryEntry) {
  const history = parseHistory(currentRaw)
  history.push(entry)
  await prisma.expense.update({
    where: { id: expenseId },
    data: { statusHistory: JSON.stringify(history), updatedAt: now() },
  })
}

async function notify(
  type: string,
  from: { id: string; name: string },
  toUserIds: string[],
  expense: { id: string; customerId: string; customerName: string },
) {
  for (const toUserId of toUserIds) {
    if (toUserId === from.id) continue
    await prisma.notification.create({
      data: {
        id: genId('n'),
        type,
        fromUserId: from.id,
        fromUserName: from.name,
        toUserId,
        customerId: expense.customerId,
        customerName: expense.customerName,
        status: 'pending',
        createdAt: now(),
        read: false,
        expenseId: expense.id,
      },
    })
  }
}

/** 一级审核接收人：提交人的直属主管；无主管则通知全体管理员级用户 */
async function managerReviewerIds(submittedById: string): Promise<string[]> {
  const submitter = await prisma.user.findUnique({ where: { id: submittedById } })
  if (submitter?.managerId) return [submitter.managerId]
  const admins = await prisma.user.findMany({
    where: { disabled: false, permissionLevel: { in: ['admin', 'super_admin'] } },
  })
  return admins.map(a => a.id)
}

async function financeUserIds(): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { disabled: false, OR: [{ role: 'finance' }, { permissionLevel: { in: ['admin', 'super_admin'] } }] },
  })
  return users.map(u => u.id)
}

/* ---------- 校验 ---------- */

function validatePayload(body: any): string | null {
  if (!body.customerId || !body.customerName) return '必须关联 CRM 已登记客户'
  if (!body.fieldworkDate) return '请填写外勤时间'
  if (!body.fieldworkLocation?.trim()) return '请填写外勤地点'
  if (!body.workContent?.trim()) return '请填写工作内容'
  const items = body.items as ItemInput[] | undefined
  if (!Array.isArray(items) || items.length === 0) return '请至少填写一条费用明细'
  for (const [i, it] of items.entries()) {
    if (!CATEGORIES.includes(it.category)) return `第 ${i + 1} 条明细的费用类型无效`
    if (!(Number(it.amount) > 0)) return `第 ${i + 1} 条明细的金额必须大于 0`
    if (!it.date) return `第 ${i + 1} 条明细缺少消费日期`
    if (!it.reason?.trim()) return `第 ${i + 1} 条明细缺少消费事由`
  }
  const attachments = body.attachments as Attachment[] | undefined
  if (!Array.isArray(attachments) || attachments.length === 0) return '请上传票据凭证（发票、行程单、支付凭证等）'
  for (const a of attachments) {
    if (!a.name || !a.data) return '票据附件数据不完整'
  }
  return null
}

/** 重复申报检测：同提交人 + 同客户 + 同总额，且存在日期与类型均相同的明细，状态非驳回 */
async function findDuplicate(submittedById: string, customerId: string, totalAmount: number, items: ItemInput[], excludeId?: string) {
  const candidates = await prisma.expense.findMany({
    where: { submittedById, customerId, totalAmount, status: { not: 'rejected' }, ...(excludeId ? { NOT: { id: excludeId } } : {}) },
    include: { items: true },
  })
  return candidates.find(exp =>
    exp.items.some(line => items.some(i => i.date === line.date && i.category === line.category)),
  )
}

const serialize = (exp: any) => ({
  ...exp,
  statusHistory: parseHistory(exp.statusHistory ?? '[]'),
  attachments: (() => { try { return JSON.parse(exp.attachments ?? '[]') } catch { return [] } })(),
})

/* ================================ 路由 ================================ */

/** 列表：管理员级/财务可见全部；一般用户可见本人提交 + 下属（以自己为主管）单据 */
expensesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req)
    if (!actor) { res.status(401).json({ error: '用户不存在' }); return }

    let expenses
    if (isAdminLevel(actor) || actor.role === 'finance') {
      expenses = await prisma.expense.findMany({ include: { items: true }, orderBy: { createdAt: 'desc' } })
    } else {
      const subordinates = await prisma.user.findMany({ where: { managerId: actor.id } })
      expenses = await prisma.expense.findMany({
        where: { submittedById: { in: [actor.id, ...subordinates.map(s => s.id)] } },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      })
    }
    res.json(expenses.map(serialize))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

expensesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const exp = await prisma.expense.findUnique({ where: { id: req.params.id as string }, include: { items: true } })
    if (!exp) { res.status(404).json({ error: '报销单不存在' }); return }
    res.json(serialize(exp))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

/** 提交报销申请 */
expensesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req)
    if (!actor) { res.status(401).json({ error: '用户不存在' }); return }

    const body = req.body ?? {}
    const invalid = validatePayload(body)
    if (invalid) { res.status(400).json({ error: invalid }); return }

    const customer = await prisma.customer.findUnique({ where: { id: body.customerId } })
    if (!customer || customer.deleted) { res.status(400).json({ error: '关联客户不存在或已删除，无登记记录不予报销' }); return }

    const items = body.items as ItemInput[]
    const totalAmount = items.reduce((s, i) => s + Number(i.amount), 0)

    const dup = await findDuplicate(actor.id, body.customerId, totalAmount, items)
    if (dup) { res.status(409).json({ error: `疑似重复申报：与该客户已存在的报销单（${dup.createdAt.slice(0, 10)} 提交）存在相同日期与类型的费用，请勿重复报销同笔费用` }); return }

    const ts = now()
    const history: HistoryEntry[] = [{ action: 'submit', operatorId: actor.id, operatorName: actor.name, at: ts }]
    const exp = await prisma.expense.create({
      data: {
        id: genId('e'),
        customerId: body.customerId,
        customerName: body.customerName,
        visitId: body.visitId || null,
        fieldworkDate: body.fieldworkDate,
        fieldworkLocation: body.fieldworkLocation.trim(),
        workContent: body.workContent.trim(),
        notes: body.notes?.trim() || null,
        totalAmount,
        status: 'pending_manager',
        submittedById: actor.id,
        submittedByName: actor.name,
        statusHistory: JSON.stringify(history),
        attachments: JSON.stringify(body.attachments as Attachment[]),
        createdAt: ts,
        updatedAt: ts,
        items: { create: items.map(i => ({ id: genId('ei'), category: i.category, amount: Number(i.amount), date: i.date, reason: i.reason.trim() })) },
      },
      include: { items: true },
    })

    await writeAudit(actor, 'expense_submit', exp, `提交外勤费用报销，客户：${exp.customerName}，金额 ¥${totalAmount}`)
    await notify('expense_submitted', actor, await managerReviewerIds(actor.id), exp)

    res.status(201).json(serialize(exp))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

/** 修改重提：仅提交人本人、仅 pending_manager/rejected；rejected 保存后重新进入审核 */
expensesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req)
    if (!actor) { res.status(401).json({ error: '用户不存在' }); return }

    const exp = await prisma.expense.findUnique({ where: { id: req.params.id as string }, include: { items: true } })
    if (!exp) { res.status(404).json({ error: '报销单不存在' }); return }
    if (exp.submittedById !== actor.id) { res.status(403).json({ error: '只能修改本人提交的报销单' }); return }
    if (exp.status !== 'pending_manager' && exp.status !== 'rejected') {
      res.status(403).json({ error: '当前状态不允许修改（仅待主管审核/已驳回的单据可修改）' }); return
    }

    const body = req.body ?? {}
    const invalid = validatePayload(body)
    if (invalid) { res.status(400).json({ error: invalid }); return }

    const items = body.items as ItemInput[]
    const totalAmount = items.reduce((s, i) => s + Number(i.amount), 0)
    const dup = await findDuplicate(actor.id, body.customerId, totalAmount, items, exp.id)
    if (dup) { res.status(409).json({ error: '疑似重复申报：存在相同日期与类型的未驳回费用，请勿重复报销同笔费用' }); return }

    const wasRejected = exp.status === 'rejected'
    const ts = now()

    await prisma.$transaction([
      prisma.expenseItem.deleteMany({ where: { expenseId: exp.id } }),
      prisma.expense.update({
        where: { id: exp.id },
        data: {
          customerId: body.customerId,
          customerName: body.customerName,
          visitId: body.visitId || null,
          fieldworkDate: body.fieldworkDate,
          fieldworkLocation: body.fieldworkLocation.trim(),
          workContent: body.workContent.trim(),
          notes: body.notes?.trim() || null,
          totalAmount,
          status: 'pending_manager',
          rejectReason: null,
          rejectedByStage: null,
          attachments: JSON.stringify(body.attachments as Attachment[]),
          updatedAt: ts,
          items: { create: items.map(i => ({ id: genId('ei'), category: i.category, amount: Number(i.amount), date: i.date, reason: i.reason.trim() })) },
        },
      }),
    ])

    if (wasRejected) {
      await appendHistory(exp.id, exp.statusHistory, { action: 'resubmit', operatorId: actor.id, operatorName: actor.name, comment: '驳回问题整改后重新提交', at: ts })
      await notify('expense_submitted', actor, await managerReviewerIds(actor.id), exp)
    }

    const updated = await prisma.expense.findUnique({ where: { id: exp.id }, include: { items: true } })
    await writeAudit(actor, wasRejected ? 'expense_resubmit' : 'expense_edit', exp, wasRejected ? '驳回问题整改后重新提交' : '修改待审核报销单')
    res.json(serialize(updated!))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

/** 删除：提交人本人（pending_manager/rejected）或管理员级 */
expensesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req)
    if (!actor) { res.status(401).json({ error: '用户不存在' }); return }

    const exp = await prisma.expense.findUnique({ where: { id: req.params.id as string } })
    if (!exp) { res.status(404).json({ error: '报销单不存在' }); return }

    // 核销办结归档的单据仅系统管理员可删除（SOP：办结单据永久留存）
    if (exp.status === 'settled' && !isAdminLevel(actor)) {
      res.status(403).json({ error: '核销办结归档的报销单仅系统管理员可删除' }); return
    }
    const isOwnerDraft = exp.submittedById === actor.id && (exp.status === 'pending_manager' || exp.status === 'rejected')
    if (!isOwnerDraft && !isAdminLevel(actor)) {
      res.status(403).json({ error: '仅可删除本人待审核/已驳回的报销单' }); return
    }

    await prisma.expense.delete({ where: { id: exp.id } })
    await writeAudit(actor, 'expense_delete', exp, `删除报销单（客户：${exp.customerName}，金额 ¥${exp.totalAmount}）`)
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

/* ---------- 状态流转 ---------- */

/** 一级审核（直属主管）：通过 / 驳回 */
expensesRouter.post('/:id/manager-review', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req)
    if (!actor) { res.status(401).json({ error: '用户不存在' }); return }

    const exp = await prisma.expense.findUnique({ where: { id: req.params.id as string } })
    if (!exp) { res.status(404).json({ error: '报销单不存在' }); return }
    if (exp.status !== 'pending_manager') { res.status(409).json({ error: '单据当前状态不可进行一级审核' }); return }
    if (!(await canManagerReview(actor, exp))) { res.status(403).json({ error: '您不是该单据提交人的直属主管，无权进行一级审核' }); return }

    const { approved, comment } = req.body ?? {}
    if (!approved && !(comment as string)?.trim()) { res.status(400).json({ error: '驳回必须填写驳回原因' }); return }

    const ts = now()
    if (approved) {
      await prisma.expense.update({ where: { id: exp.id }, data: { status: 'pending_finance', updatedAt: ts } })
      await appendHistory(exp.id, exp.statusHistory, { action: 'manager_approve', operatorId: actor.id, operatorName: actor.name, comment: (comment as string)?.trim() || undefined, at: ts })
      await writeAudit(actor, 'expense_manager_approve', exp, '一级审核（主管）通过')
      await notify('expense_manager_approved', actor, await financeUserIds(), exp)
    } else {
      await prisma.expense.update({
        where: { id: exp.id },
        data: { status: 'rejected', rejectReason: (comment as string).trim(), rejectedByStage: 'manager', updatedAt: ts },
      })
      await appendHistory(exp.id, exp.statusHistory, { action: 'manager_reject', operatorId: actor.id, operatorName: actor.name, comment: (comment as string).trim(), at: ts })
      await writeAudit(actor, 'expense_manager_reject', exp, `一级审核（主管）驳回：${(comment as string).trim()}`)
      await notify('expense_rejected', actor, [exp.submittedById], exp)
    }
    const updated = await prisma.expense.findUnique({ where: { id: exp.id }, include: { items: true } })
    res.json(serialize(updated!))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

/** 二级审核（财务）：通过 / 驳回 */
expensesRouter.post('/:id/finance-review', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req)
    if (!actor) { res.status(401).json({ error: '用户不存在' }); return }

    const exp = await prisma.expense.findUnique({ where: { id: req.params.id as string } })
    if (!exp) { res.status(404).json({ error: '报销单不存在' }); return }
    if (exp.status !== 'pending_finance') { res.status(409).json({ error: '单据当前状态不可进行财务审核' }); return }
    if (!canFinanceAct(actor)) { res.status(403).json({ error: '需要财务角色或管理员权限' }); return }

    const { approved, comment } = req.body ?? {}
    if (!approved && !(comment as string)?.trim()) { res.status(400).json({ error: '驳回必须填写驳回原因' }); return }

    const ts = now()
    if (approved) {
      await prisma.expense.update({ where: { id: exp.id }, data: { status: 'pending_payment', updatedAt: ts } })
      await appendHistory(exp.id, exp.statusHistory, { action: 'finance_approve', operatorId: actor.id, operatorName: actor.name, comment: (comment as string)?.trim() || undefined, at: ts })
      await writeAudit(actor, 'expense_finance_approve', exp, '二级审核（财务）通过，进入核销打款流程')
      await notify('expense_finance_approved', actor, [exp.submittedById], exp)
    } else {
      await prisma.expense.update({
        where: { id: exp.id },
        data: { status: 'rejected', rejectReason: (comment as string).trim(), rejectedByStage: 'finance', updatedAt: ts },
      })
      await appendHistory(exp.id, exp.statusHistory, { action: 'finance_reject', operatorId: actor.id, operatorName: actor.name, comment: (comment as string).trim(), at: ts })
      await writeAudit(actor, 'expense_finance_reject', exp, `二级审核（财务）驳回：${(comment as string).trim()}`)
      await notify('expense_rejected', actor, [exp.submittedById], exp)
    }
    const updated = await prisma.expense.findUnique({ where: { id: exp.id }, include: { items: true } })
    res.json(serialize(updated!))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

/** 财务核销打款 */
expensesRouter.post('/:id/pay', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req)
    if (!actor) { res.status(401).json({ error: '用户不存在' }); return }

    const exp = await prisma.expense.findUnique({ where: { id: req.params.id as string } })
    if (!exp) { res.status(404).json({ error: '报销单不存在' }); return }
    if (exp.status !== 'pending_payment') { res.status(409).json({ error: '单据当前状态不可打款' }); return }
    if (!canFinanceAct(actor)) { res.status(403).json({ error: '需要财务角色或管理员权限' }); return }

    const ts = now()
    const comment = (req.body?.comment as string)?.trim() || undefined
    await prisma.expense.update({ where: { id: exp.id }, data: { status: 'paid', updatedAt: ts } })
    await appendHistory(exp.id, exp.statusHistory, { action: 'pay', operatorId: actor.id, operatorName: actor.name, comment, at: ts })
    await writeAudit(actor, 'expense_pay', exp, `财务打款 ¥${exp.totalAmount}`)
    await notify('expense_paid', actor, [exp.submittedById], exp)

    const updated = await prisma.expense.findUnique({ where: { id: exp.id }, include: { items: true } })
    res.json(serialize(updated!))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

/** 申请人签收确认 → 已核销已办结 */
expensesRouter.post('/:id/settle', async (req: Request, res: Response) => {
  try {
    const actor = await getActor(req)
    if (!actor) { res.status(401).json({ error: '用户不存在' }); return }

    const exp = await prisma.expense.findUnique({ where: { id: req.params.id as string } })
    if (!exp) { res.status(404).json({ error: '报销单不存在' }); return }
    if (exp.status !== 'paid') { res.status(409).json({ error: '单据当前状态不可签收' }); return }
    if (exp.submittedById !== actor.id) { res.status(403).json({ error: '仅申请人本人可签收确认' }); return }

    const ts = now()
    await prisma.expense.update({ where: { id: exp.id }, data: { status: 'settled', updatedAt: ts } })
    await appendHistory(exp.id, exp.statusHistory, { action: 'settle', operatorId: actor.id, operatorName: actor.name, comment: '已确认到账', at: ts })
    await writeAudit(actor, 'expense_settle', exp, '申请人签收确认，单据核销办结归档')

    const updated = await prisma.expense.findUnique({ where: { id: exp.id }, include: { items: true } })
    res.json(serialize(updated!))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
