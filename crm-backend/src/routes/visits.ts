import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const visitsRouter = Router()
visitsRouter.use(requireAuth)

visitsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(await prisma.visit.findMany())
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
visitsRouter.post('/', async (req: Request, res: Response) => {
  try {
    res.status(201).json(await prisma.visit.create({ data: req.body }))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
visitsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    res.json(await prisma.visit.update({ where: { id: req.params.id }, data: req.body }))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
visitsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.visit.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
