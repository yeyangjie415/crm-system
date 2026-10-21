import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const tasksRouter = Router()
tasksRouter.use(requireAuth)

/* ------------------------------------------------------------------ */
/*  任务状态机                                                         */
/*  pending（进行中）→ submitted（待发件人确认）→ completed（已完成）   */
/*  发件人可驳回 submitted → pending（需填原因）；发件人/管理员可重开    */
/* ------------------------------------------------------------------ */

const now = () => new Date().toISOString().replace('T', ' ').slice(0, 16)

const genId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const isAdminLevel = (u: { permissionLevel: string }) =>
  u.permissionLevel === 'admin' || u.permissionLevel === 'super_admin'

async function getActor(req: Request) {
  return prisma.user.findUnique({ where: { id: req.auth!.userId } })
}

/** 创建任务通知；任务按姓名关联用户，查不到目标则静默跳过（仍改状态） */
async function taskNotify(
  type: 'task_submitted' | 'task_approved' | 'task_rejected',
  from: { id: string; name: string },
  task: { id: string; title: string },
  toUserId: string | null | undefined,
  comment?: string,
) {
  if (!toUserId || toUserId === from.id) return
  await prisma.notification.create({
    data: {
      id: genId('n'),
      type,
      fromUserId: from.id,
      fromUserName: from.name,
      toUserId,
      customerId: '',
      customerName: task.title,
      status: type === 'task_submitted' ? 'pending' : type === 'task_approved' ? 'approved' : 'rejected',
      createdAt: now(),
      read: false,
      taskId: task.id,
      comment: comment ?? null,
    },
  })
}

/** 发件人用户 id（按姓名反查；assignedBy/assignedTo 存的是姓名） */
async function senderUserId(task: { assignedBy: string }) {
  return prisma.user.findFirst({ where: { name: task.assignedBy } })
}

/** 被指派者用户 id */
async function assigneeUserId(task: { assignedTo: string }) {
  return prisma.user.findFirst({ where: { name: task.assignedTo } })
}

tasksRouter.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(await prisma.task.findMany())
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

tasksRouter.post('/', async (req: Request, res: Response) => {
  try {
    res.status(201).json(await prisma.task.create({ data: req.body }))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

tasksRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: String(req.params.id) } })
    if (!task) return res.status(404).json({ error: '任务不存在' })
    const actor = await getActor(req)
    if (!actor) return res.status(403).json({ error: '用户不存在' })
    if (actor.name !== task.assignedBy && !isAdminLevel(actor)) {
      return res.status(403).json({ error: '仅发件人可修改该任务' })
    }

    const { status, completed, ...rest } = req.body ?? {}
    let data: Record<string, unknown> = rest
    if (status !== undefined || completed !== undefined) {
      // 状态机流转只走专用接口；此处仅允许发件人/管理员"重开"（回到进行中）
      if (status === 'pending') {
        data = { ...rest, status: 'pending', completed: false }
      } else {
        return res.status(409).json({ error: '状态变更请通过提交/审批接口' })
      }
    }
    res.json(await prisma.task.update({ where: { id: task.id }, data }))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

tasksRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.task.delete({ where: { id: String(req.params.id) } })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

/** 被指派者提交完成申请（自指派直接完成，不发通知） */
tasksRouter.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: String(req.params.id) } })
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (task.status !== 'pending') return res.status(409).json({ error: '当前状态不可提交完成' })
    const actor = await getActor(req)
    if (!actor) return res.status(403).json({ error: '用户不存在' })
    if (actor.name !== task.assignedTo && !isAdminLevel(actor)) {
      return res.status(403).json({ error: '仅被指派者可提交完成' })
    }

    if (task.assignedBy === task.assignedTo) {
      res.json(await prisma.task.update({ where: { id: task.id }, data: { status: 'completed', completed: true } }))
      return
    }
    const updated = await prisma.task.update({ where: { id: task.id }, data: { status: 'submitted', completed: false } })
    const sender = await senderUserId(task)
    await taskNotify('task_submitted', actor, task, sender?.id)
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

/** 发件人同意完成 */
tasksRouter.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: String(req.params.id) } })
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (task.status !== 'submitted') return res.status(409).json({ error: '当前状态不可审批' })
    const actor = await getActor(req)
    if (!actor) return res.status(403).json({ error: '用户不存在' })
    if (actor.name !== task.assignedBy && !isAdminLevel(actor)) {
      return res.status(403).json({ error: '仅发件人可审批' })
    }

    const updated = await prisma.task.update({ where: { id: task.id }, data: { status: 'completed', completed: true } })
    const assignee = await assigneeUserId(task)
    await taskNotify('task_approved', actor, task, assignee?.id)
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

/** 发件人驳回（需填原因），任务回到进行中 */
tasksRouter.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: String(req.params.id) } })
    if (!task) return res.status(404).json({ error: '任务不存在' })
    if (task.status !== 'submitted') return res.status(409).json({ error: '当前状态不可审批' })
    const actor = await getActor(req)
    if (!actor) return res.status(403).json({ error: '用户不存在' })
    if (actor.name !== task.assignedBy && !isAdminLevel(actor)) {
      return res.status(403).json({ error: '仅发件人可审批' })
    }
    const reason = String((req.body ?? {}).reason ?? '').trim()
    if (!reason) return res.status(400).json({ error: '驳回必须填写原因' })

    const updated = await prisma.task.update({ where: { id: task.id }, data: { status: 'pending', completed: false } })
    const assignee = await assigneeUserId(task)
    await taskNotify('task_rejected', actor, task, assignee?.id, reason)
    res.json(updated)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
