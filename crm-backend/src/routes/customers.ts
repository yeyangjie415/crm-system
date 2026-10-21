import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const customersRouter = Router()

customersRouter.use(requireAuth)

// List all
customersRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { contacts: true, projects: true, contracts: true },
    })
    const parsed = customers.map(c => ({
      ...c,
      accessControl: JSON.parse(c.accessControl),
      annotations: JSON.parse(c.annotations),
      hiddenBy: JSON.parse(c.hiddenBy),
    }))
    res.json(parsed)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Get one
customersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const c = await prisma.customer.findUnique({
      where: { id: req.params.id },
      include: { contacts: true, projects: true, contracts: true },
    })
    if (!c) { res.status(404).json({ error: '客户不存在' }); return }
    res.json({ ...c, accessControl: JSON.parse(c.accessControl), annotations: JSON.parse(c.annotations), hiddenBy: JSON.parse(c.hiddenBy) })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Create
customersRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { contacts, projects, accessControl, annotations, hiddenBy, ...data } = req.body
    const customer = await prisma.customer.create({
      data: {
        ...data,
        accessControl: JSON.stringify(accessControl || []),
        annotations: JSON.stringify(annotations || []),
        hiddenBy: JSON.stringify(hiddenBy || []),
        contacts: contacts?.length ? { create: contacts.map((c: any) => { const { customerId, ...rest } = c; return rest }) } : undefined,
        projects: projects?.length ? { create: projects } : undefined,
      },
      include: { contacts: true, projects: true },
    })
    res.status(201).json({ ...customer, accessControl: JSON.parse(customer.accessControl), annotations: JSON.parse(customer.annotations), hiddenBy: JSON.parse(customer.hiddenBy) })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Update
customersRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { projects, accessControl, annotations, hiddenBy, ...data } = req.body
    const updateData: any = { ...data }
    if (accessControl !== undefined) updateData.accessControl = JSON.stringify(accessControl)
    if (annotations !== undefined) updateData.annotations = JSON.stringify(annotations)
    if (hiddenBy !== undefined) updateData.hiddenBy = JSON.stringify(hiddenBy)

    if (projects) {
      await prisma.project.deleteMany({ where: { customerId: req.params.id } })
      if (projects.length) {
        await prisma.project.createMany({ data: projects.map((p: any) => ({ ...p, customerId: req.params.id })) })
      }
    }

    const c = await prisma.customer.update({
      where: { id: req.params.id },
      data: updateData,
      include: { contacts: true, projects: true },
    })
    res.json({ ...c, accessControl: JSON.parse(c.accessControl), annotations: JSON.parse(c.annotations), hiddenBy: JSON.parse(c.hiddenBy) })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Soft delete
customersRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body
    const c = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        hiddenBy: JSON.stringify([userId]),
        deletedBy: userName,
        deletedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      },
    })
    res.json(c)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Hard delete — permanently removes record
customersRouter.delete('/:id/hard', async (req: Request, res: Response) => {
  try {
    // Delete related records first
    await prisma.contact.deleteMany({ where: { customerId: req.params.id } })
    await prisma.project.deleteMany({ where: { customerId: req.params.id } })
    await prisma.contract.deleteMany({ where: { customerId: req.params.id } })
    await prisma.customer.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Claim from public pool
customersRouter.post('/:id/claim', async (req: Request, res: Response) => {
  try {
    const { userId, userName } = req.body
    const c = await prisma.customer.update({
      where: { id: req.params.id },
      data: { ownedBy: userId, ownedByName: userName, reclaimedAt: null, hiddenBy: '[]', deletedBy: null, deletedAt: null },
    })
    res.json(c)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Release to public pool
customersRouter.post('/:id/release', async (req: Request, res: Response) => {
  try {
    const c = await prisma.customer.update({
      where: { id: req.params.id },
      data: { ownedBy: null, ownedByName: null, reclaimedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) },
    })
    res.json(c)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Public pool list
customersRouter.get('/pool/public', async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { ownedBy: null, deleted: false },
      include: { contacts: true },
    })
    res.json(customers.map(c => ({ ...c, accessControl: JSON.parse(c.accessControl), annotations: JSON.parse(c.annotations), hiddenBy: JSON.parse(c.hiddenBy) })))
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

// Contacts CRUD
customersRouter.post('/:id/contacts', async (req: Request, res: Response) => {
  try {
    const contact = await prisma.contact.create({
      data: { ...req.body, customerId: req.params.id },
    })
    res.status(201).json(contact)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

customersRouter.put('/:id/contacts/:contactId', async (req: Request, res: Response) => {
  try {
    const contact = await prisma.contact.update({
      where: { id: req.params.contactId },
      data: req.body,
    })
    res.json(contact)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

customersRouter.delete('/:id/contacts/:contactId', async (req: Request, res: Response) => {
  try {
    await prisma.contact.delete({ where: { id: req.params.contactId } })
    res.status(204).send()
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})
