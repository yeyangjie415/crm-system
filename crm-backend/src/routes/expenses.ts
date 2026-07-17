import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const expensesRouter = Router()
expensesRouter.use(requireAuth)

expensesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(await prisma.expense.findMany())
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
expensesRouter.post('/', async (req: Request, res: Response) => {
  try {
    res.status(201).json(await prisma.expense.create({ data: req.body }))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
expensesRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    res.json(await prisma.expense.update({ where: { id: req.params.id }, data: req.body }))
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
expensesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.expense.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
})
