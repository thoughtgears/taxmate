import type { Location, RateBand, StudentLoanInfo } from '../../types'

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
