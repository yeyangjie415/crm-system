import { describe, it, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import { ContractProvider, useContracts, type NewContractInput } from '@/hooks/useContracts'
import type { Contract } from '@/types'

function createCollector() {
  let captured: ReturnType<typeof useContracts> | null = null
  function Collector() {
    captured = useContracts()
    return null
  }
  return {
    Collector,
    get: () => {
      if (!captured) throw new Error('Context not captured')
      return captured
    },
  }
}

function renderContractProvider() {
  const { Collector, get } = createCollector()
  render(<ContractProvider><Collector /></ContractProvider>)
  return get
}

/* ------------------------------------------------------------------ */

const baseInput: NewContractInput = {
  projectId: 'p-test',
  projectName: '测试项目',
  customerId: 'c-test',
  customerName: '测试客户',
  contractDate: '2026-07-15',
  attributedTo: '2',
  attributedToName: '李销售',
  projectAmount: 300_000,
  settlementAmount: 280_000,
  extraAmount: 0,
  extraTaxIncluded: false,
  customerAttribute: 'company',
  isFirstContract: false,
  payments: [
    { condition: '签约', amount: 140_000 },
    { condition: '验收', amount: 140_000 },
  ],
}

/* ================================================================== */

describe('ContractProvider', () => {
  it('initializes with empty contracts', () => {
    const get = renderContractProvider()
    expect(get().contracts.length).toBe(0)
  })

  /* ---- addContract ---- */

  it('addContract creates a contract with correct id prefix', () => {
    const get = renderContractProvider()
    let c: Contract | undefined
    act(() => { c = get().addContract(baseInput) })
    expect(c!.id).toMatch(/^cn-/)
  })

  it('addContract generates payment IDs', () => {
    const get = renderContractProvider()
    let c: Contract | undefined
    act(() => { c = get().addContract(baseInput) })
    expect(c!.payments).toHaveLength(2)
    expect(c!.payments[0].id).toMatch(/^pm-/)
    expect(c!.payments[1].id).toMatch(/^pm-/)
  })

  it('addContract sets default flags', () => {
    const get = renderContractProvider()
    let c: Contract | undefined
    act(() => { c = get().addContract(baseInput) })
    expect(c!.approved).toBe(false)
    expect(c!.cancelled).toBe(false)
    expect(c!.submitted).toBe(false)
    expect(c!.extraPaid).toBe(false)
  })

  /* ---- updateContract ---- */

  it('updateContract changes attributedTo', () => {
    const get = renderContractProvider()
    let c: Contract | undefined
    act(() => { c = get().addContract(baseInput) })
    act(() => { get().updateContract(c!.id, { attributedTo: '6', attributedToName: '刘销售' }) })
    const updated = get().contracts.find(ct => ct.id === c!.id)
    expect(updated?.attributedTo).toBe('6')
    expect(updated?.attributedToName).toBe('刘销售')
  })

  it('updateContract changes settlementAmount', () => {
    const get = renderContractProvider()
    let c: Contract | undefined
    act(() => { c = get().addContract(baseInput) })
    act(() => { get().updateContract(c!.id, { settlementAmount: 999_999 }) })
    expect(get().contracts.find(ct => ct.id === c!.id)?.settlementAmount).toBe(999_999)
  })

  /* ---- updatePayment ---- */

  it('updatePayment marks a payment as completed', () => {
    const get = renderContractProvider()
    let c: Contract | undefined
    act(() => { c = get().addContract(baseInput) })
    const pmtId = c!.payments[0].id
    act(() => { get().updatePayment(c!.id, pmtId, { completed: true }) })
    const updated = get().contracts.find(ct => ct.id === c!.id)
    expect(updated?.payments.find(p => p.id === pmtId)?.completed).toBe(true)
  })

  it('updatePayment sets extraPaid when all payments completed', () => {
    const get = renderContractProvider()
    // Create a contract with 1 payment, mark it complete → extraPaid
    let c: Contract | undefined
    act(() => {
      c = get().addContract({
        ...baseInput,
        payments: [{ condition: '全款', amount: 280_000 }],
      })
    })
    const pmtId = c!.payments[0].id
    act(() => { get().updatePayment(c!.id, pmtId, { completed: true, paymentDate: '2026-07-16' }) })
    const updated = get().contracts.find(ct => ct.id === c!.id)
    expect(updated?.extraPaid).toBe(true)
  })

  /* ---- addPayment / removePayment ---- */

  it('addPayment appends a payment to the contract', () => {
    const get = renderContractProvider()
    let c: Contract | undefined
    act(() => { c = get().addContract(baseInput) })
    const before = c!.payments.length
    act(() => { get().addPayment(c!.id, { condition: '质保金', amount: 10_000 }) })
    const updated = get().contracts.find(ct => ct.id === c!.id)
    expect(updated?.payments.length).toBe(before + 1)
  })

  it('removePayment deletes a specific payment', () => {
    const get = renderContractProvider()
    let c: Contract | undefined
    act(() => { c = get().addContract(baseInput) })
    const pmtId = c!.payments[0].id
    const before = c!.payments.length
    act(() => { get().removePayment(c!.id, pmtId) })
    const updated = get().contracts.find(ct => ct.id === c!.id)
    expect(updated?.payments.length).toBe(before - 1)
    expect(updated?.payments.find(p => p.id === pmtId)).toBeUndefined()
  })

  /* ---- Approval state machine ---- */

  it('submitForApproval → sets submitted = true', () => {
    const get = renderContractProvider()
    let c: Contract | undefined
    act(() => { c = get().addContract(baseInput) })
    act(() => { get().submitForApproval(c!.id) })
    expect(get().contracts.find(ct => ct.id === c!.id)?.submitted).toBe(true)
  })

  it('approveContract → approved=true, cancelled=false, submitted=false', () => {
    const get = renderContractProvider()
    let c: Contract | undefined
    act(() => { c = get().addContract(baseInput) })
    act(() => { get().submitForApproval(c!.id) })
    act(() => { get().approveContract(c!.id) })
    const result = get().contracts.find(ct => ct.id === c!.id)
    expect(result?.approved).toBe(true)
    expect(result?.cancelled).toBe(false)
    expect(result?.submitted).toBe(false)
  })

  it('rejectContract clears submitted and stampContractUploaded', () => {
    const get = renderContractProvider()
    let c: Contract | undefined
    act(() => { c = get().addContract(baseInput) })
    act(() => { get().submitForApproval(c!.id) })
    act(() => { get().rejectContract(c!.id) })
    const result = get().contracts.find(ct => ct.id === c!.id)
    expect(result?.submitted).toBe(false)
    expect(result?.approved).toBe(false)
    expect(result?.stampContractUploaded).toBe(false)
  })

  it('cancelContract → cancelled=true, approved=false', () => {
    const get = renderContractProvider()
    let c: Contract | undefined
    act(() => { c = get().addContract(baseInput) })
    act(() => { get().cancelContract(c!.id) })
    const result = get().contracts.find(ct => ct.id === c!.id)
    expect(result?.cancelled).toBe(true)
    expect(result?.approved).toBe(false)
  })

  it('deleteContract removes the contract', () => {
    const get = renderContractProvider()
    let c: Contract | undefined
    act(() => { c = get().addContract(baseInput) })
    const before = get().contracts.length
    act(() => { get().deleteContract(c!.id) })
    expect(get().contracts.length).toBe(before - 1)
  })
})
