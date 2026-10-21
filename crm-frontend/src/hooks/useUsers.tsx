import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User, UserRole, PermissionLevel } from '@/types'
import { generateId } from '@/mock/customers'
import { usersApi, isBackendAvailable } from '@/lib/api'
import { toast } from 'sonner'
import { useBackendLoad } from '@/hooks/useBackendLoad'

const USERS_STORAGE_KEY = 'crm_users'

function mapRoleToLevel(role: string): PermissionLevel {
  switch (role) {
    case 'super_admin': return 'super_admin'
    case 'general_manager': return 'admin'
    default: return 'general'
  }
}

export function loadPersistedUsers(): User[] {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migrate: ensure all users have permissionLevel
        return parsed.map((u: Record<string, unknown>) => ({
          ...u,
          permissionLevel: (u.permissionLevel as PermissionLevel) || mapRoleToLevel((u.role as string) || ''),
          role: (u.role as string) === 'super_admin' ? 'general_manager' : (u.role || 'salesperson'),
        })) as User[]
      }
    }
  } catch { /* corrupted data */ }
  return []
}

export interface NewUserInput {
  name: string
  username: string
  password: string
  role: UserRole
  permissionLevel: PermissionLevel
  managerId?: string | null
}

export interface UpdateUserInput {
  name?: string
  username?: string
  password?: string
  role?: UserRole
  permissionLevel?: PermissionLevel
  managerId?: string | null
}

interface UserContextType {
  users: User[]
  getUser: (id: string) => User | undefined
  addUser: (input: NewUserInput) => User
  updateUser: (id: string, input: UpdateUserInput) => void
  deleteUser: (id: string) => void
  toggleDisable: (id: string) => void
  /** Re-fetch the user list from the backend (called after a successful login). */
  reloadUsers: () => void
}

const UserContext = createContext<UserContextType>({
  users: [],
  getUser: () => undefined,
  addUser: () => ({ id: '', name: '', username: '', password: '', role: 'salesperson', permissionLevel: 'general', createdAt: '', disabled: false }),
  updateUser: () => {},
  deleteUser: () => {},
  toggleDisable: () => {},
  reloadUsers: () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => loadPersistedUsers())
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
  }, [users])

  // Load from backend on mount / whenever reloadUsers() is called.
  // UserProvider sits OUTSIDE AuthProvider (AuthProvider.login's offline
  // fallback needs useUsers), so it can't read loginVersion — AuthProvider
  // calls reloadUsers() after a successful backend login instead.
  // No clearOnLogout: persisted users back the offline-fallback login.
  useBackendLoad<User>(
    () => usersApi.list().then(data => data.map((u: any) => ({ ...u, password: u.password || '' }))),
    setUsers,
    { trigger: reloadTick },
  )

  const reloadUsers = useCallback(() => setReloadTick(t => t + 1), [])

  const getUser = useCallback((id: string) => users.find(u => u.id === id), [users])

  const addUser = useCallback((input: NewUserInput): User => {
    const newUser: User = {
      id: generateId('u'),
      name: input.name,
      username: input.username,
      password: input.password,
      role: input.role,
      permissionLevel: input.permissionLevel,
      createdAt: new Date().toISOString().slice(0, 10),
      disabled: false,
      managerId: input.managerId ?? null,
    }
    setUsers(prev => [...prev, newUser])
    isBackendAvailable().then(ok => {
      if (!ok) return
      usersApi.create(newUser).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
    return newUser
  }, [])

  const updateUser = useCallback((id: string, input: UpdateUserInput) => {
    setUsers(prev => prev.map(u =>
      u.id === id ? {
        ...u,
        ...(input.name !== undefined && { name: input.name }),
        ...(input.username !== undefined && { username: input.username }),
        ...(input.password !== undefined && input.password !== '' && { password: input.password }),
        ...(input.role !== undefined && { role: input.role }),
        ...(input.permissionLevel !== undefined && { permissionLevel: input.permissionLevel }),
        ...(input.managerId !== undefined && { managerId: input.managerId }),
      } : u
    ))
    isBackendAvailable().then(ok => {
      if (!ok) return
      usersApi.update(id, input).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id))
    isBackendAvailable().then(ok => {
      if (!ok) return
      usersApi.delete(id).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const toggleDisable = useCallback((id: string) => {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, disabled: !u.disabled } : u
    ))
    const updated = users.find(u => u.id === id)
    if (updated) {
      isBackendAvailable().then(ok => {
        if (!ok) return
        usersApi.update(id, { disabled: !updated.disabled }).catch(err => {
          console.error('[API]', err)
          toast.error('保存失败：' + (err?.message || '网络错误'))
        })
      })
    }
  }, [users])

  return (
    <UserContext.Provider value={{ users, getUser, addUser, updateUser, deleteUser, toggleDisable, reloadUsers }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUsers() {
  return useContext(UserContext)
}
