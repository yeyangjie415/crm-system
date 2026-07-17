import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const contractsRouter = Router()

contractsRouter.use(requireAuth)

// List all
contractsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const contracts = await prisma.contract.findMany({
      include: { payments: true, archivedFiles: true },
    })
    res.json(contracts.map(c => ({ ...c, processFiles: JSON.parse(c.processFiles) })))
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Get one
contractsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const c = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: { payments: true, archivedFiles: true },
    })
    if (!c) { res.status(404).json({ error: '合同不存在' }); return }
    res.json({ ...c, processFiles: JSON.parse(c.processFiles) })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Create
contractsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { payments, archivedFiles, processFiles, ...data } = req.body
    const contract = await prisma.contract.create({
      data: {
        ...data,
        processFiles: JSON.stringify(processFiles || []),
        payments: payments?.length ? { create: payments } : undefined,
        archivedFiles: archivedFiles?.length ? { create: archivedFiles } : undefined,
      },
      include: { payments: true, archivedFiles: true },
    })
    res.status(201).json({ ...contract, processFiles: JSON.parse(contract.processFiles) })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Update
contractsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { processFiles, ...data } = req.body
    const updateData: any = { ...data }
    if (processFiles !== undefined) updateData.processFiles = JSON.stringify(processFiles)
    const c = await prisma.contract.update({
      where: { id: req.params.id },
      data: updateData,
      include: { payments: true, archivedFiles: true },
    })
    res.json({ ...c, processFiles: JSON.parse(c.processFiles) })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Delete
contractsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    await prisma.contract.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Payments
contractsRouter.put('/:id/payments/:paymentId', async (req: Request, res: Response) => {
  try {
    const p = await prisma.payment.update({
      where: { id: req.params.paymentId },
      data: req.body,
    })
    res.json(p)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

contractsRouter.post('/:id/payments', async (req: Request, res: Response) => {
  try {
    const p = await prisma.payment.create({
      data: { ...req.body, contractId: req.params.id },
    })
    res.status(201).json(p)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

contractsRouter.delete('/:id/payments/:paymentId', async (req: Request, res: Response) => {
  try {
    await prisma.payment.delete({ where: { id: req.params.paymentId } })
    res.status(204).send()
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Archived files
contractsRouter.post('/:id/archived-files', async (req: Request, res: Response) => {
  try {
    const f = await prisma.archivedFile.create({
      data: { ...req.body, contractId: req.params.id },
    })
    res.status(201).json(f)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

contractsRouter.delete('/:id/archived-files/:fileId', async (req: Request, res: Response) => {
  try {
    await prisma.archivedFile.delete({ where: { id: req.params.fileId } })
    res.status(204).send()
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})
