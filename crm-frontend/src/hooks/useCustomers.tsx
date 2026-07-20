import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import type { Customer, FollowRecord, Contact, Project, CustomerType, CustomerPositioning, ReportStatus, FollowStatus, SharePermission, CustomerAttribute } from '@/types'
import { generateId } from '@/mock/customers'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useAuditLog } from '@/hooks/useAuditLog'
import { customersApi, followRecordsApi, isBackendAvailable } from '@/lib/api'

export interface NewCustomerInput {
  name: string
  region: string
  type: CustomerType
  positioning: CustomerPositioning
  customerAttribute?: CustomerAttribute
  createdBy: string
  createdByName: string
  notes?: string
  contacts?: { name: string; phone: string; position: string; description?: string }[]
  provinceCode?: string
  provinceName?: string
  cityCode?: string
  cityName?: string
  districtCode?: string
  districtName?: string
  detailedAddress?: string
}

export interface NewContactInput {
  name: string
  phone: string
  position: string
  description?: string
}

export interface UpdateContactInput {
  name: string
  phone: string
  position: string
  description?: string
  describedBy?: string
}

export interface NewProjectInput {
  name: string
  customerName: string
  contactName?: string
  reportStatus: ReportStatus
  followStatus: FollowStatus
  amount: number
  nextFollowUp?: string
  nextFollowUpDate?: string
  createdBy: string
}

export interface UpdateProjectInput {
  name: string
  contactName?: string
  reportStatus: ReportStatus
  followStatus: FollowStatus
  amount: number
  nextFollowUp?: string
  nextFollowUpDate?: string
}

export interface NewFollowRecordInput {
  content: string
  recordedBy: string
  recordedAt: string
}

export interface NewAnnotationInput {
  content: string
  annotatedBy: string
  annotatedAt: string
  projectId?: string
}

export interface UpdateCustomerInput {
  name?: string
  type?: CustomerType
  positioning?: CustomerPositioning
  customerAttribute?: CustomerAttribute
  provinceCode?: string
  provinceName?: string
  cityCode?: string
  cityName?: string
  districtCode?: string
  districtName?: string
  detailedAddress?: string
  createdBy?: string
  createdByName?: string
}

export interface ShareCustomerInput {
  userId: string
  userName: string
  permission: SharePermission
}

interface CustomerContextType {
  customers: Customer[]
  followRecords: FollowRecord[]
  getCustomer: (id: string) => Customer | undefined
  getFollowRecords: (projectId: string) => FollowRecord[]
  addCustomer: (input: NewCustomerInput) => Customer
  updateCustomer: (customerId: string, input: UpdateCustomerInput) => void
  addContact: (customerId: string, input: NewContactInput) => void
  updateContact: (customerId: string, contactId: string, input: UpdateContactInput) => void
  deleteContact: (customerId: string, contactId: string) => void
  addProject: (customerId: string, input: NewProjectInput) => Project
  updateProject: (customerId: string, projectId: string, input: UpdateProjectInput) => void
  deleteProject: (customerId: string, projectId: string) => void
  addFollowRecord: (projectId: string, input: NewFollowRecordInput) => FollowRecord
  deleteFollowRecord: (recordId: string) => void
  addAnnotation: (customerId: string, input: NewAnnotationInput) => void
  shareCustomer: (customerId: string, input: ShareCustomerInput) => void
  removeAccess: (customerId: string, userId: string) => void
  softDeleteCustomer: (customerId: string, userId: string, userName: string) => void
  hardDeleteCustomer: (customerId: string, userName: string) => void
  restoreCustomer: (customerId: string, userName: string) => void
  reassignCustomer: (customerId: string, newCreatedBy: string, newCreatedByName: string, userName: string) => void
  claimFromPool: (customerId: string, userId: string, userName: string) => void
  releaseToPool: (customerId: string) => void
  updateActivity: (customerId: string) => void
}

const CustomerContext = createContext<CustomerContextType>({
  customers: [],
  followRecords: [],
  getCustomer: () => undefined,
  getFollowRecords: () => [],
  addCustomer: () => ({ id: '', name: '', region: '', type: 'owner', positioning: 'normal', createdBy: '', createdByName: '', accessControl: [], createdAt: '', contacts: [], projects: [], deleted: false }),
  updateCustomer: () => {},
  addContact: () => {},
  updateContact: () => {},
  deleteContact: () => {},
  addProject: () => ({ id: '', name: '', customerId: '', customerName: '', reportStatus: 'exclusive', followStatus: 'following', amount: 0, createdAt: '', createdBy: '' }),
  updateProject: () => {},
  deleteProject: () => {},
  addFollowRecord: () => ({ id: '', projectId: '', content: '', recordedBy: '', recordedAt: '' }),
  deleteFollowRecord: () => {},
  addAnnotation: () => {},
  shareCustomer: () => {},
  removeAccess: () => {},
  softDeleteCustomer: () => {},
  hardDeleteCustomer: () => {},
  restoreCustomer: () => {},
  reassignCustomer: () => {},
  claimFromPool: () => {},
  releaseToPool: () => {},
  updateActivity: () => {},
})

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [followRecords, setFollowRecords] = useState<FollowRecord[]>([])
  const { logAction } = useAuditLog()
  const { loginVersion } = useAuth()
  const customersRef = useRef(customers)
  customersRef.current = customers

  // Try to load from backend on mount and on re-login
  useEffect(() => {
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>
    const load = () => {
      isBackendAvailable().then(ok => {
        if (!ok) { attempts++; if (attempts <= 6) timer = setTimeout(load, 5000); return }
        customersApi.list().then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setCustomers(data.map((c: any) => ({
              ...c,
              contacts: c.contacts || [],
              projects: c.projects || [],
              accessControl: c.accessControl || [],
              annotations: c.annotations || [],
              hiddenBy: c.hiddenBy || [],
              deleted: c.deleted || false,
            })))
          }
        }).catch(() => { attempts++; if (attempts <= 6) timer = setTimeout(load, 5000) })
      })
    }
    load()
    return () => clearTimeout(timer)
  }, [loginVersion])

  // Try to load followRecords from backend
  useEffect(() => {
    let attempts = 0
    let timer: ReturnType<typeof setTimeout>
    const load = () => {
      isBackendAvailable().then(ok => {
        if (!ok) { attempts++; if (attempts <= 6) timer = setTimeout(load, 5000); return }
        followRecordsApi.list().then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setFollowRecords(data.map((r: any) => ({ ...r })))
          }
        }).catch(() => { attempts++; if (attempts <= 6) timer = setTimeout(load, 5000) })
      })
    }
    load()
    return () => clearTimeout(timer)
  }, [loginVersion])

  const getCustomer = useCallback((id: string) => {
    return customers.find(c => c.id === id && !c.deleted)
  }, [customers])

  const getFollowRecords = useCallback((projectId: string) => {
    return followRecords.filter(r => r.projectId === projectId)
  }, [followRecords])

  const addCustomer = useCallback((input: NewCustomerInput): Customer => {
    const derivedRegion = [input.provinceName, input.cityName, input.districtName].filter(Boolean).join(' ') || input.region || '未填写'
    const newCustomer: Customer = {
      id: generateId('c'),
      name: input.name,
      region: derivedRegion,
      type: input.type,
      positioning: input.positioning,
      customerAttribute: input.customerAttribute || 'company',
      createdBy: input.createdBy,
      createdByName: input.createdByName,
      accessControl: [],
      createdAt: new Date().toISOString().slice(0, 10),
      contacts: (input.contacts || []).map(ct => ({
        id: generateId('ct'),
        name: ct.name,
        phone: ct.phone,
        position: ct.position,
        description: ct.description,
        customerId: '', // will be set after
      })),
      projects: [],
      notes: input.notes,
      deleted: false,
      provinceCode: input.provinceCode,
      provinceName: input.provinceName,
      cityCode: input.cityCode,
      cityName: input.cityName,
      districtCode: input.districtCode,
      districtName: input.districtName,
      detailedAddress: input.detailedAddress,
    }
    // Set customerId on contacts
    newCustomer.contacts = newCustomer.contacts.map(ct => ({ ...ct, customerId: newCustomer.id }))
    setCustomers(prev => [...prev, newCustomer])
    isBackendAvailable().then(ok => {
      if (!ok) return
      customersApi.create(newCustomer).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
    return newCustomer
  }, [])

  const updateCustomer = useCallback((customerId: string, input: UpdateCustomerInput) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c
      const updates: Partial<Customer> = {}
      if (input.name !== undefined) updates.name = input.name
      if (input.type !== undefined) updates.type = input.type
      if (input.positioning !== undefined) updates.positioning = input.positioning
      if (input.customerAttribute !== undefined) updates.customerAttribute = input.customerAttribute
      if (input.provinceCode !== undefined) updates.provinceCode = input.provinceCode
      if (input.provinceName !== undefined) updates.provinceName = input.provinceName
      if (input.cityCode !== undefined) updates.cityCode = input.cityCode
      if (input.cityName !== undefined) updates.cityName = input.cityName
      if (input.districtCode !== undefined) updates.districtCode = input.districtCode
      if (input.districtName !== undefined) updates.districtName = input.districtName
      if (input.detailedAddress !== undefined) updates.detailedAddress = input.detailedAddress
      if (input.createdBy !== undefined) updates.createdBy = input.createdBy
      if (input.createdByName !== undefined) updates.createdByName = input.createdByName
      // Derive region from structured fields
      const regionFields = [
        input.provinceName ?? c.provinceName,
        input.cityName ?? c.cityName,
        input.districtName ?? c.districtName,
      ].filter(Boolean)
      if (regionFields.length > 0) {
        updates.region = regionFields.join(' ')
      }
      return { ...c, ...updates }
    }))
    isBackendAvailable().then(ok => {
      if (!ok) return
      customersApi.update(customerId, input).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const addContact = useCallback((customerId: string, input: NewContactInput) => {
    const newContact: Contact = {
      id: generateId('ct'),
      name: input.name,
      phone: input.phone,
      position: input.position,
      description: input.description,
      customerId,
    }
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? { ...c, contacts: [...c.contacts, newContact] } : c
    ))
    isBackendAvailable().then(ok => {
      if (!ok) return
      customersApi.addContact(customerId, newContact).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const updateContact = useCallback((customerId: string, contactId: string, input: UpdateContactInput) => {
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? {
        ...c,
        contacts: c.contacts.map(ct =>
          ct.id === contactId ? {
            ...ct,
            name: input.name,
            phone: input.phone,
            position: input.position,
            description: input.description,
            describedBy: input.describedBy,
          } : ct
        ),
      } : c
    ))
    isBackendAvailable().then(ok => {
      if (!ok) return
      customersApi.updateContact(customerId, contactId, input).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const deleteContact = useCallback((customerId: string, contactId: string) => {
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? {
        ...c,
        contacts: c.contacts.filter(ct => ct.id !== contactId),
      } : c
    ))
    isBackendAvailable().then(ok => {
      if (!ok) return
      customersApi.deleteContact(customerId, contactId).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const addProject = useCallback((customerId: string, input: NewProjectInput): Project => {
    const newProject: Project = {
      id: generateId('p'),
      name: input.name,
      customerId,
      customerName: input.customerName,
      contactName: input.contactName,
      reportStatus: input.reportStatus,
      followStatus: input.followStatus,
      amount: input.amount,
      nextFollowUp: input.nextFollowUp,
      nextFollowUpDate: input.nextFollowUpDate,
      createdAt: new Date().toISOString().slice(0, 10),
      createdBy: input.createdBy,
    }
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? { ...c, projects: [...c.projects, newProject] } : c
    ))
    const customer = customersRef.current.find(c => c.id === customerId)
    if (customer) {
      isBackendAvailable().then(ok => {
        if (!ok) return
        customersApi.update(customerId, { projects: [...customer.projects, newProject] }).catch(err => {
          console.error('[API]', err)
          toast.error('保存失败：' + (err?.message || '网络错误'))
        })
      })
    }
    return newProject
  }, [])

  const updateProject = useCallback((customerId: string, projectId: string, input: UpdateProjectInput) => {
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? {
        ...c,
        projects: c.projects.map(p =>
          p.id === projectId ? {
            ...p,
            name: input.name,
            contactName: input.contactName,
            reportStatus: input.reportStatus,
            followStatus: input.followStatus,
            amount: input.amount,
            nextFollowUp: input.nextFollowUp,
            nextFollowUpDate: input.nextFollowUpDate,
          } : p
        ),
      } : c
    ))
    const customer = customersRef.current.find(c => c.id === customerId)
    if (customer) {
      const syncedProjects = customer.projects.map(p =>
        p.id === projectId ? { ...p, name: input.name, contactName: input.contactName, reportStatus: input.reportStatus, followStatus: input.followStatus, amount: input.amount, nextFollowUp: input.nextFollowUp, nextFollowUpDate: input.nextFollowUpDate } : p
      )
      isBackendAvailable().then(ok => {
        if (!ok) return
        customersApi.update(customerId, { projects: syncedProjects }).catch(err => {
          console.error('[API]', err)
          toast.error('保存失败：' + (err?.message || '网络错误'))
        })
      })
    }
  }, [])

  const deleteProject = useCallback((customerId: string, projectId: string) => {
    setCustomers(prev => prev.map(c =>
      c.id === customerId ? {
        ...c,
        projects: c.projects.filter(p => p.id !== projectId),
      } : c
    ))
    // Also remove follow records for this project
    setFollowRecords(prev => prev.filter(r => r.projectId !== projectId))
    const customer = customersRef.current.find(c => c.id === customerId)
    if (customer) {
      const syncedProjects = customer.projects.filter(p => p.id !== projectId)
      isBackendAvailable().then(ok => {
        if (!ok) return
        customersApi.update(customerId, { projects: syncedProjects }).catch(err => {
          console.error('[API]', err)
          toast.error('保存失败：' + (err?.message || '网络错误'))
        })
      })
    }
  }, [])

  const addFollowRecord = useCallback((projectId: string, input: NewFollowRecordInput): FollowRecord => {
    const newRecord: FollowRecord = {
      id: generateId('f'),
      projectId,
      content: input.content,
      recordedBy: input.recordedBy,
      recordedAt: input.recordedAt,
    }
    setFollowRecords(prev => [...prev, newRecord])
    isBackendAvailable().then(ok => {
      if (!ok) return
      followRecordsApi.create(newRecord).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
    // Also update the project's nextFollowUp fields if provided
    return newRecord
  }, [])

  const deleteFollowRecord = useCallback((recordId: string) => {
    setFollowRecords(prev => prev.filter(r => r.id !== recordId))
    isBackendAvailable().then(ok => {
      if (!ok) return
      followRecordsApi.delete(recordId).catch(err => {
        console.error('[API]', err)
        toast.error('删除失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const addAnnotation = useCallback((customerId: string, input: NewAnnotationInput) => {
    const newAnn = { id: generateId('a'), content: input.content, annotatedBy: input.annotatedBy, annotatedAt: input.annotatedAt, projectId: input.projectId }
    setCustomers(prev => prev.map(c =>
      c.id === customerId
        ? { ...c, annotations: [...(c.annotations || []), newAnn] }
        : c
    ))
    const customer = customersRef.current.find(c => c.id === customerId)
    if (customer) {
      const syncedAnnotations = [...(customer.annotations || []), newAnn]
      isBackendAvailable().then(ok => {
        if (!ok) return
        customersApi.update(customerId, { annotations: syncedAnnotations }).catch(err => {
          console.error('[API]', err)
          toast.error('保存失败：' + (err?.message || '网络错误'))
        })
      })
    }
  }, [])

  const shareCustomer = useCallback((customerId: string, input: ShareCustomerInput) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c
      const existingIdx = c.accessControl.findIndex(ac => ac.userId === input.userId)
      if (existingIdx >= 0) {
        const updated = [...c.accessControl]
        updated[existingIdx] = { ...updated[existingIdx], permission: input.permission, grantedAt: new Date().toISOString() }
        return { ...c, accessControl: updated }
      }
      return {
        ...c,
        accessControl: [...c.accessControl, {
          userId: input.userId,
          userName: input.userName,
          permission: input.permission,
          grantedAt: new Date().toISOString(),
        }],
      }
    }))
    const customer = customersRef.current.find(c => c.id === customerId)
    if (customer) {
      const existingIdx = customer.accessControl.findIndex(ac => ac.userId === input.userId)
      let syncedAccessControl
      if (existingIdx >= 0) {
        syncedAccessControl = customer.accessControl.map((ac, i) =>
          i === existingIdx ? { ...ac, permission: input.permission, grantedAt: new Date().toISOString() } : ac
        )
      } else {
        syncedAccessControl = [...customer.accessControl, {
          userId: input.userId,
          userName: input.userName,
          permission: input.permission,
          grantedAt: new Date().toISOString(),
        }]
      }
      isBackendAvailable().then(ok => {
        if (!ok) return
        customersApi.update(customerId, { accessControl: syncedAccessControl }).catch(err => {
          console.error('[API]', err)
          toast.error('保存失败：' + (err?.message || '网络错误'))
        })
      })
    }
  }, [])

  const removeAccess = useCallback((customerId: string, userId: string) => {
    setCustomers(prev => prev.map(c =>
      c.id === customerId
        ? { ...c, accessControl: c.accessControl.filter(ac => ac.userId !== userId) }
        : c
    ))
    const customer = customersRef.current.find(c => c.id === customerId)
    if (customer) {
      const syncedAccessControl = customer.accessControl.filter(ac => ac.userId !== userId)
      isBackendAvailable().then(ok => {
        if (!ok) return
        customersApi.update(customerId, { accessControl: syncedAccessControl }).catch(err => {
          console.error('[API]', err)
          toast.error('保存失败：' + (err?.message || '网络错误'))
        })
      })
    }
  }, [])

  const softDeleteCustomer = useCallback((customerId: string, userId: string, userName: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c
      const customerName = c.name
      logAction(userId, userName, 'soft_delete_customer', 'customer', customerId, customerName, `软删除客户「${customerName}」`)
      return {
        ...c,
        hiddenBy: [...(c.hiddenBy || []), userId],
        deletedBy: userName,
        deletedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      }
    }))
    isBackendAvailable().then(ok => {
      if (!ok) return
      customersApi.delete(customerId, userId, userName).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [logAction])

  const hardDeleteCustomer = useCallback((customerId: string, userName: string) => {
    setCustomers(prev => {
      const target = prev.find(c => c.id === customerId)
      if (target) {
        logAction('system', userName, 'hard_delete_customer', 'customer', customerId, target.name, `永久删除客户「${target.name}」`)
      }
      return prev.filter(c => c.id !== customerId)
    })
    isBackendAvailable().then(ok => {
      if (!ok) return
      customersApi.hardDelete(customerId).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [logAction])

  const restoreCustomer = useCallback((customerId: string, userName: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c
      logAction('system', userName, 'restore_customer', 'customer', customerId, c.name, `恢复客户「${c.name}」`)
      return {
        ...c,
        deleted: false,
        hiddenBy: undefined,
        deletedBy: undefined,
        deletedAt: undefined,
      }
    }))
    isBackendAvailable().then(ok => {
      if (!ok) return
      customersApi.update(customerId, { deleted: false, hiddenBy: [], deletedBy: null, deletedAt: null }).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [logAction])

  const reassignCustomer = useCallback((customerId: string, newCreatedBy: string, newCreatedByName: string, userName: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c
      logAction('system', userName, 'reassign_customer', 'customer', customerId, c.name, `重分配客户「${c.name}」给 ${newCreatedByName}`)
      return {
        ...c,
        createdBy: newCreatedBy,
        createdByName: newCreatedByName,
        deleted: false,
        hiddenBy: undefined,
        deletedBy: undefined,
        deletedAt: undefined,
      }
    }))
    isBackendAvailable().then(ok => {
      if (!ok) return
      customersApi.update(customerId, { createdBy: newCreatedBy, createdByName: newCreatedByName, deleted: false, hiddenBy: [], deletedBy: null, deletedAt: null }).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [logAction])

  /* ── Public Pool / 公海 ── */

  const claimFromPool = useCallback((customerId: string, userId: string, userName: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c
      return { ...c, ownedBy: userId, ownedByName: userName, reclaimedAt: undefined, lastActivityAt: new Date().toISOString().replace('T', ' ').slice(0, 19) }
    }))
    isBackendAvailable().then(ok => {
      if (!ok) return
      customersApi.claim(customerId, userId, userName).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const releaseToPool = useCallback((customerId: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c
      return { ...c, ownedBy: undefined, ownedByName: undefined, reclaimedAt: new Date().toISOString().replace('T', ' ').slice(0, 19), lastActivityAt: undefined }
    }))
    isBackendAvailable().then(ok => {
      if (!ok) return
      customersApi.release(customerId).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const updateActivity = useCallback((customerId: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c
      return { ...c, lastActivityAt: new Date().toISOString().replace('T', ' ').slice(0, 19) }
    }))
  }, [])

  return (
    <CustomerContext.Provider value={{
      customers,
      followRecords,
      getCustomer,
      getFollowRecords,
      addCustomer,
      updateCustomer,
      addContact,
      updateContact,
      deleteContact,
      addProject,
      updateProject,
      deleteProject,
      addFollowRecord,
      deleteFollowRecord,
      addAnnotation,
      shareCustomer,
      removeAccess,
      softDeleteCustomer,
      hardDeleteCustomer,
      restoreCustomer,
      reassignCustomer,
      claimFromPool,
      releaseToPool,
      updateActivity,
    }}>
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomers() {
  return useContext(CustomerContext)
}
