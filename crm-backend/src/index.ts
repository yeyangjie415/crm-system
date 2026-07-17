import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.js'
import { usersRouter } from './routes/users.js'
import { customersRouter } from './routes/customers.js'
import { contractsRouter } from './routes/contracts.js'
import { reportsRouter } from './routes/reports.js'
import { expensesRouter } from './routes/expenses.js'
import { visitsRouter } from './routes/visits.js'
import { tasksRouter } from './routes/tasks.js'
import { notificationsRouter } from './routes/notifications.js'
import { followRecordsRouter } from './routes/followRecords.js'
import { systemRouter } from './routes/system.js'
import prisma from './lib/prisma.js'

export const app = express()

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:4173'], credentials: true }))
app.use(express.json({ limit: '50mb' }))

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/customers', customersRouter)
app.use('/api/contracts', contractsRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/expenses', expensesRouter)
app.use('/api/visits', visitsRouter)
app.use('/api/tasks', tasksRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/follow-records', followRecordsRouter)
app.use('/api/system', systemRouter)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`CRM backend running on http://localhost:${PORT}`)
})

/* ---- Global error handlers ---- */
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err)
  setTimeout(() => process.exit(1), 1000)
})

process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason)
})

process.on('SIGTERM', () => {
  console.log('[SYSTEM] SIGTERM received, shutting down...')
  prisma.$disconnect()
  setTimeout(() => process.exit(0), 500)
})
