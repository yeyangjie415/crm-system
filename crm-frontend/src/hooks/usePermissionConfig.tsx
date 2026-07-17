import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Permission, PermissionLevel } from '@/types'
import { PERMISSION_LEVEL_PERMISSIONS } from '@/types'

const CONFIG_KEY = 'crm_permission_config'

interface PermissionConfigContextType {
  getPermissions: (level: PermissionLevel) => Permission[]
  setPermissions: (level: PermissionLevel, permissions: Permission[]) => void
}

const PermissionConfigContext = createContext<PermissionConfigContextType>({
  getPermissions: () => [],
  setPermissions: () => {},
})

function loadConfig(): Record<string, Permission[]> {
  try {
    const stored = localStorage.getItem(CONFIG_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return {}
}

export function PermissionConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Record<string, Permission[]>>(() => loadConfig())

  useEffect(() => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  }, [config])

  const getPermissions = useCallback((level: PermissionLevel): Permission[] => {
    if (level === 'super_admin') return PERMISSION_LEVEL_PERMISSIONS.super_admin
    if (level === 'general') return PERMISSION_LEVEL_PERMISSIONS.general
    return config.admin ?? PERMISSION_LEVEL_PERMISSIONS.admin
  }, [config])

  const setPermissions = useCallback((level: PermissionLevel, permissions: Permission[]) => {
    if (level !== 'admin') return
    setConfig(prev => ({ ...prev, admin: permissions }))
  }, [])

  return (
    <PermissionConfigContext.Provider value={{ getPermissions, setPermissions }}>
      {children}
    </PermissionConfigContext.Provider>
  )
}

export function usePermissionConfig() {
  return useContext(PermissionConfigContext)
}
