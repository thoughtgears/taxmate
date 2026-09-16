import { describe, expect, it } from 'vitest'
import { calculateNI, NI_RATES_EMPLOYEE, NI_RATES_EMPLOYER } from '../../../src/lib/calculator'
import type { RateBand } from '../../../src/types'

/**
 * Independent reference implementation of the banded NI calculation, built
 * from whatever `RateBand[]` is passed in — never a duplicated literal rate
 * or threshold. Keeps expectations immune to constants.ts changes.
 */
const expectedNI = (income: number, rates: RateBand[]): number => {
  let ni = 0
  let previousLimit = 0
  for (const band of rates) {
    if (income <= previousLimit) break
    const taxableInBand = Math.max(0, Math.min(income, band.limit) - previousLimit)
    ni += taxableInBand * band.rate
    previousLimit = band.limit
  }
  return ni
}

describe('calculateNI — employee rates', () => {
  const rates = NI_RATES_EMPLOYEE

  it('returns 0 for zero income', () => {
    expect(calculateNI(0, rates)).toBe(0)
  })

  it('returns 0 for negative income', () => {
    expect(calculateNI(-1000, rates)).toBe(0)
  })

  it.each(rates.slice(0, -1).map((_, i) => i))("matches the derived reference exactly at band[%i]'s ceiling", (i) => {
    const income = rates[i].limit
    expect(calculateNI(income, rates)).toBeCloseTo(expectedNI(income, rates), 6)
  })

  it.each(rates.slice(0, -1).map((_, i) => i))("matches the derived reference £1 below band[%i]'s ceiling", (i) => {
    const income = rates[i].limit - 1
    expect(calculateNI(income, rates)).toBeCloseTo(expectedNI(income, rates), 6)
  })

  it.each(rates.slice(0, -1).map((_, i) => i))("matches the derived reference £1 above band[%i]'s ceiling", (i) => {
    const income = rates[i].limit + 1
    expect(calculateNI(income, rates)).toBeCloseTo(expectedNI(income, rates), 6)
  })

  it('matches the derived reference for a very high income (top, uncapped band)', () => {
    expect(calculateNI(2000000, rates)).toBeCloseTo(expectedNI(2000000, rates), 6)
    expect(calculateNI(2000000, rates)).toBeGreaterThan(0)
  })

  it('the 0%-rated LEL/Primary-Threshold split contributes nothing regardless of income', () => {
    // Both of the first two bands carry rate 0, so NI should be entirely
    // determined by the Primary Threshold, not the intermediate LEL split.
    const justBelowPT = rates[1].limit - 1
    expect(calculateNI(justBelowPT, rates)).toBe(0)
  })
})

describe('calculateNI — employer rates', () => {
  const rates = NI_RATES_EMPLOYER

  it('returns 0 for zero income', () => {
    expect(calculateNI(0, rates)).toBe(0)
  })

  it('returns 0 for negative income', () => {
    expect(calculateNI(-500, rates)).toBe(0)
  })

  it('returns 0 exactly at the secondary threshold', () => {
    expect(calculateNI(rates[0].limit, rates)).toBe(0)
  })

  it('matches the derived reference £1 above the secondary threshold', () => {
    const income = rates[0].limit + 1
    expect(calculateNI(income, rates)).toBeCloseTo(expectedNI(income, rates), 6)
  })

  it('matches the derived reference for a very high income', () => {
    expect(calculateNI(5000000, rates)).toBeCloseTo(expectedNI(5000000, rates), 6)
  })
})

describe('calculateNI — generic band handling (synthetic fixtures)', () => {
  it('applies a single flat-rate band across all income above 0', () => {
    const flat: RateBand[] = [{ band: 'Flat', limit: Infinity, rate: 0.1 }]
    expect(calculateNI(1000, flat)).toBeCloseTo(100, 6)
    expect(calculateNI(0, flat)).toBe(0)
  })

  it('splits income across multiple synthetic bands correctly', () => {
    const synthetic: RateBand[] = [
      { band: 'Free', limit: 1000, rate: 0 },
      { band: 'Mid', limit: 2000, rate: 0.5 },
      { band: 'Top', limit: Infinity, rate: 1 },
    ]
    // £0-1000 @0, £1000-2000 @50% = £500, £2000-3000 @100% = £1000
    expect(calculateNI(3000, synthetic)).toBeCloseTo(1500, 6)
  })

  it('handles an empty rates array by returning 0', () => {
    expect(calculateNI(50000, [])).toBe(0)
  })
})
