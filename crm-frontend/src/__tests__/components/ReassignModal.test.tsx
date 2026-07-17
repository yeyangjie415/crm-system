import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import { UserProvider } from '@/hooks/useUsers'
import { AuditLogProvider } from '@/hooks/useAuditLog'
import { PermissionConfigProvider } from '@/hooks/usePermissionConfig'
import { AuthProvider } from '@/hooks/useAuth'
import { CustomerProvider, useCustomers } from '@/hooks/useCustomers'
import ReassignModal from '@/components/customer/ReassignModal'
import { mockUsers } from '@/mock/customers'

const seedHelpers = vi.hoisted(() => {
  let counter = 0
  return {
    generateId: (prefix: string) => `${prefix}${++counter}`,
    resetCounter: () => { counter = 0 },
  }
})

vi.mock('@/mock/customers', async (importOriginal) => {
  const mod = await importOriginal()
  return {
    ...(mod as Record<string, unknown>),
    generateId: seedHelpers.generateId,
  }
})

function DataSeeder() {
  const { addCustomer } = useCustomers()
  const seeded = useRef(false)

  useEffect(() => {
    if (seeded.current) return
    seeded.current = true

    // These receive IDs c1, c2, c3 thanks to the mocked generateId above
    addCustomer({
      name: '华科信息技术有限公司',
      region: '深圳',
      type: 'owner',
      positioning: 'vip',
      createdBy: '2',
      createdByName: '李销售',
    })
    addCustomer({
      name: '鼎新科技有限公司',
      region: '北京',
      type: 'integrator',
      positioning: 'key',
      createdBy: '2',
      createdByName: '李销售',
    })
    addCustomer({
      name: '远航集团有限公司',
      region: '上海',
      type: 'owner',
      positioning: 'key',
      createdBy: '6',
      createdByName: '刘销售',
    })
  }, [])

  return null
}

function renderReassignModal(selectedIds: string[], onReassigned = vi.fn()) {
  return render(
    <UserProvider>
      <AuditLogProvider>
        <PermissionConfigProvider>
          <AuthProvider>
            <CustomerProvider>
              <DataSeeder />
              <ReassignModal
                open={true}
                onClose={vi.fn()}
                selectedIds={selectedIds}
                onReassigned={onReassigned}
              />
            </CustomerProvider>
          </AuthProvider>
        </PermissionConfigProvider>
      </AuditLogProvider>
    </UserProvider>
  )
}

beforeEach(() => {
  seedHelpers.resetCounter()
  localStorage.clear()
  // Seed users into localStorage (UserProvider loads from here)
  localStorage.setItem('crm_users', JSON.stringify(mockUsers))
  // Simulate logged-in admin user (AuthProvider reads from here and
  // resolves the full user via loadPersistedUsers from crm_users above)
  localStorage.setItem('crm_user', JSON.stringify({ username: 'admin' }))
})

describe('ReassignModal', () => {
  it('renders the modal title', () => {
    renderReassignModal([])
    expect(screen.getByText('分配创建人')).toBeDefined()
  })

  it('shows selected customer count', () => {
    renderReassignModal(['c1', 'c2'])
    expect(screen.getByText('已选 2 个客户')).toBeDefined()
  })

  it('shows selected customer names', () => {
    renderReassignModal(['c1', 'c3'])
    expect(screen.getByText('华科信息技术有限公司')).toBeDefined()
    expect(screen.getByText('远航集团有限公司')).toBeDefined()
  })

  it('shows current creator for each selected customer', () => {
    renderReassignModal(['c1'])
    // c1's creator is 李销售 — verify the selected customer section contains the creator info
    const selectedSection = screen.getByText('华科信息技术有限公司').closest('div')
    expect(selectedSection?.textContent).toContain('现创建人：')
    expect(selectedSection?.textContent).toContain('李销售')
  })

  it('shows user list', () => {
    renderReassignModal(['c1'])
    // Admin user (张管理) should appear
    expect(screen.getByText('张管理')).toBeDefined()
    expect(screen.getByText('总经理')).toBeDefined()
  })

  it('filters users by search query', () => {
    renderReassignModal(['c1'])
    const searchInput = screen.getByPlaceholderText('搜索用户...')
    fireEvent.change(searchInput, { target: { value: '刘销售' } })
    expect(screen.getByText('刘销售')).toBeDefined()
    expect(screen.queryByText('张管理')).toBeNull()
  })

  it('shows "无匹配用户" when search has no results', () => {
    renderReassignModal(['c1'])
    const searchInput = screen.getByPlaceholderText('搜索用户...')
    fireEvent.change(searchInput, { target: { value: '不存在的用户xyz' } })
    expect(screen.getByText('无匹配用户')).toBeDefined()
  })

  it('confirm button is disabled when no user selected', () => {
    renderReassignModal(['c1'])
    const confirmBtn = screen.getByText(/确认分配/)
    expect(confirmBtn).toBeDisabled()
  })

  it('confirm button enables after selecting a user', () => {
    renderReassignModal(['c1'])
    // Click on 刘销售 in the user list
    const userBtn = screen.getByText('刘销售')
    fireEvent.click(userBtn)
    const confirmBtn = screen.getByText(/确认分配/)
    expect(confirmBtn).not.toBeDisabled()
  })

  it('reassigns customers and calls onReassigned on confirm', () => {
    const onReassigned = vi.fn()
    renderReassignModal(['c1', 'c2'], onReassigned)

    // Select user 刘销售
    fireEvent.click(screen.getByText('刘销售'))

    // Click confirm
    const confirmBtn = screen.getByText(/确认分配.*2.*客户/)
    fireEvent.click(confirmBtn)

    expect(onReassigned).toHaveBeenCalledOnce()
  })

  it('shows exact number in confirm button label', () => {
    renderReassignModal(['c1', 'c2', 'c3'])
    expect(screen.getByText(/确认分配.*3.*客户/)).toBeDefined()
  })

  it('renders empty state when no customers selected', () => {
    renderReassignModal([])
    expect(screen.getByText('已选 0 个客户')).toBeDefined()
  })
})
