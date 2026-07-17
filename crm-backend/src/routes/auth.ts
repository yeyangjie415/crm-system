import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma.js'
import { generateToken } from '../middleware/auth.js'

export const authRouter = Router()

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) { res.status(401).json({ error: '用户名或密码错误' }); return }
    if (user.disabled) { res.status(403).json({ error: '账号已禁用' }); return }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) { res.status(401).json({ error: '用户名或密码错误' }); return }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date().toISOString().slice(0, 10) },
    })

    const token = generateToken({ userId: user.id, permissionLevel: user.permissionLevel })
    const { password: _, ...safe } = user

    res.json({ token, user: safe })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '登录失败' })
  }
})

authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: '未登录' }); return }
    const jwt = await import('jsonwebtoken')
    const secret = process.env.JWT_SECRET || 'crm-dev-secret-key-change-in-production'
    const payload = jwt.default.verify(header.slice(7), secret) as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: payload.userId } })
    if (!user) { res.status(404).json({ error: '用户不存在' }); return }
    const { password: _, ...safe } = user
    res.json(safe)
  } catch {
    res.status(401).json({ error: '登录已过期' })
  }
})
