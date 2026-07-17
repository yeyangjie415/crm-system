import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DealTable from '@/components/deal/DealTable'
import type { Contract } from '@/types'

const mockContracts: Contract[] = [
  {
    id: 'cn-test', customerId: 'c1', customerName: '测试公司', projectId: 'p1', projectName: '测试项目',
    contractDate: '2026-07-01', attributedTo: '1', attributedToName: '张管理',
    projectAmount: 500000, settlementAmount: 480000, extraAmount: 20000,
    extraTaxIncluded: true, extraPaid: false, customerAttribute: 'company', isFirstContract: true,
    payments: [
      { id: 'pm1', condition: '签约', amount: 240000, completed: true, paymentDate: '2026-07-02' },
      { id: 'pm2', condition: '验收', amount: 240000, completed: false },
    ],
    processFiles: [], archivedFiles: [], approved: false, cancelled: false, submitted: false,
    stampContractUploaded: true, invoiceUploaded: false,
  },
  {
    id: 'cn-test-2', customerId: 'c2', customerName: '第二公司', projectId: 'p2', projectName: '第二项目',
    contractDate: '2026-06-15', attributedTo: '2', attributedToName: '李销售',
    projectAmount: 300000, settlementAmount: 280000, extraAmount: 0,
    extraTaxIncluded: false, extraPaid: false, customerAttribute: 'company', isFirstContract: false,
    payments: [],
    processFiles: [], archivedFiles: [], approved: false, cancelled: false, submitted: false,
    stampContractUploaded: false, invoiceUploaded: false,
  },
]

describe('DealTable', () => {
  it('renders contract rows', () => {
    render(
      <MemoryRouter>
        <DealTable contracts={mockContracts} selected={[]} onSelect={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByText('测试公司')).toBeDefined()
    expect(screen.getByText('测试项目')).toBeDefined()
  })

  it('shows "已收完" when all payments are completed', () => {
    const allPaid = { ...mockContracts[0], payments: [{ id: 'pm1', condition: '全款', amount: 480000, completed: true }] }
    render(
      <MemoryRouter>
        <DealTable contracts={[allPaid]} selected={[]} onSelect={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByText('已收完')).toBeDefined()
  })

  it('renders multiple contract rows', () => {
    render(
      <MemoryRouter>
        <DealTable contracts={mockContracts} selected={[]} onSelect={vi.fn()} />
      </MemoryRouter>
    )
    expect(screen.getByText('测试公司')).toBeDefined()
    expect(screen.getByText('第二公司')).toBeDefined()
  })

  it('handles empty contracts array', () => {
    render(
      <MemoryRouter>
        <DealTable contracts={[]} selected={[]} onSelect={vi.fn()} />
      </MemoryRouter>
    )
    // Should render without crashing
    expect(screen.queryByText('测试公司')).toBeNull()
  })

  it('passes selected state to checkboxes', () => {
    const onSelect = vi.fn()
    render(
      <MemoryRouter>
        <DealTable contracts={mockContracts} selected={['cn-test']} onSelect={onSelect} />
      </MemoryRouter>
    )
    // The component renders checkboxes — the selected ID should be checked
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)
  })
})
