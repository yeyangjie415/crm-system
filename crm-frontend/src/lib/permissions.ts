import type { PermissionLevel, Customer, CustomerAccess } from '@/types'

export function isSuperAdmin(level: PermissionLevel): boolean {
  return level === 'super_admin'
}

export function isAdminOrAbove(level: PermissionLevel): boolean {
  return level === 'super_admin' || level === 'admin'
}

export function canManageSettings(level: PermissionLevel): boolean {
  return isAdminOrAbove(level)
}

export function canHardDelete(level: PermissionLevel): boolean {
  return isSuperAdmin(level)
}

export function isCreator(userId: string, customer: Customer): boolean {
  return customer.createdBy === userId
}

export function getAccessEntry(customer: Customer, userId: string): CustomerAccess | undefined {
  return customer.accessControl.find(ac => ac.userId === userId)
}

export function canViewDetail(userId: string, level: PermissionLevel, customer: Customer): boolean {
  if (isAdminOrAbove(level)) return true
  if (isCreator(userId, customer)) return true
  return getAccessEntry(customer, userId) !== undefined
}

/** 客户列表可见性：一般用户只看自己创建 / 被分配 / 共同跟进获批的客户 */
export function canViewInList(userId: string, level: PermissionLevel, customer: Customer): boolean {
  return canViewDetail(userId, level, customer)
}

export function canEdit(userId: string, level: PermissionLevel, customer: Customer): boolean {
  if (isAdminOrAbove(level)) return true
  if (isCreator(userId, customer)) return true
  const access = getAccessEntry(customer, userId)
  return access?.permission === 'edit'
}

export function canShare(userId: string, level: PermissionLevel, customer: Customer): boolean {
  if (isAdminOrAbove(level)) return true
  return isCreator(userId, customer)
}

export interface DuplicateCheckResult {
  isExactMatch: boolean
  similarCustomers: Array<{ id: string; name: string; createdBy: string }>
}

export function checkDuplicates(newName: string, allCustomers: Customer[]): DuplicateCheckResult {
  const normalized = (s: string) =>
    s.toLowerCase().replace(/\s+/g, '').replace(/[（(].*?[)）]/g, '')
  const trimmed = newName.trim()
  const baseNew = normalized(trimmed)

  const exactMatch = allCustomers.find(
    c => c.name.trim() === trimmed && !c.deleted
  )

  const similar: DuplicateCheckResult['similarCustomers'] = []

  if (!exactMatch) {
    for (const c of allCustomers) {
      if (c.deleted) continue
      const baseExisting = normalized(c.name)
      if (baseNew && baseExisting && (baseNew.includes(baseExisting) || baseExisting.includes(baseNew))) {
        similar.push({ id: c.id, name: c.name, createdBy: c.createdBy })
      }
    }
  }

  return { isExactMatch: !!exactMatch, similarCustomers: similar }
}
