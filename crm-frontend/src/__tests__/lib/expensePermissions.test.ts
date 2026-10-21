import { describe, it, expect } from 'vitest'
import {
  isAdminLevel, canFinanceAct, canManagerReview,
  canEditExpense, canDeleteExpense, canSettleExpense,
} from '@/lib/expensePermissions'
import type { Expense, User } from '@/types'

const mkUser = (over: Partial<User> = {}): User => ({
  id: 'u1', name: '测试', username: 'test', password: '', role: 'salesperson',
  permissionLevel: 'general', createdAt: '2026-01-01', disabled: false, managerId: null,
  ...over,
})

const mkExpense = (over: Partial<Expense> = {}): Expense => ({
  id: 'e1', customerId: 'c1', customerName: '客户', visitId: null,
  fieldworkDate: '2026-08-01', fieldworkLocation: '深圳', workContent: '拜访',
  notes: null, totalAmount: 100, status: 'pending_manager',
  submittedById: 'u1', submittedByName: '测试', rejectReason: null, rejectedByStage: null,
  statusHistory: [], attachments: [], items: [], createdAt: '2026-08-01 09:00', updatedAt: '2026-08-01 09:00',
  ...over,
})

describe('expensePermissions（SOP 审核权限规则）', () => {
  it('isAdminLevel: 仅 admin/super_admin', () => {
    expect(isAdminLevel(mkUser({ permissionLevel: 'super_admin' }))).toBe(true)
    expect(isAdminLevel(mkUser({ permissionLevel: 'admin' }))).toBe(true)
    expect(isAdminLevel(mkUser({ permissionLevel: 'general' }))).toBe(false)
    expect(isAdminLevel(null)).toBe(false)
  })

  it('canFinanceAct: 财务岗位或管理员级', () => {
    expect(canFinanceAct(mkUser({ role: 'finance', permissionLevel: 'general' }))).toBe(true)
    expect(canFinanceAct(mkUser({ role: 'salesperson', permissionLevel: 'admin' }))).toBe(true)
    expect(canFinanceAct(mkUser({ role: 'salesperson', permissionLevel: 'general' }))).toBe(false)
  })

  it('canManagerReview: 提交人的直属主管可审', () => {
    const manager = mkUser({ id: 'm1' })
    const submitter = mkUser({ id: 'u2', managerId: 'm1' })
    expect(canManagerReview(manager, submitter)).toBe(true)
    // 非主管且非管理员不可审
    expect(canManagerReview(mkUser({ id: 'other' }), submitter)).toBe(false)
  })

  it('canManagerReview: 提交人未设主管时管理员级兜底', () => {
    const submitterNoManager = mkUser({ id: 'u2', managerId: null })
    expect(canManagerReview(mkUser({ id: 'boss', permissionLevel: 'admin' }), submitterNoManager)).toBe(true)
    expect(canManagerReview(mkUser({ id: 'peer', permissionLevel: 'general' }), submitterNoManager)).toBe(false)
  })

  it('canManagerReview: 管理员可审任意下属单据', () => {
    const submitter = mkUser({ id: 'u2', managerId: 'someone-else' })
    expect(canManagerReview(mkUser({ id: 'boss', permissionLevel: 'super_admin' }), submitter)).toBe(true)
  })

  it('canEditExpense: 仅本人且处于待主管审核/已驳回', () => {
    const owner = mkUser({ id: 'u1' })
    expect(canEditExpense(owner, mkExpense({ status: 'pending_manager' }))).toBe(true)
    expect(canEditExpense(owner, mkExpense({ status: 'rejected' }))).toBe(true)
    expect(canEditExpense(owner, mkExpense({ status: 'pending_finance' }))).toBe(false)
    expect(canEditExpense(mkUser({ id: 'other' }), mkExpense({ status: 'pending_manager' }))).toBe(false)
  })

  it('canDeleteExpense: 本人可删草稿态，管理员可删任意', () => {
    const owner = mkUser({ id: 'u1' })
    expect(canDeleteExpense(owner, mkExpense({ status: 'pending_manager' }))).toBe(true)
    expect(canDeleteExpense(owner, mkExpense({ status: 'settled' }))).toBe(false)
    expect(canDeleteExpense(mkUser({ id: 'boss', permissionLevel: 'admin' }), mkExpense({ status: 'settled' }))).toBe(true)
  })

  it('canDeleteExpense: 核销办结归档（settled）单据一般用户不可删除', () => {
    const owner = mkUser({ id: 'u1' }) // 一般用户，且为申请人本人
    const settledOwn = mkExpense({ status: 'settled', submittedById: 'u1' })
    const settledOther = mkExpense({ status: 'settled', submittedById: 'u2' })
    expect(canDeleteExpense(owner, settledOwn)).toBe(false)
    expect(canDeleteExpense(owner, settledOther)).toBe(false)
    expect(canDeleteExpense(null, settledOwn)).toBe(false)
  })

  it('canDeleteExpense: 办结归档单据仅管理员可删（数据维护）', () => {
    expect(canDeleteExpense(mkUser({ id: 'boss', permissionLevel: 'admin' }), mkExpense({ status: 'settled' }))).toBe(true)
    expect(canDeleteExpense(mkUser({ id: 'root', permissionLevel: 'super_admin' }), mkExpense({ status: 'settled' }))).toBe(true)
  })

  it('canDeleteExpense: 非草稿态（paid 等）一般用户本人也不可删', () => {
    const owner = mkUser({ id: 'u1' })
    expect(canDeleteExpense(owner, mkExpense({ status: 'paid', submittedById: 'u1' }))).toBe(false)
    expect(canDeleteExpense(owner, mkExpense({ status: 'pending_finance', submittedById: 'u1' }))).toBe(false)
    expect(canDeleteExpense(owner, mkExpense({ status: 'pending_payment', submittedById: 'u1' }))).toBe(false)
  })

  it('canSettleExpense: 仅申请人本人可签收已打款单据', () => {
    const owner = mkUser({ id: 'u1' })
    expect(canSettleExpense(owner, mkExpense({ status: 'paid' }))).toBe(true)
    expect(canSettleExpense(owner, mkExpense({ status: 'pending_payment' }))).toBe(false)
    expect(canSettleExpense(mkUser({ id: 'other' }), mkExpense({ status: 'paid' }))).toBe(false)
  })
})
