import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { User, Permission, PermissionLevel } from '@/types'
import { useUsers, loadPersistedUsers } from '@/hooks/useUsers'
import { useAuditLog } from '@/hooks/useAuditLog'
import { usePermissionConfig } from '@/hooks/usePermissionConfig'
import { login as apiLogin, clearToken, getToken, getMe, AUTH_EXPIRED_EVENT } from '@/lib/api'

/** Backend cold start (tsx + Prisma) can take several seconds; retry login briefly before falling back. */
const BACKEND_LOGIN_ATTEMPTS = 4
const BACKEND_LOGIN_RETRY_DELAY = 2500
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface AuthContextType {
  user: User | null
  isAdmin: boolean
  isSuperAdmin: boolean
  permissionLevel: PermissionLevel | null
  hasPermission: (p: Permission) => boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  updateOwnPassword: (newPassword: string) => void
  loginVersion: number
  /** True once a restored session has been validated (or there is nothing to validate). */
  sessionReady: boolean
  /** True when the current session fell back to local-only mode (no backend token). */
  offlineMode: boolean
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
  loginVersion: 0,
  sessionReady: true,
  offlineMode: false,
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
  const [loginVersion, setLoginVersion] = useState(0)
  const [offlineMode, setOfflineMode] = useState(false)
  // When a session was restored from localStorage AND a token exists, it must
  // be validated against the backend before the app trusts it (it may be expired).
  const [sessionReady, setSessionReady] = useState(() => {
    try {
      return !(localStorage.getItem('crm_user') && getToken())
    } catch {
      return true
    }
  })

  const { users, updateUser, reloadUsers } = useUsers()
  const { logAction } = useAuditLog()
  const { getPermissions } = usePermissionConfig()

  // Validate a restored session once on mount. On 401/404 the session is
  // invalid and must be cleared; on network errors (backend down at page
  // load) keep the restored session and behave offline.
  useEffect(() => {
    if (sessionReady) return
    let cancelled = false
    getMe().then(me => {
      if (cancelled) return
      // Refresh restored user info with the backend's latest (keep local password copy)
      setUser(prev => {
        if (!prev) return prev
        const refreshed: User = { ...prev, ...me, password: prev.password }
        const { password: _, ...safe } = refreshed
        try { localStorage.setItem('crm_user', JSON.stringify(safe)) } catch { /* ignore */ }
        return refreshed
      })
    }).catch((err: unknown) => {
      if (cancelled) return
      const status = (err as { status?: number })?.status
      if (status === 401 || status === 404) {
        clearToken()
        try { localStorage.removeItem('crm_user') } catch { /* ignore */ }
        setUser(null)
        toast.error('登录已过期，请重新登录', { id: 'session-expired' })
      }
    }).finally(() => {
      if (!cancelled) setSessionReady(true)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Global session-expiry handling: any authenticated request rejected with 401
  // means the token is no longer valid — end the session with a visible message.
  useEffect(() => {
    const onAuthExpired = () => {
      setUser(null)
      setOfflineMode(false)
      try { localStorage.removeItem('crm_user') } catch { /* ignore */ }
      clearToken()
      toast.error('登录已过期，请重新登录', { id: 'session-expired' })
    }
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired)
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    // Try backend login first (sets JWT token for all subsequent API calls).
    // Retry briefly so the backend's cold-start window doesn't push users into
    // offline mode unnecessarily.
    let credentialsRejected = false
    let backendErr: unknown = null
    for (let attempt = 0; attempt < BACKEND_LOGIN_ATTEMPTS; attempt++) {
      try {
        const data = await apiLogin(username, password)
        const backendUser: User = { ...data.user, password }
        setUser(backendUser)
        setOfflineMode(false)
        setLoginVersion(v => v + 1)
        const { password: _, ...safeUser } = backendUser
        localStorage.setItem('crm_user', JSON.stringify(safeUser))
        reloadUsers()
        logAction(backendUser.id, backendUser.name, 'login', 'system', undefined, undefined, '用户登录')
        return true
      } catch (e) {
        backendErr = e
        const status = (e as { status?: number })?.status
        if (status === 401 || status === 403) {
          // Backend is up and explicitly rejected the credentials — do not retry,
          // and do NOT fall back to offline login with the same credentials.
          credentialsRejected = true
          break
        }
        if (attempt < BACKEND_LOGIN_ATTEMPTS - 1) await delay(BACKEND_LOGIN_RETRY_DELAY)
      }
    }
    if (credentialsRejected) return false
    console.error('[LOGIN] Backend login failed:', backendErr)

    // Backend unreachable — fall back to local login, but loudly: the session
    // has no token and backend data will not sync until the user logs in again.
    const enterOfflineMode = (found: User, detail: string) => {
      setUser(found)
      setOfflineMode(true)
      setLoginVersion(v => v + 1)
      const { password: _, ...safeUser } = found
      localStorage.setItem('crm_user', JSON.stringify(safeUser))
      logAction(found.id, found.name, 'login', 'system', undefined, undefined, detail)
      toast.warning('后端服务未响应，已进入离线模式：数据暂不同步，后端恢复后请退出并重新登录', { id: 'offline-mode', duration: 10000 })
    }
    const found = users.find(u => u.username === username && u.password === password && !u.disabled)
    if (found) {
      enterOfflineMode(found, '用户登录(离线模式)')
      return true
    }
    // Last resort: use built-in seed defaults when local user store is empty
    const seedMatch = SEED_USERS.find(u => u.username === username && u.password === password && !u.disabled)
    if (seedMatch) {
      enterOfflineMode(seedMatch, '用户登录(离线模式)')
      return true
    }
    return false
  }, [users, logAction, reloadUsers])

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
    setOfflineMode(false)
    localStorage.removeItem('crm_user')
    clearToken()
  }, [user, logAction])

  const updateOwnPassword = useCallback((newPassword: string) => {
    if (!user) return
    updateUser(user.id, { password: newPassword })
    logAction(user.id, user.name, 'change_password', 'system', undefined, undefined, '修改密码')
  }, [user, updateUser, logAction])

  return (
    <AuthContext.Provider value={{ user, isAdmin, isSuperAdmin, permissionLevel, hasPermission, login, logout, updateOwnPassword, loginVersion, sessionReady, offlineMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
