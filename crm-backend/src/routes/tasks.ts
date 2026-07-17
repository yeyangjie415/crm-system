import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const tasksRouter = Router()
tasksRouter.use(requireAuth)

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
    res.json(await prisma.task.update({ where: { id: req.params.id }, data: req.body }))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
tasksRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.task.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
