import type { Location, RateBand, StudentLoanInfo } from '../../types'

// ---------------------------------------------------------------------------
// Rate/threshold review (2026-09-16), checked against gov.uk / mygov.scot for
// the 2026/27 tax year (6 April 2026 - 5 April 2027). Values are NOT changed
// here without the maintainer's say-so — this is a report, not a fix.
//
// MATCHES 2026/27:
//   - England income tax bands (all four)
//   - NI_RATES_EMPLOYEE: Primary Threshold (12570), Upper Earnings Limit
//     (50270, 8%/2%)
//   - STUDENT_LOAN_RATES: plan5 (25000), postgraduate (21000)
//   - Corporation Tax: rate, rate_high, both thresholds
//   - Dividend allowance (500) and additional rate (39.35%)
//
// STALE / WRONG for 2026/27 - flagged for the maintainer, not changed:
//   - Scotland bands: starter threshold should be 16537 (is 14732), basic
//     threshold should be 29526 (is 25688), Higher Rate's upper limit should
//     be 75000 not 125140, an entire "Advanced Rate" band (45%, 75001-125140)
//     is missing, and Top Rate should be 48% not 47%.
//     Source: https://www.mygov.scot/scottish-income-tax/current-income-tax-rates
//   - NI_RATES_EMPLOYEE LEL should be 6708 (is 6396) - note this has zero
//     effect on calculateNI's output today, since both the LEL and Primary
//     Threshold bands carry a 0% rate.
//   - NI_RATES_EMPLOYER: Secondary Threshold should be 5000 (is 9100) and the
//     rate should be 15% (is 13.8%) - this one does change calculated
//     employer NI (inside-IR35 umbrella calculation).
//     Source: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027
//   - STUDENT_LOAN_RATES: plan1 should be 26900 (is 24990), plan2 should be
//     29385 (is 27295), plan4 should be 33795 (is 31395).
//     Source: https://www.gov.uk/repaying-your-student-loan/what-you-pay
//   - DIVIDEND_TAX_RATES: basic should be 10.75% (is 8.75%), higher should be
//     35.75% (is 33.75%) - both rose 2pp from 6 April 2026. Additional
//     (39.35%) is unchanged and already correct.
//     Source: https://www.gov.uk/tax-on-dividends
// ---------------------------------------------------------------------------

export const TAX_RATES: Record<Location, RateBand[]> = {
  england: [
    { band: 'Personal Allowance', limit: 12570, rate: 0 },
    { band: 'Basic Rate', limit: 50270, rate: 0.2 },
    { band: 'Higher Rate', limit: 125140, rate: 0.4 },
    { band: 'Additional Rate', limit: Infinity, rate: 0.45 },
  ],
  scotland: [
    { band: 'Personal Allowance', limit: 12570, rate: 0 },
    { band: 'Starter Rate', limit: 14732, rate: 0.19 },
    { band: 'Basic Rate', limit: 25688, rate: 0.2 },
    { band: 'Intermediate Rate', limit: 43662, rate: 0.21 },
    { band: 'Higher Rate', limit: 125140, rate: 0.42 },
    { band: 'Top Rate', limit: Infinity, rate: 0.47 },
  ],
}

export const NI_RATES_EMPLOYEE: RateBand[] = [
  { band: 'LEL', limit: 6396, rate: 0 },
  { band: 'Primary Threshold', limit: 12570, rate: 0 },
  { band: 'Upper Earnings Limit', limit: 50270, rate: 0.08 },
  { band: 'Above UEL', limit: Infinity, rate: 0.02 },
]

export const NI_RATES_EMPLOYER: RateBand[] = [
  { band: 'Secondary Threshold', limit: 9100, rate: 0 },
  { band: 'UEL', limit: Infinity, rate: 0.138 },
]

export const STUDENT_LOAN_RATES: Record<string, StudentLoanInfo> = {
  plan1: { threshold: 24990, rate: 0.09 },
  plan2: { threshold: 27295, rate: 0.09 },
  plan4: { threshold: 31395, rate: 0.09 },
  plan5: { threshold: 25000, rate: 0.09 },
  postgraduate: { threshold: 21000, rate: 0.06 },
}

export const CORPORATION_TAX_RATE: number = 0.19
export const CORPORATION_TAX_RATE_HIGH: number = 0.25
export const CORPORATION_TAX_THRESHOLD: number = 50000
export const CORPORATION_TAX_THRESHOLD_HIGH: number = 250000
export const DIVIDEND_ALLOWANCE: number = 500
export const DIVIDEND_TAX_RATES: Record<string, number> = {
  basic: 0.0875,
  higher: 0.3375,
  additional: 0.3935,
}
