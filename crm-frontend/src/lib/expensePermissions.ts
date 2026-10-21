import type { Expense, User } from '@/types'

/** 管理员级（admin / super_admin） */
export const isAdminLevel = (u?: Pick<User, 'permissionLevel'> | null) =>
  !!u && (u.permissionLevel === 'admin' || u.permissionLevel === 'super_admin')

/** 财务动作权限：财务岗位或管理员级 */
export const canFinanceAct = (u?: Pick<User, 'role' | 'permissionLevel'> | null) =>
  !!u && (u.role === 'finance' || isAdminLevel(u))

/**
 * 一级审核权限：提交人的直属主管；
 * 提交人未设置主管时由管理员级用户兜底审核。
 */
export function canManagerReview(
  actor: Pick<User, 'id' | 'permissionLevel'> | null | undefined,
  submitter: Pick<User, 'managerId'> | undefined,
): boolean {
  if (!actor) return false
  if (isAdminLevel(actor)) return true
  return !!submitter?.managerId && submitter.managerId === actor.id
}

/** 编辑：仅提交人本人，且单据处于待主管审核/已驳回 */
export const canEditExpense = (actor: User | null | undefined, e: Expense) =>
  !!actor && e.submittedById === actor.id && (e.status === 'pending_manager' || e.status === 'rejected')

/** 删除：仅草稿态/已驳回（本人）或管理员级；核销办结归档单据一般用户不可删除 */
export const canDeleteExpense = (actor: User | null | undefined, e: Expense) => {
  if (!actor) return false
  if (e.status === 'settled' && !isAdminLevel(actor)) return false // 办结归档：仅管理员可删
  return canEditExpense(actor, e) || isAdminLevel(actor)
}

/** 签收：仅申请人本人，单据已打款 */
export const canSettleExpense = (actor: User | null | undefined, e: Expense) =>
  !!actor && e.status === 'paid' && e.submittedById === actor.id
