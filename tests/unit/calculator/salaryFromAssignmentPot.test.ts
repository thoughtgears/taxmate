import { describe, expect, it } from 'vitest'
import { calculateNI, NI_RATES_EMPLOYER, salaryFromAssignmentPot } from '../../../src/lib/calculator'
import type { RateBand } from '../../../src/types'

/**
 * The defining property: the salary this returns, plus the employer's NI
 * actually due on that salary, must add back up to the pot it came out of.
 * Anything else means the umbrella is either short of money or sitting on
 * some — and getting it wrong in the obvious direction (applying the rate to
 * the whole pot) charges employer NI on the employer NI.
 */
describe('salaryFromAssignmentPot — round trip against calculateNI', () => {
  it.each([5000, 5001, 10000, 50000, 100000, 142800, 500000])('a £%i pot splits into a salary and the NI due on it', (pot) => {
    const salary = salaryFromAssignmentPot(pot, NI_RATES_EMPLOYER)
    expect(salary + calculateNI(salary, NI_RATES_EMPLOYER)).toBeCloseTo(pot, 6)
    expect(salary).toBeLessThanOrEqual(pot)
  })

  it('leaves a pot inside the secondary threshold untouched', () => {
    const pot = NI_RATES_EMPLOYER[0].limit
    expect(salaryFromAssignmentPot(pot, NI_RATES_EMPLOYER)).toBeCloseTo(pot, 6)
    expect(calculateNI(pot, NI_RATES_EMPLOYER)).toBe(0)
  })

  it('returns 0 for a nil or negative pot', () => {
    expect(salaryFromAssignmentPot(0, NI_RATES_EMPLOYER)).toBe(0)
    expect(salaryFromAssignmentPot(-1000, NI_RATES_EMPLOYER)).toBe(0)
  })

  it('is strictly increasing in the pot', () => {
    expect(salaryFromAssignmentPot(100001, NI_RATES_EMPLOYER)).toBeGreaterThan(salaryFromAssignmentPot(100000, NI_RATES_EMPLOYER))
  })
})

describe('salaryFromAssignmentPot — golden value (2026/27: £5,000 threshold, 15%)', () => {
  it('a £142,800 pot leaves £124,826.09 of salary and £17,973.91 of employer NI', () => {
    // salary = £5,000 + (£142,800 - £5,000) / 1.15 = £5,000 + £119,826.0870
    // Employer NI = (£124,826.0870 - £5,000) x 15% = £17,973.9130, and the
    // two add back to £142,800.
    const salary = salaryFromAssignmentPot(142800, NI_RATES_EMPLOYER)
    expect(salary).toBeCloseTo(124826.086957, 5)
    expect(142800 - salary).toBeCloseTo(17973.913043, 5)
  })

  it('is not the same as applying the rate to the whole pot', () => {
    // The naive version charges 15% of (£142,800 - £5,000) = £20,670 —
    // £2,696.09 too much, because it taxes the employer NI as if it were pay.
    const naive = (142800 - 5000) * 0.15
    const correct = 142800 - salaryFromAssignmentPot(142800, NI_RATES_EMPLOYER)
    expect(naive - correct).toBeCloseTo(2696.086957, 5)
  })
})

describe('salaryFromAssignmentPot — generic band handling (synthetic fixtures)', () => {
  it('passes the whole pot through when there are no bands at all', () => {
    expect(salaryFromAssignmentPot(50000, [])).toBeCloseTo(50000, 6)
  })

  it('passes pot above the last finite band through untaxed', () => {
    // A capped 50% band up to 1,000: the first 1,500 of pot buys 1,000 of
    // salary, and everything beyond that is untaxed and passes 1:1.
    const capped: RateBand[] = [{ band: 'Capped', limit: 1000, rate: 0.5 }]
    expect(salaryFromAssignmentPot(1500, capped)).toBeCloseTo(1000, 6)
    expect(salaryFromAssignmentPot(2500, capped)).toBeCloseTo(2000, 6)
  })

  it('splits a pot across several synthetic bands', () => {
    const synthetic: RateBand[] = [
      { band: 'Free', limit: 1000, rate: 0 },
      { band: 'Mid', limit: 2000, rate: 0.5 },
      { band: 'Top', limit: Infinity, rate: 1 },
    ]
    // £1,000 of pot buys £1,000 of salary; the next £1,500 buys £1,000 more;
    // beyond £2,500 of pot each £2 buys £1.
    expect(salaryFromAssignmentPot(1000, synthetic)).toBeCloseTo(1000, 6)
    expect(salaryFromAssignmentPot(2500, synthetic)).toBeCloseTo(2000, 6)
    expect(salaryFromAssignmentPot(4500, synthetic)).toBeCloseTo(3000, 6)
    expect(salaryFromAssignmentPot(4500, synthetic) + calculateNI(salaryFromAssignmentPot(4500, synthetic), synthetic)).toBeCloseTo(4500, 6)
  })
})
