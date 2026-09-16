import type { Location, RateBand, StudentLoanInfo } from '../../types'

// ---------------------------------------------------------------------------
// UK tax constants — figures current as of 2026-09-16, for the 2026/27 tax
// year (6 April 2026 to 5 April 2027) and, for Corporation Tax, the financial
// year beginning 1 April 2026.
//
// Every value below was checked against its primary source on 2026-09-16:
//
//   Income tax bands, personal allowance and its taper
//     https://www.gov.uk/income-tax-rates
//   Scottish income tax bands
//     https://www.mygov.scot/scottish-income-tax/current-income-tax-rates
//   National Insurance thresholds and rates (employee and employer)
//     https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
//   Dividend rates and the dividend allowance
//     https://www.gov.uk/tax-on-dividends
//   Student loan repayment thresholds and rates
//     https://www.gov.uk/repaying-your-student-loan/what-you-pay
//   Corporation Tax rates, limits and the marginal relief standard fraction
//     https://www.gov.uk/corporation-tax-rates
//     https://www.gov.uk/government/publications/rates-and-allowances-corporation-tax/rates-and-allowances-corporation-tax
//
// HOW TO READ A BAND `limit`
// Each `limit` is a cumulative INCOME ceiling, written exactly as gov.uk and
// mygov.scot publish it — that is, on the assumption of a full personal
// allowance. The additional/top-rate threshold (£125,140) is the one
// exception: it is published at a NIL personal allowance, because it is the
// income at which the taper finishes. `calculateTax` reconciles the two
// conventions into the statutory taxable-income limits; see `taxableLimit`.
// ---------------------------------------------------------------------------

/** UK-wide personal allowance. Frozen at £12,570 for 2026/27. */
export const PERSONAL_ALLOWANCE: number = 12570

/** Income above which the personal allowance starts to be withdrawn. */
export const PERSONAL_ALLOWANCE_TAPER_THRESHOLD: number = 100000

/** £1 of personal allowance is withdrawn for every £2 of income above the threshold. */
export const PERSONAL_ALLOWANCE_TAPER_RATE: number = 2

export const TAX_RATES: Record<Location, RateBand[]> = {
  england: [
    { band: 'Personal Allowance', limit: PERSONAL_ALLOWANCE, rate: 0 },
    { band: 'Basic Rate', limit: 50270, rate: 0.2 },
    { band: 'Higher Rate', limit: 125140, rate: 0.4 },
    { band: 'Additional Rate', limit: Infinity, rate: 0.45 },
  ],
  scotland: [
    { band: 'Personal Allowance', limit: PERSONAL_ALLOWANCE, rate: 0 },
    { band: 'Starter Rate', limit: 16537, rate: 0.19 },
    { band: 'Basic Rate', limit: 29526, rate: 0.2 },
    { band: 'Intermediate Rate', limit: 43662, rate: 0.21 },
    { band: 'Higher Rate', limit: 75000, rate: 0.42 },
    { band: 'Advanced Rate', limit: 125140, rate: 0.45 },
    { band: 'Top Rate', limit: Infinity, rate: 0.48 },
  ],
}

export const NI_RATES_EMPLOYEE: RateBand[] = [
  { band: 'LEL', limit: 6708, rate: 0 },
  { band: 'Primary Threshold', limit: PERSONAL_ALLOWANCE, rate: 0 },
  { band: 'Upper Earnings Limit', limit: 50270, rate: 0.08 },
  { band: 'Above UEL', limit: Infinity, rate: 0.02 },
]

export const NI_RATES_EMPLOYER: RateBand[] = [
  { band: 'Secondary Threshold', limit: 5000, rate: 0 },
  { band: 'Above Secondary Threshold', limit: Infinity, rate: 0.15 },
]

export const STUDENT_LOAN_RATES: Record<string, StudentLoanInfo> = {
  plan1: { threshold: 26900, rate: 0.09 },
  plan2: { threshold: 29385, rate: 0.09 },
  plan4: { threshold: 33795, rate: 0.09 },
  plan5: { threshold: 25000, rate: 0.09 },
  postgraduate: { threshold: 21000, rate: 0.06 },
}

export const CORPORATION_TAX_RATE: number = 0.19
export const CORPORATION_TAX_RATE_HIGH: number = 0.25
export const CORPORATION_TAX_THRESHOLD: number = 50000
export const CORPORATION_TAX_THRESHOLD_HIGH: number = 250000

/** Marginal relief standard fraction, 3/200 for financial years 2023 onwards. */
export const CORPORATION_TAX_MARGINAL_RELIEF_FRACTION: number = 3 / 200

export const DIVIDEND_ALLOWANCE: number = 500

// Basic and higher dividend rates each rose by 2 percentage points from
// 6 April 2026 (Autumn Budget 2025); the additional rate was left unchanged.
export const DIVIDEND_TAX_RATES: Record<string, number> = {
  basic: 0.1075,
  higher: 0.3575,
  additional: 0.3935,
}
