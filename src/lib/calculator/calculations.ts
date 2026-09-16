import type { Location, RateBand, StudentLoanPlan } from '../../types'
import {
  CORPORATION_TAX_MARGINAL_RELIEF_FRACTION,
  CORPORATION_TAX_RATE,
  CORPORATION_TAX_RATE_HIGH,
  CORPORATION_TAX_THRESHOLD,
  CORPORATION_TAX_THRESHOLD_HIGH,
  DIVIDEND_ALLOWANCE,
  DIVIDEND_TAX_RATES,
  PERSONAL_ALLOWANCE,
  PERSONAL_ALLOWANCE_TAPER_RATE,
  PERSONAL_ALLOWANCE_TAPER_THRESHOLD,
  STUDENT_LOAN_RATES,
  TAX_RATES,
} from './constants'

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

/**
 * Income tax on non-savings, non-dividend income — salary, in this app — at
 * `location`'s rates.
 *
 * `totalIncome` is what the personal allowance taper is measured against, and
 * defaults to `income`. Pass the whole picture when there is other income
 * that also erodes the allowance: a director on a £12,570 salary topped up
 * with dividends loses allowance against the combined figure, which makes
 * part of that salary taxable.
 */
export const calculateTax = (income: number, location: Location, totalIncome: number = income): number => {
  // Read the bands directly, never through a clone. A JSON round-trip has no
  // representation for Infinity and silently turns the top band's limit into
  // null, which stops high earners being taxed on the excess at all (see
  // calculateTax.test.ts).
  const bands = TAX_RATES[location]
  let remaining = Math.max(0, income - personalAllowance(totalIncome))
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

/**
 * Corporation Tax on a company's taxable profit, with Marginal Relief between
 * the lower and upper limits.
 *
 * HMRC's formula is F x (U - A) x (N / A), where F is the standard fraction,
 * U the upper limit, A augmented profits and N taxable total profits. This
 * models a single company with no associated companies and no franked
 * investment income, so N equals A and the ratio drops out.
 */
export const calculateCorporationTax = (profit: number): number => {
  if (profit <= 0) return 0
  if (profit <= CORPORATION_TAX_THRESHOLD) return profit * CORPORATION_TAX_RATE

  const mainRateCharge = profit * CORPORATION_TAX_RATE_HIGH
  if (profit >= CORPORATION_TAX_THRESHOLD_HIGH) return mainRateCharge
  return mainRateCharge - (CORPORATION_TAX_THRESHOLD_HIGH - profit) * CORPORATION_TAX_MARGINAL_RELIEF_FRACTION
}

/**
 * The bands dividends are taxed in, expressed as taxable-income ceilings.
 *
 * Dividends are ALWAYS taxed at the UK-wide rates against the UK-wide band
 * limits, even for a Scottish taxpayer: the Scottish rates and thresholds
 * apply only to non-savings, non-dividend income. Using Scotland's own
 * thresholds here would tip Scottish dividends into the higher rate at
 * £29,526 instead of £50,270.
 */
const dividendBands = (): RateBand[] => {
  const uk = TAX_RATES.england
  return [
    { band: 'Dividend Basic Rate', limit: taxableLimit(uk, 1), rate: DIVIDEND_TAX_RATES.basic },
    { band: 'Dividend Higher Rate', limit: taxableLimit(uk, uk.length - 2), rate: DIVIDEND_TAX_RATES.higher },
    { band: 'Dividend Additional Rate', limit: Infinity, rate: DIVIDEND_TAX_RATES.additional },
  ]
}

/**
 * Tax on dividend income sitting on top of `otherIncome`.
 *
 * Dividends are the top slice of income, so where they fall depends on how
 * much of the bands the rest of the income has already used. The personal
 * allowance is set against non-dividend income first and any remainder covers
 * the first slice of dividends; the taper is measured against the combined
 * total.
 *
 * The dividend allowance is a nil-RATE band, not a deduction: the first £500
 * is taxed at 0% but still uses up room in whichever band it falls in, so it
 * pushes the dividends above it further up rather than being subtracted.
 */
export const calculateDividendTax = (dividends: number, otherIncome: number): number => {
  const dividendIncome = Math.max(0, dividends)
  const other = Math.max(0, otherIncome)
  const allowance = personalAllowance(other + dividendIncome)

  const otherTaxable = Math.max(0, other - allowance)
  let remaining = Math.max(0, dividendIncome - Math.max(0, allowance - other))
  let nilRateRemaining = Math.min(DIVIDEND_ALLOWANCE, remaining)

  let tax = 0
  let position = otherTaxable
  for (const band of dividendBands()) {
    if (remaining <= 0) break
    const headroom = band.limit - position
    if (headroom <= 0) continue

    const inBand = Math.min(remaining, headroom)
    const nilRated = Math.min(nilRateRemaining, inBand)
    tax += (inBand - nilRated) * band.rate
    nilRateRemaining -= nilRated
    remaining -= inBand
    position += inBand
  }

  return tax
}

export const calculateStudentLoan = (income: number, plan: StudentLoanPlan): number => {
  if (plan === 'none' || !STUDENT_LOAN_RATES[plan]) return 0
  const { threshold, rate } = STUDENT_LOAN_RATES[plan]
  return income > threshold ? (income - threshold) * rate : 0
}
