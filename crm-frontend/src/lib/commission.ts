import type { Contract } from '@/types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CommissionParams {
  personalRate: number
  companyRate: number
  fixedTier1Min: number
  fixedTier1Max: number
  fixedBonus1: number
  fixedTier2Min: number
  fixedTier2Max: number
  fixedBonus2: number
  fixedTier3Min: number
  fixedBonus3: number
  newCustomerRate: number
  floatTier1Min: number
  floatTier1Max: number
  floatRate1: number
  floatTier2Min: number
  floatTier2Max: number
  floatRate2: number
  floatTier3Min: number
  floatRate3: number
  techRate: number
}

export interface EnabledBonuses {
  quarterly: boolean
  fixedBonus: boolean
  newCustomer: boolean
  floating: boolean
  tech: boolean
}

export interface CommissionBreakdown {
  contractId: string
  customerName: string
  settlementAmount: number
  salesPerson: string
  salesPersonName: string
  salesCommission: number
  techPerson: string
  techPersonName: string
  techCommission: number
}

export const DEFAULT_COMMISSION_PARAMS: CommissionParams = {
  personalRate: 0.02,
  companyRate: 0.01,
  fixedTier1Min: 600_000,
  fixedTier1Max: 1_200_000,
  fixedBonus1: 10_000,
  fixedTier2Min: 1_200_000,
  fixedTier2Max: 2_000_000,
  fixedBonus2: 15_000,
  fixedTier3Min: 2_000_000,
  fixedBonus3: 20_000,
  newCustomerRate: 0.03,
  floatTier1Min: 600_000,
  floatTier1Max: 1_200_000,
  floatRate1: 0.01,
  floatTier2Min: 1_200_000,
  floatTier2Max: 2_000_000,
  floatRate2: 0.02,
  floatTier3Min: 2_000_000,
  floatRate3: 0.04,
  techRate: 0.02,
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function fmtWan(n: number) {
  return `¥${(n / 10000).toFixed(1)}万`
}

export function fmtYuan(n: number) {
  return `¥${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

/* ------------------------------------------------------------------ */
/*  Pure computation functions                                         */
/* ------------------------------------------------------------------ */

/** Compute quarterly commission split by customer attribute */
export function computeQuarterlyCommissions(
  contracts: Contract[],
  params: CommissionParams,
) {
  const personalAmount = contracts
    .filter(c => c.customerAttribute === 'individual')
    .reduce((s, c) => s + c.settlementAmount, 0)
  const companyAmount = contracts
    .filter(c => c.customerAttribute === 'company')
    .reduce((s, c) => s + c.settlementAmount, 0)

  const quarterlyPersonal = personalAmount * params.personalRate
  const quarterlyCompany = companyAmount * params.companyRate
  const quarterlyTotal = quarterlyPersonal + quarterlyCompany

  return { personalAmount, companyAmount, quarterlyPersonal, quarterlyCompany, quarterlyTotal }
}

/** Compute fixed bonus based on total settlement tier */
export function computeFixedBonus(
  totalSettlement: number,
  params: CommissionParams,
) {
  let bonus = 0
  let tierLabel = ''

  if (totalSettlement > params.fixedTier3Min) {
    bonus = params.fixedBonus3
    tierLabel = `Tier 3 · 业绩＞${fmtWan(params.fixedTier3Min)}`
  } else if (totalSettlement > params.fixedTier2Min) {
    bonus = params.fixedBonus2
    tierLabel = `Tier 2 · ${fmtWan(params.fixedTier2Min)}＜业绩≤${fmtWan(params.fixedTier2Max)}`
  } else if (totalSettlement > params.fixedTier1Min) {
    bonus = params.fixedBonus1
    tierLabel = `Tier 1 · ${fmtWan(params.fixedTier1Min)}＜业绩≤${fmtWan(params.fixedTier1Max)}`
  } else {
    tierLabel = '未达最低档'
  }

  return { bonus, tierLabel }
}

/** Compute new customer bonus from first-contract amounts */
export function computeNewCustomerBonus(
  contracts: Contract[],
  params: CommissionParams,
) {
  const newCustomerTotal = contracts
    .filter(c => c.isFirstContract)
    .reduce((s, c) => s + c.settlementAmount, 0)

  const bonus = newCustomerTotal * params.newCustomerRate

  return { newCustomerTotal, bonus }
}

/** Compute floating bonus tier and amount */
export function computeFloatingBonus(
  totalSettlement: number,
  params: CommissionParams,
) {
  let rate = 0
  let tierLabel = ''

  if (totalSettlement > params.floatTier3Min) {
    rate = params.floatRate3
    tierLabel = `Tier 3 · 业绩＞${fmtWan(params.floatTier3Min)}`
  } else if (totalSettlement > params.floatTier2Min) {
    rate = params.floatRate2
    tierLabel = `Tier 2 · ${fmtWan(params.floatTier2Min)}＜业绩≤${fmtWan(params.floatTier2Max)}`
  } else if (totalSettlement > params.floatTier1Min) {
    rate = params.floatRate1
    tierLabel = `Tier 1 · ${fmtWan(params.floatTier1Min)}＜业绩≤${fmtWan(params.floatTier1Max)}`
  } else {
    tierLabel = '未达最低档'
  }

  const bonus = totalSettlement * rate

  return { rate, bonus, tierLabel }
}

/** Compute tech commission */
export function computeTechCommission(totalSettlement: number, rate: number): number {
  return totalSettlement * rate
}

/** Sum all enabled sales bonuses */
export function computeSalesTotal(
  quarterlyTotal: number,
  fixedBonus: number,
  newCustomerBonus: number,
  floatingBonus: number,
  enabled: EnabledBonuses,
): number {
  return (
    (enabled.quarterly ? quarterlyTotal : 0) +
    (enabled.fixedBonus ? fixedBonus : 0) +
    (enabled.newCustomer ? newCustomerBonus : 0) +
    (enabled.floating ? floatingBonus : 0)
  )
}

/** Per-contract breakdown with proportional distribution of aggregate bonuses */
export function computeBreakdown(
  contracts: Contract[],
  params: CommissionParams,
  enabled: EnabledBonuses,
  techPersonId: string,
  techPersonName: string,
): CommissionBreakdown[] {
  const total = contracts.reduce((sum, c) => sum + c.settlementAmount, 0)
  const { quarterlyTotal: qt, quarterlyPersonal: qp, quarterlyCompany: qc } =
    computeQuarterlyCommissions(contracts, params)
  const fixed = enabled.fixedBonus ? computeFixedBonus(total, params).bonus : 0
  const floating = enabled.floating ? computeFloatingBonus(total, params).bonus : 0
  const nc = computeNewCustomerBonus(contracts, params)

  return contracts.map(c => {
    const share = total > 0 ? c.settlementAmount / total : 0

    // Quarterly: per-contract based on attribute
    const qRate = c.customerAttribute === 'individual' ? params.personalRate : params.companyRate
    const qPart = c.settlementAmount * qRate * (enabled.quarterly ? 1 : 0)

    // New customer
    const ncPart = (c.isFirstContract && enabled.newCustomer) ? c.settlementAmount * params.newCustomerRate : 0

    // Fixed proportionally
    const fPart = share * fixed

    // Floating proportionally
    const flPart = share * floating

    // Tech
    const tPart = enabled.tech ? c.settlementAmount * params.techRate : 0

    return {
      contractId: c.id,
      customerName: c.customerName,
      settlementAmount: c.settlementAmount,
      salesPerson: c.attributedTo,
      salesPersonName: c.attributedToName,
      salesCommission: Math.round(qPart + ncPart + fPart + flPart),
      techPerson: techPersonId,
      techPersonName: techPersonName || '未选择',
      techCommission: Math.round(tPart),
    }
  })
}
