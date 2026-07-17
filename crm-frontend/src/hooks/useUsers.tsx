import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { User, UserRole, PermissionLevel } from '@/types'
import { generateId } from '@/mock/customers'
import { usersApi, isBackendAvailable } from '@/lib/api'

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
}

export interface UpdateUserInput {
  name?: string
  username?: string
  password?: string
  role?: UserRole
  permissionLevel?: PermissionLevel
}

interface UserContextType {
  users: User[]
  addUser: (input: NewUserInput) => User
  updateUser: (id: string, input: UpdateUserInput) => void
  deleteUser: (id: string) => void
  toggleDisable: (id: string) => void
}

const UserContext = createContext<UserContextType>({
  users: [],
  addUser: () => ({ id: '', name: '', username: '', password: '', role: 'salesperson', permissionLevel: 'general', createdAt: '', disabled: false }),
  updateUser: () => {},
  deleteUser: () => {},
  toggleDisable: () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => loadPersistedUsers())

  useEffect(() => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
  }, [users])

  // Load from backend on mount
  useEffect(() => {
    isBackendAvailable().then(ok => {
      if (!ok) return
      usersApi.list().then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const merged = data.map((u: any) => ({ ...u, password: u.password || '' }))
          setUsers(merged)
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged))
        }
      }).catch(err => console.error('[API]', err))
    })
  }, [])

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
    }
    setUsers(prev => [...prev, newUser])
    isBackendAvailable().then(ok => { if (ok) usersApi.create(newUser).catch(err => console.error('[API]', err)) })
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
      } : u
    ))
    isBackendAvailable().then(ok => { if (ok) usersApi.update(id, input).catch(err => console.error('[API]', err)) })
  }, [])

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id))
    isBackendAvailable().then(ok => { if (ok) usersApi.delete(id).catch(err => console.error('[API]', err)) })
  }, [])

  const toggleDisable = useCallback((id: string) => {
    setUsers(prev => prev.map(u =>
      u.id === id ? { ...u, disabled: !u.disabled } : u
    ))
    const updated = users.find(u => u.id === id)
    if (updated) {
      isBackendAvailable().then(ok => { if (ok) usersApi.update(id, { disabled: !updated.disabled }).catch(err => console.error('[API]', err)) })
    }
  }, [users])

  return (
    <UserContext.Provider value={{ users, addUser, updateUser, deleteUser, toggleDisable }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUsers() {
  return useContext(UserContext)
}
