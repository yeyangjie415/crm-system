import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'crm-dev-secret-key-change-in-production'

export interface AuthPayload {
  userId: string
  permissionLevel: string
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload
    }
  }
}

export function generateToken(payload: AuthPayload): string {
  // Matches the frontend promise "记住登录（30天有效）"
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: '未登录' })
    return
  }
  try {
    req.auth = jwt.verify(header.slice(7), JWT_SECRET) as AuthPayload
    next()
  } catch {
    res.status(401).json({ error: '登录已过期' })
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth || req.auth.permissionLevel === 'general') {
    res.status(403).json({ error: '需要管理员权限' })
    return
  }
  next()
}

export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth || req.auth.permissionLevel !== 'super_admin') {
    res.status(403).json({ error: '需要超级管理员权限' })
    return
  }
  next()
}
