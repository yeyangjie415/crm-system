import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { toast } from 'sonner'
import { generateId } from '@/mock/customers'
import { contractsApi, isBackendAvailable } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { useBackendLoad } from '@/hooks/useBackendLoad'
import type { Contract, Payment, ArchivedFileCategory, ArchivedFile } from '@/types'

export interface NewContractInput {
  projectId: string
  projectName: string
  customerId: string
  customerName: string
  contractDate: string
  attributedTo: string
  attributedToName: string
  projectAmount: number
  settlementAmount: number
  extraAmount: number
  extraTaxIncluded: boolean
  customerAttribute: 'company' | 'individual'
  isFirstContract: boolean
  payments: Omit<Payment, 'id'>[]
}

export interface UpdateContractInput {
  projectAmount?: number
  settlementAmount?: number
  extraAmount?: number
  extraTaxIncluded?: boolean
  extraPaid?: boolean
  isFirstContract?: boolean
  contractDate?: string
  attributedTo?: string
  attributedToName?: string
}

interface ContractContextType {
  contracts: Contract[]
  addContract: (input: NewContractInput) => Contract
  updateContract: (id: string, input: UpdateContractInput) => void
  updatePayment: (contractId: string, paymentId: string, updates: Partial<Payment>) => void
  addPayment: (contractId: string, input: { condition: string; amount: number }) => void
  removePayment: (contractId: string, paymentId: string) => void
  uploadContractFile: (contractId: string, fileData: string) => void
  submitForApproval: (contractId: string) => void
  approveContract: (contractId: string) => void
  rejectContract: (contractId: string) => void
  cancelContract: (contractId: string) => void
  deleteContract: (contractId: string) => void
  addArchivedFile: (contractId: string, file: { name: string; category: ArchivedFileCategory; data: string }) => void
  removeArchivedFile: (contractId: string, fileId: string) => void
}

const ContractContext = createContext<ContractContextType>({
  contracts: [],
  addContract: () => ({ id: '', customerId: '', customerName: '', projectId: '', projectName: '', contractDate: '', attributedTo: '', attributedToName: '', projectAmount: 0, settlementAmount: 0, extraAmount: 0, extraTaxIncluded: false, extraPaid: false, customerAttribute: 'company', isFirstContract: false, payments: [], processFiles: [], archivedFiles: [], approved: false, cancelled: false, submitted: false, stampContractUploaded: false, invoiceUploaded: false }),
  updateContract: () => {},
  updatePayment: () => {},
  addPayment: () => {},
  removePayment: () => {},
  uploadContractFile: () => {},
  submitForApproval: () => {},
  approveContract: () => {},
  rejectContract: () => {},
  cancelContract: () => {},
  deleteContract: () => {},
  addArchivedFile: () => {},
  removeArchivedFile: () => {},
})

/* ------------------------------------------------------------------ */
/*  Pure constructor — same pipeline used by mock seeds and the form   */
/* ------------------------------------------------------------------ */

function buildContract(input: NewContractInput, id?: string): Contract {
  return {
    id: id || generateId('cn'),
    customerId: input.customerId,
    customerName: input.customerName,
    projectId: input.projectId,
    projectName: input.projectName,
    contractDate: input.contractDate,
    attributedTo: input.attributedTo,
    attributedToName: input.attributedToName,
    projectAmount: input.projectAmount,
    settlementAmount: input.settlementAmount,
    extraAmount: input.extraAmount,
    extraTaxIncluded: input.extraTaxIncluded,
    extraPaid: false,
    customerAttribute: input.customerAttribute,
    isFirstContract: input.isFirstContract,
    payments: input.payments.map((p) => ({
      id: generateId('pm'),
      condition: p.condition,
      amount: p.amount,
      completed: p.completed || false,
      paymentDate: p.paymentDate,
    })),
    processFiles: [],
    archivedFiles: [],
    approved: false,
    cancelled: false,
    submitted: false,
    stampContractUploaded: false,
    invoiceUploaded: false,
  }
}

export function ContractProvider({ children }: { children: ReactNode }) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const { loginVersion, user } = useAuth()

  // Load from backend on mount and on re-login
  useBackendLoad<Contract>(
    () => contractsApi.list().then(data => data.map((c: any) => ({
      ...c,
      payments: c.payments || [],
      archivedFiles: c.archivedFiles || [],
      processFiles: c.processFiles || [],
    }))),
    setContracts,
    { trigger: loginVersion, loggedIn: !!user, clearOnLogout: true },
  )

  const addContract = useCallback((input: NewContractInput): Contract => {
    const newContract = buildContract(input)
    setContracts(prev => [...prev, newContract])
    isBackendAvailable().then(ok => {
      if (!ok) return
      contractsApi.create(newContract).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
    return newContract
  }, [])

  const updateContract = useCallback((id: string, input: UpdateContractInput) => {
    setContracts(prev => prev.map(c => {
      if (c.id !== id) return c
      const updates: Partial<Contract> = {}
      if (input.projectAmount !== undefined) updates.projectAmount = input.projectAmount
      if (input.settlementAmount !== undefined) updates.settlementAmount = input.settlementAmount
      if (input.extraAmount !== undefined) updates.extraAmount = input.extraAmount
      if (input.extraTaxIncluded !== undefined) updates.extraTaxIncluded = input.extraTaxIncluded
      if (input.extraPaid !== undefined) updates.extraPaid = input.extraPaid
      if (input.isFirstContract !== undefined) updates.isFirstContract = input.isFirstContract
      if (input.contractDate !== undefined) updates.contractDate = input.contractDate
      if (input.attributedTo !== undefined) updates.attributedTo = input.attributedTo
      if (input.attributedToName !== undefined) updates.attributedToName = input.attributedToName
      return { ...c, ...updates }
    }))
    isBackendAvailable().then(ok => {
      if (!ok) return
      contractsApi.update(id, input).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const updatePayment = useCallback((contractId: string, paymentId: string, updates: Partial<Payment>) => {
    setContracts(prev => prev.map(c => {
      if (c.id !== contractId) return c
      const updatedPayments = c.payments.map(p =>
        p.id === paymentId ? { ...p, ...updates } : p
      )
      const allDone = updatedPayments.every(p => p.completed)
      return { ...c, payments: updatedPayments, extraPaid: allDone ? true : c.extraPaid }
    }))
    isBackendAvailable().then(ok => {
      if (!ok) return
      contractsApi.updatePayment(contractId, paymentId, updates).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const addPayment = useCallback((contractId: string, input: { condition: string; amount: number }) => {
    setContracts(prev => prev.map(c => {
      if (c.id !== contractId) return c
      const newPayment: Payment = {
        id: generateId('pm'),
        condition: input.condition,
        amount: input.amount,
        completed: false,
      }
      return { ...c, payments: [...c.payments, newPayment] }
    }))
    isBackendAvailable().then(ok => {
      if (!ok) return
      contractsApi.addPayment(contractId, input).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const removePayment = useCallback((contractId: string, paymentId: string) => {
    setContracts(prev => prev.map(c => {
      if (c.id !== contractId) return c
      return { ...c, payments: c.payments.filter(p => p.id !== paymentId) }
    }))
    isBackendAvailable().then(ok => {
      if (!ok) return
      contractsApi.removePayment(contractId, paymentId).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const uploadContractFile = useCallback((contractId: string, fileData: string) => {
    setContracts(prev => prev.map(c =>
      c.id === contractId ? { ...c, contractFile: fileData, stampContractUploaded: true } : c
    ))
    isBackendAvailable().then(ok => {
      if (!ok) return
      contractsApi.update(contractId, { contractFile: fileData, stampContractUploaded: true }).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const submitForApproval = useCallback((contractId: string) => {
    setContracts(prev => prev.map(c =>
      c.id === contractId ? { ...c, submitted: true } : c
    ))
    isBackendAvailable().then(ok => {
      if (!ok) return
      contractsApi.update(contractId, { submitted: true }).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const approveContract = useCallback((contractId: string) => {
    setContracts(prev => prev.map(c =>
      c.id === contractId ? { ...c, approved: true, cancelled: false, submitted: false } : c
    ))
    isBackendAvailable().then(ok => {
      if (!ok) return
      contractsApi.update(contractId, { approved: true, cancelled: false, submitted: false }).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const rejectContract = useCallback((contractId: string) => {
    setContracts(prev => prev.map(c =>
      c.id === contractId
        ? { ...c, approved: false, cancelled: false, submitted: false, contractFile: '', stampContractUploaded: false }
        : c
    ))
    isBackendAvailable().then(ok => {
      if (!ok) return
      contractsApi.update(contractId, { approved: false, cancelled: false, submitted: false, contractFile: '', stampContractUploaded: false }).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const cancelContract = useCallback((contractId: string) => {
    setContracts(prev => prev.map(c =>
      c.id === contractId ? { ...c, approved: false, cancelled: true } : c
    ))
    isBackendAvailable().then(ok => {
      if (!ok) return
      contractsApi.update(contractId, { approved: false, cancelled: true }).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const deleteContract = useCallback((contractId: string) => {
    setContracts(prev => prev.filter(c => c.id !== contractId))
    isBackendAvailable().then(ok => {
      if (!ok) return
      contractsApi.delete(contractId).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const addArchivedFile = useCallback((contractId: string, file: { name: string; category: ArchivedFileCategory; data: string }) => {
    const now = new Date()
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const newFile: ArchivedFile = {
      id: generateId('af'),
      name: file.name,
      category: file.category,
      data: file.data,
      uploadedAt: ts,
    }
    setContracts(prev => prev.map(c =>
      c.id === contractId ? { ...c, archivedFiles: [...c.archivedFiles, newFile] } : c
    ))
    isBackendAvailable().then(ok => {
      if (!ok) return
      contractsApi.addArchivedFile(contractId, newFile).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  const removeArchivedFile = useCallback((contractId: string, fileId: string) => {
    setContracts(prev => prev.map(c =>
      c.id === contractId
        ? { ...c, archivedFiles: c.archivedFiles.filter(f => f.id !== fileId) }
        : c
    ))
    isBackendAvailable().then(ok => {
      if (!ok) return
      contractsApi.removeArchivedFile(contractId, fileId).catch(err => {
        console.error('[API]', err)
        toast.error('保存失败：' + (err?.message || '网络错误'))
      })
    })
  }, [])

  return (
    <ContractContext.Provider value={{
      contracts,
      addContract,
      updateContract,
      updatePayment,
      addPayment,
      removePayment,
      uploadContractFile,
      submitForApproval,
      approveContract,
      rejectContract,
      cancelContract,
      deleteContract,
      addArchivedFile,
      removeArchivedFile,
    }}>
      {children}
    </ContractContext.Provider>
  )
}

export function useContracts() {
  return useContext(ContractContext)
}
