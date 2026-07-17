import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const usersRouter = Router()

usersRouter.use(requireAuth)

usersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany()
    res.json(users.map(({ password: _, ...u }) => u))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

usersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!user) { res.status(404).json({ error: '用户不存在' }); return }
    const { password: _, ...safe } = user
    res.json(safe)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

usersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const data = { ...req.body }
    if (data.password) data.password = await bcrypt.hash(data.password, 10)
    const user = await prisma.user.create({ data })
    const { password: _, ...safe } = user
    res.status(201).json(safe)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

usersRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const data = { ...req.body }
    if (data.password) data.password = await bcrypt.hash(data.password, 10)
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
    })
    const { password: _, ...safe } = user
    res.json(safe)
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})

usersRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
