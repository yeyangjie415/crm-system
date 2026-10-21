import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Visit } from '@/types'
import { generateId } from '@/mock/customers'
import { visitsApi, isBackendAvailable } from '@/lib/api'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useBackendLoad } from '@/hooks/useBackendLoad'

export interface NewVisitInput {
  date: string
  salesperson: string
  customerId: string
  customerName: string
  location: string
  contact: string
  duration: number
}

interface VisitContextType {
  visits: Visit[]
  addVisit: (input: NewVisitInput) => Visit
  updateVisit: (id: string, input: Partial<NewVisitInput>) => void
  deleteVisit: (id: string) => void
}

const VisitContext = createContext<VisitContextType>({
  visits: [],
  addVisit: () => ({ id: '', date: '', salesperson: '', customerId: '', customerName: '', location: '', contact: '', duration: 0 }),
  updateVisit: () => {},
  deleteVisit: () => {},
})

export function VisitProvider({ children }: { children: ReactNode }) {
  const [visits, setVisits] = useState<Visit[]>([])
  const { loginVersion, user } = useAuth()

  // Load from backend on mount and on re-login
  useBackendLoad<Visit>(
    () => visitsApi.list().then(data => data.map((v: any) => ({ ...v }))),
    setVisits,
    { trigger: loginVersion, loggedIn: !!user, clearOnLogout: true },
  )

  const addVisit = useCallback((input: NewVisitInput): Visit => {
    const newVisit: Visit = {
      id: generateId('v'),
      date: input.date,
      salesperson: input.salesperson,
      customerId: input.customerId,
      customerName: input.customerName,
      location: input.location,
      contact: input.contact,
      duration: input.duration,
    }
    setVisits(prev => [...prev, newVisit])
    // Fire-and-forget to backend
    isBackendAvailable().then(ok => {
      if (!ok) return
      visitsApi.create(newVisit).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
    return newVisit
  }, [])

  const updateVisit = useCallback((id: string, input: Partial<NewVisitInput>) => {
    setVisits(prev => prev.map(v => v.id === id ? { ...v, ...input } : v))
    isBackendAvailable().then(ok => {
      if (!ok) return
      visitsApi.update(id, input).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const deleteVisit = useCallback((id: string) => {
    setVisits(prev => prev.filter(v => v.id !== id))
    isBackendAvailable().then(ok => {
      if (!ok) return
      visitsApi.delete(id).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  return (
    <VisitContext.Provider value={{ visits, addVisit, updateVisit, deleteVisit }}>
      {children}
    </VisitContext.Provider>
  )
}

export function useVisits() {
  return useContext(VisitContext)
}
