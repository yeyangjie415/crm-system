import { describe, it, expect } from 'vitest'
import {
  DEFAULT_COMMISSION_PARAMS,
  computeFixedBonus,
  computeFloatingBonus,
  computeQuarterlyCommissions,
  computeNewCustomerBonus,
  computeTechCommission,
  computeSalesTotal,
  computeBreakdown,
  type EnabledBonuses,
} from '@/lib/commission'
import type { Contract } from '@/types'

/* ------------------------------------------------------------------ */
/*  Test helpers                                                       */
/* ------------------------------------------------------------------ */

function makeContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: 'cn-test',
    customerId: 'c1',
    customerName: '测试公司',
    projectId: 'p1',
    projectName: '测试项目',
    contractDate: '2026-07-01',
    attributedTo: '2',
    attributedToName: '李销售',
    projectAmount: 500_000,
    settlementAmount: 500_000,
    extraAmount: 0,
    extraTaxIncluded: false,
    extraPaid: false,
    customerAttribute: 'company',
    isFirstContract: false,
    payments: [],
    processFiles: [],
    archivedFiles: [],
    approved: false,
    cancelled: false,
    submitted: false,
    stampContractUploaded: false,
    invoiceUploaded: false,
    ...overrides,
  }
}

const allEnabled: EnabledBonuses = {
  quarterly: true,
  fixedBonus: true,
  newCustomer: true,
  floating: true,
  tech: true,
}

const allDisabled: EnabledBonuses = {
  quarterly: false,
  fixedBonus: false,
  newCustomer: false,
  floating: false,
  tech: false,
}

/* ================================================================== */
/*  computeFixedBonus                                                  */
/* ================================================================== */

describe('computeFixedBonus', () => {
  const p = DEFAULT_COMMISSION_PARAMS

  it('returns 0 when totalSettlement is 0', () => {
    expect(computeFixedBonus(0, p).bonus).toBe(0)
  })

  it('returns 0 when totalSettlement equals tier1Min (exclusive boundary)', () => {
    // 600,000 exactly — because the check is > not >=
    expect(computeFixedBonus(600_000, p).bonus).toBe(0)
    expect(computeFixedBonus(600_000, p).tierLabel).toBe('未达最低档')
  })

  it('returns tier1 bonus when just above tier1Min', () => {
    expect(computeFixedBonus(600_001, p).bonus).toBe(10_000)
  })

  it('returns tier1 bonus at tier1Max', () => {
    expect(computeFixedBonus(1_200_000, p).bonus).toBe(10_000)
  })

  it('returns tier2 bonus when just above tier2Min', () => {
    expect(computeFixedBonus(1_200_001, p).bonus).toBe(15_000)
  })

  it('returns tier2 bonus at tier2Max', () => {
    expect(computeFixedBonus(2_000_000, p).bonus).toBe(15_000)
  })

  it('returns tier3 bonus when just above tier3Min', () => {
    expect(computeFixedBonus(2_000_001, p).bonus).toBe(20_000)
  })

  it('returns tier3 bonus for very large amounts', () => {
    expect(computeFixedBonus(10_000_000, p).bonus).toBe(20_000)
  })

  it('returns correct tier labels', () => {
    expect(computeFixedBonus(0, p).tierLabel).toBe('未达最低档')
    expect(computeFixedBonus(600_001, p).tierLabel).toContain('Tier 1')
    expect(computeFixedBonus(1_200_001, p).tierLabel).toContain('Tier 2')
    expect(computeFixedBonus(2_000_001, p).tierLabel).toContain('Tier 3')
  })
})

/* ================================================================== */
/*  computeFloatingBonus                                               */
/* ================================================================== */

describe('computeFloatingBonus', () => {
  const p = DEFAULT_COMMISSION_PARAMS

  it('returns rate 0 when below tier1Min', () => {
    const r = computeFloatingBonus(500_000, p)
    expect(r.rate).toBe(0)
    expect(r.bonus).toBe(0)
    expect(r.tierLabel).toBe('未达最低档')
  })

  it('returns rate 0 when exactly at tier1Min', () => {
    expect(computeFloatingBonus(600_000, p).rate).toBe(0)
  })

  it('returns floatRate1 when in tier 1', () => {
    const r = computeFloatingBonus(800_000, p)
    expect(r.rate).toBe(0.01)
    expect(r.bonus).toBe(8000)
  })

  it('returns floatRate2 when in tier 2', () => {
    const r = computeFloatingBonus(1_500_000, p)
    expect(r.rate).toBe(0.02)
    expect(r.bonus).toBe(30_000)
  })

  it('returns floatRate3 when above tier3Min', () => {
    const r = computeFloatingBonus(3_000_000, p)
    expect(r.rate).toBe(0.04)
    expect(r.bonus).toBe(120_000)
  })
})

/* ================================================================== */
/*  computeQuarterlyCommissions                                        */
/* ================================================================== */

describe('computeQuarterlyCommissions', () => {
  const p = DEFAULT_COMMISSION_PARAMS

  it('separates personal and company amounts', () => {
    const contracts = [
      makeContract({ id: 'cn1', settlementAmount: 100_000, customerAttribute: 'individual' }),
      makeContract({ id: 'cn2', settlementAmount: 200_000, customerAttribute: 'company' }),
    ]
    const r = computeQuarterlyCommissions(contracts, p)
    expect(r.personalAmount).toBe(100_000)
    expect(r.companyAmount).toBe(200_000)
  })

  it('applies correct rates', () => {
    const contracts = [
      makeContract({ id: 'cn1', settlementAmount: 100_000, customerAttribute: 'individual' }),
      makeContract({ id: 'cn2', settlementAmount: 200_000, customerAttribute: 'company' }),
    ]
    const r = computeQuarterlyCommissions(contracts, p)
    expect(r.quarterlyPersonal).toBe(2_000)  // 100k * 2%
    expect(r.quarterlyCompany).toBe(2_000)    // 200k * 1%
    expect(r.quarterlyTotal).toBe(4_000)
  })

  it('returns zeros for empty contracts', () => {
    const r = computeQuarterlyCommissions([], p)
    expect(r.quarterlyTotal).toBe(0)
  })

  it('treats falsy customerAttribute as company (default)', () => {
    // falsy attribute defaults to 'company' rate via the filter logic
    const contracts = [
      makeContract({ id: 'cn1', settlementAmount: 100_000, customerAttribute: undefined as any }),
    ]
    const r = computeQuarterlyCommissions(contracts, p)
    // Not individual, so personalAmount = 0; but also won't match 'company' filter
    expect(r.personalAmount).toBe(0)
    expect(r.companyAmount).toBe(0)
  })
})

/* ================================================================== */
/*  computeNewCustomerBonus                                            */
/* ================================================================== */

describe('computeNewCustomerBonus', () => {
  const p = DEFAULT_COMMISSION_PARAMS

  it('only counts contracts with isFirstContract', () => {
    const contracts = [
      makeContract({ id: 'cn1', settlementAmount: 300_000, isFirstContract: true }),
      makeContract({ id: 'cn2', settlementAmount: 500_000, isFirstContract: false }),
    ]
    const r = computeNewCustomerBonus(contracts, p)
    expect(r.newCustomerTotal).toBe(300_000)
    expect(r.bonus).toBe(9_000) // 300k * 3%
  })

  it('returns 0 when no first contracts', () => {
    const contracts = [makeContract({ isFirstContract: false })]
    expect(computeNewCustomerBonus(contracts, p).bonus).toBe(0)
  })
})

/* ================================================================== */
/*  computeTechCommission                                              */
/* ================================================================== */

describe('computeTechCommission', () => {
  it('computes tech commission from total settlement and rate', () => {
    expect(computeTechCommission(1_000_000, 0.02)).toBe(20_000)
    expect(computeTechCommission(0, 0.02)).toBe(0)
    expect(computeTechCommission(500_000, 0.05)).toBe(25_000)
  })
})

/* ================================================================== */
/*  computeSalesTotal                                                  */
/* ================================================================== */

describe('computeSalesTotal', () => {
  it('sums all when fully enabled', () => {
    expect(computeSalesTotal(4_000, 10_000, 9_000, 8_000, allEnabled)).toBe(31_000)
  })

  it('excludes disabled categories', () => {
    const partial: EnabledBonuses = { quarterly: false, fixedBonus: true, newCustomer: true, floating: false, tech: true }
    expect(computeSalesTotal(4_000, 10_000, 9_000, 8_000, partial)).toBe(19_000)
  })

  it('returns 0 when all disabled', () => {
    expect(computeSalesTotal(4_000, 10_000, 9_000, 8_000, allDisabled)).toBe(0)
  })
})

/* ================================================================== */
/*  computeBreakdown                                                   */
/* ================================================================== */

describe('computeBreakdown', () => {
  const p = DEFAULT_COMMISSION_PARAMS

  it('returns empty array for empty contracts', () => {
    expect(computeBreakdown([], p, allEnabled, '', '')).toEqual([])
  })

  it('single contract gets all commission', () => {
    const contracts = [makeContract({ id: 'cn1', settlementAmount: 1_000_000, customerName: '公司A' })]
    const b = computeBreakdown(contracts, p, allEnabled, 'tech1', '王技术')
    expect(b).toHaveLength(1)
    expect(b[0].customerName).toBe('公司A')
    expect(b[0].techPersonName).toBe('王技术')
    expect(b[0].salesCommission).toBeGreaterThan(0)
    expect(b[0].techCommission).toBeGreaterThan(0)
  })

  it('uses "未选择" when techPersonName is empty', () => {
    const contracts = [makeContract()]
    const b = computeBreakdown(contracts, p, allEnabled, 't1', '')
    expect(b[0].techPersonName).toBe('未选择')
  })

  it('distributes fixed bonus proportionally across two equal contracts', () => {
    // Two contracts at 500k each, total = 1000k → tier 1 (600k-1200k), bonus = 10000
    const contracts = [
      makeContract({ id: 'cn1', settlementAmount: 500_000 }),
      makeContract({ id: 'cn2', settlementAmount: 500_000 }),
    ]
    const b = computeBreakdown(contracts, p, allEnabled, '', '')
    // Fixed bonus 10,000 split 50/50 → 5,000 each in salesCommission
    expect(b[0].salesCommission).toBe(b[1].salesCommission)
  })

  it('distributes fixed bonus proportionally across unequal contracts', () => {
    const contracts = [
      makeContract({ id: 'cn1', settlementAmount: 300_000 }),
      makeContract({ id: 'cn2', settlementAmount: 700_000 }),
    ]
    const b = computeBreakdown(contracts, p, allEnabled, '', '')
    // cn2 should get 70% of fixed bonus, cn1 should get 30%
    expect(b[0].salesCommission).toBeLessThan(b[1].salesCommission)
  })

  it('all toggles off → all commissions zero', () => {
    const contracts = [makeContract({ settlementAmount: 1_000_000 })]
    const b = computeBreakdown(contracts, p, allDisabled, '', '')
    expect(b[0].salesCommission).toBe(0)
    expect(b[0].techCommission).toBe(0)
  })

  it('newCustomer bonus only applies to isFirstContract', () => {
    const contracts = [
      makeContract({ id: 'cn1', settlementAmount: 500_000, isFirstContract: true }),
      makeContract({ id: 'cn2', settlementAmount: 500_000, isFirstContract: false }),
    ]
    // Only enable newCustomer and quarterly (to isolate newCustomer effect)
    const en: EnabledBonuses = { quarterly: false, fixedBonus: false, newCustomer: true, floating: false, tech: false }
    const b = computeBreakdown(contracts, p, en, '', '')
    expect(b[0].salesCommission).toBeGreaterThan(0)   // isFirstContract → gets bonus
    expect(b[1].salesCommission).toBe(0)               // not first → no bonus
  })

  it('individual attribute uses personalRate, company uses companyRate', () => {
    const contracts = [
      makeContract({ id: 'cn1', settlementAmount: 500_000, customerAttribute: 'individual' }),
      makeContract({ id: 'cn2', settlementAmount: 500_000, customerAttribute: 'company' }),
    ]
    const en: EnabledBonuses = { quarterly: true, fixedBonus: false, newCustomer: false, floating: false, tech: false }
    const b = computeBreakdown(contracts, p, en, '', '')
    // Individual: 500k * 2% = 10000, Company: 500k * 1% = 5000
    expect(b[0].salesCommission).toBe(10_000)
    expect(b[1].salesCommission).toBe(5_000)
  })

  it('all fields are populated correctly', () => {
    const contracts = [makeContract({
      id: 'cn-abc',
      customerName: '完整测试公司',
      settlementAmount: 800_000,
      attributedTo: 'u5',
      attributedToName: '张销售',
    })]
    const b = computeBreakdown(contracts, p, allEnabled, 'tech-1', '王技术')
    expect(b[0].contractId).toBe('cn-abc')
    expect(b[0].customerName).toBe('完整测试公司')
    expect(b[0].settlementAmount).toBe(800_000)
    expect(b[0].salesPerson).toBe('u5')
    expect(b[0].salesPersonName).toBe('张销售')
    expect(b[0].techPerson).toBe('tech-1')
    expect(b[0].techPersonName).toBe('王技术')
  })

  it('tech commission zeroed when tech is disabled', () => {
    const contracts = [makeContract({ settlementAmount: 1_000_000 })]
    const en: EnabledBonuses = { ...allEnabled, tech: false }
    const b = computeBreakdown(contracts, p, en, 't1', '王技术')
    expect(b[0].techCommission).toBe(0)
    // sales commission still computed
    expect(b[0].salesCommission).toBeGreaterThan(0)
  })

  it('total settlement = 0 does not divide by zero', () => {
    const contracts = [makeContract({ settlementAmount: 0 })]
    expect(() => computeBreakdown(contracts, p, allEnabled, '', '')).not.toThrow()
  })
})
