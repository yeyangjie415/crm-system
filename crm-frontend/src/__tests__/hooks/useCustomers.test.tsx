import { describe, it, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import { CustomerProvider, useCustomers, type NewCustomerInput } from '@/hooks/useCustomers'
import { AuditLogProvider } from '@/hooks/useAuditLog'
import type { Customer } from '@/types'

function createCollector() {
  let captured: ReturnType<typeof useCustomers> | null = null
  function Collector() {
    captured = useCustomers()
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

function renderCustomerProvider() {
  const { Collector, get } = createCollector()
  render(<AuditLogProvider><CustomerProvider><Collector /></CustomerProvider></AuditLogProvider>)
  return get
}

/* ------------------------------------------------------------------ */

const newCustomerInput: NewCustomerInput = {
  name: '测试客户公司',
  region: '北京',
  type: 'owner',
  positioning: 'normal',
  createdBy: '2',
  createdByName: '李销售',
}

/* ================================================================== */

describe('CustomerProvider', () => {
  it('initializes with empty customers', () => {
    const get = renderCustomerProvider()
    expect(get().customers.length).toBe(0)
  })

  /* ---- addCustomer ---- */

  it('addCustomer creates customer with correct id prefix', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    expect(c!.id).toMatch(/^c-/)
    expect(c!.name).toBe('测试客户公司')
    expect(c!.deleted).toBe(false)
    expect(c!.createdBy).toBe('2')
  })

  it('addCustomer derives region from province/city/district', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => {
      c = get().addCustomer({
        ...newCustomerInput,
        provinceName: '广东省',
        cityName: '深圳市',
        districtName: '南山区',
      })
    })
    expect(c!.region).toBe('广东省 深圳市 南山区')
  })

  it('addCustomer sets contact customerId', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => {
      c = get().addCustomer({
        ...newCustomerInput,
        contacts: [{ name: '张经理', phone: '13800000000', position: '采购' }],
      })
    })
    expect(c!.contacts).toHaveLength(1)
    expect(c!.contacts[0].customerId).toBe(c!.id)
  })

  /* ---- updateCustomer ---- */

  it('updateCustomer modifies name and type', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    act(() => { get().updateCustomer(c!.id, { name: '新名称', type: 'channel' }) })
    const updated = get().customers.find(ct => ct.id === c!.id)
    expect(updated?.name).toBe('新名称')
    expect(updated?.type).toBe('channel')
  })

  it('updateCustomer re-derives region from address fields', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    act(() => { get().updateCustomer(c!.id, { provinceName: '上海市', cityName: '浦东新区' }) })
    const updated = get().customers.find(ct => ct.id === c!.id)
    expect(updated?.region).toBe('上海市 浦东新区')
  })

  /* ---- contacts ---- */

  it('addContact appends to contacts', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    act(() => { get().addContact(c!.id, { name: '新联系人', phone: '123', position: '经理' }) })
    expect(get().customers.find(ct => ct.id === c!.id)?.contacts.length).toBe(1)
  })

  it('deleteContact removes a contact', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => {
      c = get().addCustomer({
        ...newCustomerInput,
        contacts: [{ name: '张经理', phone: '13800000000', position: '采购' }],
      })
    })
    const contactId = c!.contacts[0].id
    const before = c!.contacts.length
    act(() => { get().deleteContact(c!.id, contactId) })
    const updated = get().customers.find(ct => ct.id === c!.id)
    expect(updated?.contacts.length).toBe(before - 1)
  })

  /* ---- share / access control ---- */

  it('shareCustomer adds accessControl entry', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    act(() => { get().shareCustomer(c!.id, { userId: 'u99', userName: '测试用户', permission: 'view' }) })
    const updated = get().customers.find(ct => ct.id === c!.id)
    expect(updated?.accessControl.some(ac => ac.userId === 'u99')).toBe(true)
  })

  it('shareCustomer updates existing entry instead of duplicating', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    act(() => { get().shareCustomer(c!.id, { userId: 'u99', userName: '测试用户', permission: 'view' }) })
    act(() => { get().shareCustomer(c!.id, { userId: 'u99', userName: '测试用户', permission: 'edit' }) })
    const updated = get().customers.find(ct => ct.id === c!.id)
    const entries = updated?.accessControl.filter(ac => ac.userId === 'u99')
    expect(entries?.length).toBe(1)
    expect(entries?.[0].permission).toBe('edit')
  })

  it('removeAccess removes accessControl entry', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    act(() => { get().shareCustomer(c!.id, { userId: 'u99', userName: '测试', permission: 'view' }) })
    act(() => { get().removeAccess(c!.id, 'u99') })
    const updated = get().customers.find(ct => ct.id === c!.id)
    expect(updated?.accessControl.some(ac => ac.userId === 'u99')).toBe(false)
  })

  /* ---- softDelete / hardDelete / restore ---- */

  it('softDeleteCustomer sets deletion markers', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    act(() => { get().softDeleteCustomer(c!.id, '1', '张管理') })
    const updated = get().customers.find(ct => ct.id === c!.id)
    expect(updated?.hiddenBy).toContain('1')
    expect(updated?.deletedBy).toBe('张管理')
    expect(updated?.deletedAt).toBeTruthy()
  })

  it('hardDeleteCustomer removes customer entirely', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    const before = get().customers.length
    act(() => { get().hardDeleteCustomer(c!.id, '张管理') })
    expect(get().customers.length).toBe(before - 1)
    expect(get().customers.find(ct => ct.id === c!.id)).toBeUndefined()
  })

  it('restoreCustomer clears deletion flags', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    act(() => { get().softDeleteCustomer(c!.id, '1', '张管理') })
    act(() => { get().restoreCustomer(c!.id, '张管理') })
    const restored = get().customers.find(ct => ct.id === c!.id)
    expect(restored?.deleted).toBe(false)
    expect(restored?.hiddenBy).toBeUndefined()
    expect(restored?.deletedBy).toBeUndefined()
  })

  /* ---- reassign ---- */

  it('reassignCustomer changes createdBy and clears deletion flags', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    act(() => { get().softDeleteCustomer(c!.id, '1', '张管理') })
    act(() => { get().reassignCustomer(c!.id, '6', '刘销售', '张管理') })
    const result = get().customers.find(ct => ct.id === c!.id)
    expect(result?.createdBy).toBe('6')
    expect(result?.createdByName).toBe('刘销售')
    expect(result?.deleted).toBe(false)
  })

  /* ---- projects ---- */

  it('addProject creates a project under customer', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    act(() => {
      get().addProject(c!.id, {
        name: '新项目', customerName: '测试客户', reportStatus: 'exclusive',
        followStatus: 'following', amount: 100_000, createdBy: '2',
      })
    })
    const updated = get().customers.find(ct => ct.id === c!.id)
    expect(updated?.projects.length).toBe(1)
    expect(updated?.projects[0].id).toMatch(/^p-/)
  })

  /* ---- pool ---- */

  it('claimFromPool sets ownedBy', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    act(() => { get().claimFromPool(c!.id, '2', '李销售') })
    const updated = get().customers.find(ct => ct.id === c!.id)
    expect(updated?.ownedBy).toBe('2')
    expect(updated?.ownedByName).toBe('李销售')
  })

  it('releaseToPool clears ownedBy', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    act(() => { get().claimFromPool(c!.id, '2', '李销售') })
    act(() => { get().releaseToPool(c!.id) })
    const updated = get().customers.find(ct => ct.id === c!.id)
    expect(updated?.ownedBy).toBeUndefined()
    expect(updated?.ownedByName).toBeUndefined()
    expect(updated?.reclaimedAt).toBeTruthy()
  })

  /* ---- getters ---- */

  it('getCustomer returns undefined for nonexistent id', () => {
    const get = renderCustomerProvider()
    expect(get().getCustomer('nonexistent')).toBeUndefined()
  })

  it('getCustomer returns customer by id', () => {
    const get = renderCustomerProvider()
    let c: Customer | undefined
    act(() => { c = get().addCustomer(newCustomerInput) })
    expect(get().getCustomer(c!.id)?.id).toBe(c!.id)
  })
})
