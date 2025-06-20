import type { Location, RateBand, StudentLoanPlan } from '../../types'
import { STUDENT_LOAN_RATES, TAX_RATES } from './constants'

export const calculateTax = (taxableIncome: number, location: Location): number => {
  const taxRates: RateBand[] = JSON.parse(JSON.stringify(TAX_RATES[location]))
  let tax: number = 0

  if (taxableIncome > 100000) {
    const reduction = (taxableIncome - 100000) / 2
    taxRates[0].limit = Math.max(0, taxRates[0].limit - reduction)
  }

  let remainingIncome = taxableIncome
  for (let i = 0; i < taxRates.length; i++) {
    const previousBandLimit = i === 0 ? 0 : taxRates[i - 1].limit
    const taxableInBand = Math.max(0, Math.min(remainingIncome, taxRates[i].limit - previousBandLimit))

    if (taxableInBand > 0) {
      tax += taxableInBand * taxRates[i].rate
      remainingIncome -= taxableInBand
    }
    if (remainingIncome <= 0) break
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
