import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const followRecordsRouter = Router()
followRecordsRouter.use(requireAuth)

followRecordsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query
    const where = projectId ? { projectId: String(projectId) } : {}
    res.json(await prisma.followRecord.findMany({ where }))
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

followRecordsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const record = await prisma.followRecord.create({ data: req.body })
    res.status(201).json(record)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

followRecordsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.followRecord.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})
