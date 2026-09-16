import type { Location, RateBand, StudentLoanPlan } from '../../types'
import { PERSONAL_ALLOWANCE, PERSONAL_ALLOWANCE_TAPER_RATE, PERSONAL_ALLOWANCE_TAPER_THRESHOLD, STUDENT_LOAN_RATES, TAX_RATES } from './constants'

/**
 * The personal allowance actually available at a given total income: £1 of
 * allowance is withdrawn for every £2 of income above £100,000, so the
 * allowance is nil from £125,140 upwards.
 */
export const personalAllowance = (totalIncome: number): number => {
  const excess = Math.max(0, totalIncome - PERSONAL_ALLOWANCE_TAPER_THRESHOLD)
  return Math.max(0, PERSONAL_ALLOWANCE - excess / PERSONAL_ALLOWANCE_TAPER_RATE)
}

/**
 * The statutory TAXABLE-income ceiling of band `i` — income after the
 * personal allowance, which is what the rates are legally applied to.
 *
 * gov.uk and mygov.scot publish band ceilings as total income assuming a full
 * personal allowance (£50,270 = £12,570 allowance + the £37,700 basic rate
 * band), so subtracting the standard allowance recovers the statutory limit.
 * The additional/top-rate threshold — the second-from-last band ceiling,
 * £125,140 — is the exception: it is published at a NIL allowance, because it
 * is the income at which the taper finishes, so it is already a
 * taxable-income figure and must not have the allowance subtracted from it.
 *
 * Getting this wrong is not cosmetic. If the published ceilings are treated
 * as fixed points of total income, a tapered allowance silently WIDENS the
 * basic rate band, and the well-documented 60% effective marginal rate
 * between £100,000 and £125,140 comes out as 50%.
 *
 * The open-ended top band keeps its Infinity (Infinity minus the allowance is
 * still Infinity), and band 0 collapses to 0 — the allowance has no width in
 * taxable-income space, which is the point.
 */
const taxableLimit = (bands: RateBand[], i: number): number => (i === bands.length - 2 ? bands[i].limit : bands[i].limit - bands[0].limit)

export const calculateTax = (income: number, location: Location): number => {
  // Read the bands directly, never through a clone. A JSON round-trip has no
  // representation for Infinity and silently turns the top band's limit into
  // null, which stops high earners being taxed on the excess at all (see
  // calculateTax.test.ts).
  const bands = TAX_RATES[location]
  let remaining = Math.max(0, income - personalAllowance(income))
  let tax = 0
  let previousLimit = 0

  for (let i = 1; i < bands.length; i++) {
    if (remaining <= 0) break
    const limit = taxableLimit(bands, i)
    const taxableInBand = Math.min(remaining, limit - previousLimit)
    tax += taxableInBand * bands[i].rate
    remaining -= taxableInBand
    previousLimit = limit
  }

  return tax
}

export const calculateNI = (income: number, rates: RateBand[]): number => {
  let totalNI: number = 0
  let incomeRemaining = income
  for (let i = 0; i < rates.length; i++) {
    const previousLimit = i > 0 ? rates[i - 1].limit : 0
    if (income > previousLimit) {
      const taxableInBand = Math.min(incomeRemaining, rates[i].limit - previousLimit)
      totalNI += taxableInBand * rates[i].rate
      incomeRemaining -= taxableInBand
    }
    if (incomeRemaining <= 0) break
  }
  return totalNI
}

export const calculateStudentLoan = (income: number, plan: StudentLoanPlan): number => {
  if (plan === 'none' || !STUDENT_LOAN_RATES[plan]) return 0
  const { threshold, rate } = STUDENT_LOAN_RATES[plan]
  return income > threshold ? (income - threshold) * rate : 0
}
