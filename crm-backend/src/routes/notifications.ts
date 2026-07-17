import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

notificationsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(await prisma.notification.findMany())
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})
notificationsRouter.post('/', async (req: Request, res: Response) => {
  try {
    res.status(201).json(await prisma.notification.create({ data: req.body }))
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})
notificationsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    res.json(await prisma.notification.update({ where: { id: req.params.id }, data: req.body }))
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})
