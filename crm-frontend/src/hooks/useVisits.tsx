import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Visit } from '@/types'
import { generateId } from '@/mock/customers'
import { visitsApi, isBackendAvailable } from '@/lib/api'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

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
  const { loginVersion } = useAuth()

  useEffect(() => {
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>
    const load = () => {
      isBackendAvailable().then(ok => {
        if (!ok) { attempts++; if (attempts <= 6) timer = setTimeout(load, 5000); return }
        visitsApi.list().then(data => {
          if (Array.isArray(data) && data.length > 0) setVisits(data)
        }).catch(() => { attempts++; if (attempts <= 6) timer = setTimeout(load, 5000) })
      })
    }
    load()
    return () => clearTimeout(timer)
  }, [loginVersion])

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
