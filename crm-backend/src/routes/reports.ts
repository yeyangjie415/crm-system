import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'

export const reportsRouter = Router()

reportsRouter.use(requireAuth)

reportsRouter.get('/summary', async (req: Request, res: Response) => {
  try {
    const { year, month } = req.query

    const customers = await prisma.customer.findMany({
      where: { deleted: false },
      include: { projects: true, contracts: { include: { payments: true } } },
    })

    const contracts = await prisma.contract.findMany({ include: { payments: true } })
    const users = await prisma.user.findMany()

    // Filter by period if year/month provided
    let periodContracts = contracts
    if (year) {
      periodContracts = contracts.filter(c => c.contractDate.startsWith(String(year)))
      if (month) {
        const prefix = `${year}-${String(month).padStart(2, '0')}`
        periodContracts = contracts.filter(c => c.contractDate.startsWith(prefix))
      }
    }

    // By salesperson
    const bySalesperson = users.map(u => {
      const userContracts = periodContracts.filter(c => c.attributedTo === u.id)
      const wonAmount = userContracts.reduce((s, c) => s + c.settlementAmount, 0)
      const collected = userContracts.reduce((s, c) => s + c.payments.filter(p => p.completed).reduce((a, p) => a + p.amount, 0), 0)
      const total = userContracts.reduce((s, c) => s + c.payments.reduce((a, p) => a + p.amount, 0), 0)
      const collectionRate = total > 0 ? Math.round((collected / total) * 100) : 0
      const customerCount = customers.filter(c => c.createdBy === u.id && !c.deleted).length
      return {
        userId: u.id,
        userName: u.name,
        role: u.role,
        contractCount: userContracts.length,
        wonAmount,
        collected,
        totalReceivable: total,
        collectionRate,
        customerCount,
      }
    }).filter(u => u.contractCount > 0 || u.customerCount > 0)

    // Aggregate stats
    const totalWon = periodContracts.reduce((s, c) => s + c.settlementAmount, 0)
    const totalCollected = periodContracts.reduce((s, c) => s + c.payments.filter(p => p.completed).reduce((a, p) => a + p.amount, 0), 0)
    const totalReceivable = periodContracts.reduce((s, c) => s + c.payments.reduce((a, p) => a + p.amount, 0), 0)
    const overallRate = totalReceivable > 0 ? Math.round((totalCollected / totalReceivable) * 100) : 0

    // Potential pipeline
    const followingProjects = customers.flatMap(c => c.projects).filter(p => p.followStatus === 'following')
    const potentialAmount = followingProjects.reduce((s, p) => s + p.amount, 0)

    res.json({
      totalCustomers: customers.length,
      totalWon,
      totalCollected,
      totalReceivable,
      collectionRate: overallRate,
      potentialAmount,
      contractCount: periodContracts.length,
      bySalesperson,
    })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

reportsRouter.get('/collections', async (_req: Request, res: Response) => {
  try {
    const contracts = await prisma.contract.findMany({ include: { payments: true } })

    const now = new Date()
    const today = now.toISOString().slice(0, 10)

    const contractDetails = contracts.map(c => {
      const total = c.payments.reduce((s, p) => s + p.amount, 0)
      const collected = c.payments.filter(p => p.completed).reduce((s, p) => s + p.amount, 0)
      const rate = total > 0 ? Math.round((collected / total) * 100) : 0
      const overdue = c.payments.filter(p => !p.completed && p.paymentDate && p.paymentDate < today)
      const overdueAmount = overdue.reduce((s, p) => s + p.amount, 0)
      return {
        contractId: c.id,
        customerName: c.customerName,
        projectName: c.projectName,
        settlementAmount: c.settlementAmount,
        totalReceivable: total,
        collected,
        outstanding: total - collected,
        collectionRate: rate,
        overdueAmount,
        overdueCount: overdue.length,
        completedCount: c.payments.filter(p => p.completed).length,
        totalCount: c.payments.length,
      }
    })

    const totalOutstanding = contractDetails.reduce((s, c) => s + c.outstanding, 0)
    const totalOverdue = contractDetails.reduce((s, c) => s + c.overdueAmount, 0)

    res.json({ contracts: contractDetails, totalOutstanding, totalOverdue })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})

reportsRouter.get('/customers', async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { deleted: false },
      include: { projects: true, contracts: true },
    })

    // By attribute
    const byAttribute = { company: 0, individual: 0 }
    const byAttributeAmount = { company: 0, individual: 0 }
    // By positioning
    const byPositioning: Record<string, { count: number; amount: number }> = {}
    // By province
    const byProvince: Record<string, { count: number; amount: number }> = {}

    for (const c of customers) {
      const attr = c.customerAttribute || 'company'
      byAttribute[attr as keyof typeof byAttribute] = (byAttribute[attr as keyof typeof byAttribute] || 0) + 1
      const wonAmount = c.contracts.reduce((s, ct) => s + ct.settlementAmount, 0)
      byAttributeAmount[attr as keyof typeof byAttributeAmount] += wonAmount

      if (!byPositioning[c.positioning]) byPositioning[c.positioning] = { count: 0, amount: 0 }
      byPositioning[c.positioning].count++
      byPositioning[c.positioning].amount += wonAmount

      const prov = c.provinceName || '未知'
      if (!byProvince[prov]) byProvince[prov] = { count: 0, amount: 0 }
      byProvince[prov].count++
      byProvince[prov].amount += wonAmount
    }

    res.json({ total: customers.length, byAttribute, byAttributeAmount, byPositioning, byProvince })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err as Error).message })
  }
})
