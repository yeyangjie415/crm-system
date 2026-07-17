import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { User, Permission, PermissionLevel } from '@/types'
import { useUsers, loadPersistedUsers } from '@/hooks/useUsers'
import { useAuditLog } from '@/hooks/useAuditLog'
import { usePermissionConfig } from '@/hooks/usePermissionConfig'
import { login as apiLogin, clearToken } from '@/lib/api'

interface AuthContextType {
  user: User | null
  isAdmin: boolean
  isSuperAdmin: boolean
  permissionLevel: PermissionLevel | null
  hasPermission: (p: Permission) => boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  updateOwnPassword: (newPassword: string) => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  isSuperAdmin: false,
  permissionLevel: null,
  hasPermission: () => false,
  login: async () => false,
  logout: () => {},
  updateOwnPassword: () => {},
})

const SEED_USERS: User[] = [
  { id: '1', name: '张管理', username: 'admin', password: 'admin123', role: 'general_manager', permissionLevel: 'super_admin', createdAt: '2024-01-01', lastLogin: '2026-07-03', disabled: false },
  { id: '2', name: '李销售', username: 'sales', password: 'sales123', role: 'salesperson', permissionLevel: 'general', createdAt: '2024-01-15', lastLogin: '2026-07-03', disabled: false },
  { id: '3', name: '王技术', username: 'tech', password: 'tech123', role: 'technician', permissionLevel: 'general', createdAt: '2024-02-01', lastLogin: '2026-07-01', disabled: false },
  { id: '4', name: '赵财务', username: 'finance', password: 'finance123', role: 'finance', permissionLevel: 'general', createdAt: '2024-03-01', lastLogin: '2026-07-02', disabled: false },
  { id: '5', name: '陈助理', username: 'assistant', password: 'assistant123', role: 'sales_assistant', permissionLevel: 'admin', createdAt: '2024-04-01', lastLogin: '2026-06-30', disabled: false },
  { id: '6', name: '刘销售', username: 'sales2', password: 'sales123', role: 'salesperson', permissionLevel: 'general', createdAt: '2024-05-01', lastLogin: '2026-07-03', disabled: false },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('crm_user')
    if (!saved) return null
    try {
      const parsed = JSON.parse(saved)
      const allUsers = loadPersistedUsers()
      const restored = allUsers.find(u => u.username === parsed.username)
      return restored || null
    } catch {
      localStorage.removeItem('crm_user')
      return null
    }
  })

  const { users, updateUser } = useUsers()
  const { logAction } = useAuditLog()
  const { getPermissions } = usePermissionConfig()

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    // Try backend login first (sets JWT token for all subsequent API calls)
    try {
      const data = await apiLogin(username, password)
      const backendUser: User = { ...data.user, password }
      setUser(backendUser)
      const { password: _, ...safeUser } = backendUser
      localStorage.setItem('crm_user', JSON.stringify(safeUser))
      logAction(backendUser.id, backendUser.name, 'login', 'system', undefined, undefined, '用户登录')
      return true
    } catch {
      // Backend unavailable — fall back to local login
      const found = users.find(u => u.username === username && u.password === password && !u.disabled)
      if (found) {
        setUser(found)
        const { password: _, ...safeUser } = found
        localStorage.setItem('crm_user', JSON.stringify(safeUser))
        logAction(found.id, found.name, 'login', 'system', undefined, undefined, '用户登录')
        return true
      }
      return false
    }
  }, [users, logAction])

  const isAdmin = user?.permissionLevel === 'super_admin' || user?.permissionLevel === 'admin'
  const isSuperAdmin = user?.permissionLevel === 'super_admin'
  const permissionLevel = user?.permissionLevel ?? null

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false
    const perms = getPermissions(user.permissionLevel)
    return perms.includes(permission)
  }, [user, getPermissions])

  const logout = useCallback(() => {
    if (user) {
      logAction(user.id, user.name, 'logout', 'system', undefined, undefined, '用户退出')
    }
    setUser(null)
    localStorage.removeItem('crm_user')
    clearToken()
  }, [user, logAction])

  const updateOwnPassword = useCallback((newPassword: string) => {
    if (!user) return
    updateUser(user.id, { password: newPassword })
    logAction(user.id, user.name, 'change_password', 'system', undefined, undefined, '修改密码')
  }, [user, updateUser, logAction])

  return (
    <AuthContext.Provider value={{ user, isAdmin, isSuperAdmin, permissionLevel, hasPermission, login, logout, updateOwnPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
