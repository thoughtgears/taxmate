import { describe, expect, it } from 'vitest'
import { calculateStudentLoan, STUDENT_LOAN_RATES } from '../../../src/lib/calculator'
import type { StudentLoanPlan } from '../../../src/types'

const plans = Object.keys(STUDENT_LOAN_RATES) as StudentLoanPlan[]

describe('calculateStudentLoan', () => {
  it('returns 0 for plan "none" regardless of income', () => {
    expect(calculateStudentLoan(0, 'none')).toBe(0)
    expect(calculateStudentLoan(100000, 'none')).toBe(0)
  })

  it('returns 0 for an unrecognised plan value (defensive guard)', () => {
    // Bypasses the type system deliberately: the StudentLoanPlan union only
    // contains valid keys, but the function guards against an invalid
    // runtime value (e.g. corrupted persisted state) — exercise that path.
    expect(calculateStudentLoan(100000, 'invalid-plan' as StudentLoanPlan)).toBe(0)
  })

  describe.each(plans)('plan: %s', (plan) => {
    const { threshold, rate } = STUDENT_LOAN_RATES[plan]

    it('returns 0 for zero income', () => {
      expect(calculateStudentLoan(0, plan)).toBe(0)
    })

    it('returns 0 for negative income', () => {
      expect(calculateStudentLoan(-1000, plan)).toBe(0)
    })

    it('returns 0 exactly at the repayment threshold', () => {
      expect(calculateStudentLoan(threshold, plan)).toBe(0)
    })

    it('returns 0 for £1 below the repayment threshold', () => {
      expect(calculateStudentLoan(threshold - 1, plan)).toBe(0)
    })

    it('charges the plan rate on £1 above the repayment threshold', () => {
      expect(calculateStudentLoan(threshold + 1, plan)).toBeCloseTo(1 * rate, 6)
    })

    it('charges the plan rate on the full amount above the threshold for a high income', () => {
      const income = threshold + 100000
      expect(calculateStudentLoan(income, plan)).toBeCloseTo(100000 * rate, 6)
    })
  })
})
