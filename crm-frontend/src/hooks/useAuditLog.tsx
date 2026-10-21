import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { AuditAction, AuditLogEntry } from '@/types'
import { generateId } from '@/mock/customers'

const LOG_KEY = 'crm_audit_log'

interface AuditLogContextType {
  entries: AuditLogEntry[]
  logAction: (
    userId: string,
    userName: string,
    action: AuditAction,
    targetType: 'customer' | 'user' | 'system' | 'expense',
    targetId?: string,
    targetName?: string,
    detail?: string,
  ) => void
  getLogsForUser: (userId: string) => AuditLogEntry[]
  getAllLogs: () => AuditLogEntry[]
}

const AuditLogContext = createContext<AuditLogContextType>({
  entries: [],
  logAction: () => {},
  getLogsForUser: () => [],
  getAllLogs: () => [],
})

function loadLogs(): AuditLogEntry[] {
  try {
    const stored = localStorage.getItem(LOG_KEY)
    if (stored) return JSON.parse(stored)
  } catch { /* ignore */ }
  return []
}

export function AuditLogProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>(() => loadLogs())

  useEffect(() => {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries))
  }, [entries])

  const logAction = useCallback((
    userId: string,
    userName: string,
    action: AuditAction,
    targetType: 'customer' | 'user' | 'system' | 'expense',
    targetId?: string,
    targetName?: string,
    detail?: string,
  ) => {
    const entry: AuditLogEntry = {
      id: generateId('log'),
      userId,
      userName,
      action,
      targetType,
      targetId,
      targetName,
      detail: detail || '',
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    }
    setEntries(prev => [...prev, entry])
  }, [])

  const getLogsForUser = useCallback((userId: string): AuditLogEntry[] => {
    return entries.filter(e => e.userId === userId).sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [entries])

  const getAllLogs = useCallback((): AuditLogEntry[] => {
    return [...entries].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }, [entries])

  return (
    <AuditLogContext.Provider value={{ entries, logAction, getLogsForUser, getAllLogs }}>
      {children}
    </AuditLogContext.Provider>
  )
}

export function useAuditLog() {
  return useContext(AuditLogContext)
}
