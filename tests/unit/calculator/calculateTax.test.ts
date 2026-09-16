import { describe, expect, it } from 'vitest'
import { calculateTax, TAX_RATES } from '../../../src/lib/calculator'
import type { Location, RateBand } from '../../../src/types'

/**
 * Independent reference implementation of the personal-allowance taper +
 * banded income tax rules, built directly from the `TAX_RATES` constants
 * (never a duplicated literal rate/threshold). This keeps the bulk of this
 * suite immune to HMRC rate updates: bump a number in `constants.ts` and
 * every test below re-derives its expectation from the new value.
 *
 * A small number of GOLDEN VALUE cases further down assert literal £
 * amounts. Those are deliberately not derived — they exist to fail loudly
 * if a rate or threshold changes, and are labelled with the tax year they
 * assume.
 */
const expectedTax = (taxableIncome: number, bands: RateBand[]): number => {
  const working = bands.map((band) => ({ ...band }))
  if (taxableIncome > 100000) {
    const reduction = (taxableIncome - 100000) / 2
    working[0].limit = Math.max(0, working[0].limit - reduction)
  }
  let tax = 0
  let previousLimit = 0
  for (const band of working) {
    const bandTop = Math.max(previousLimit, band.limit)
    const taxableInBand = Math.max(0, Math.min(taxableIncome, bandTop) - previousLimit)
    tax += taxableInBand * band.rate
    previousLimit = bandTop
  }
  return tax
}

describe.each<Location>(['england', 'scotland'])('calculateTax — %s', (location) => {
  const bands = TAX_RATES[location]

  it('returns 0 for zero income', () => {
    expect(calculateTax(0, location)).toBe(0)
  })

  it('returns 0 for negative income', () => {
    expect(calculateTax(-500, location)).toBe(0)
  })

  it('returns 0 for £1 of income (within the personal allowance)', () => {
    expect(calculateTax(1, location)).toBe(0)
  })

  it('returns 0 exactly at the personal allowance ceiling', () => {
    const pa = bands[0]
    expect(calculateTax(pa.limit, location)).toBeCloseTo(expectedTax(pa.limit, bands), 6)
    expect(calculateTax(pa.limit, location)).toBe(0)
  })

  it('taxes £1 above the personal allowance at the next band rate', () => {
    const pa = bands[0]
    const income = pa.limit + 1
    expect(calculateTax(income, location)).toBeCloseTo(expectedTax(income, bands), 6)
  })

  it.each(
    // every internal band boundary: [index of the band whose ceiling this is]
    bands.slice(0, -1).map((_, i) => i),
  )("matches the derived reference exactly at band[%i]'s ceiling", (i) => {
    const income = bands[i].limit
    expect(calculateTax(income, location)).toBeCloseTo(expectedTax(income, bands), 6)
  })

  it.each(bands.slice(0, -1).map((_, i) => i))("matches the derived reference £1 below band[%i]'s ceiling", (i) => {
    const income = bands[i].limit - 1
    expect(calculateTax(income, location)).toBeCloseTo(expectedTax(income, bands), 6)
  })

  it.each(bands.slice(0, -1).map((_, i) => i))("matches the derived reference £1 above band[%i]'s ceiling", (i) => {
    const income = bands[i].limit + 1
    expect(calculateTax(income, location)).toBeCloseTo(expectedTax(income, bands), 6)
  })

  it('matches the derived reference for a modest salary (no taper)', () => {
    expect(calculateTax(45000, location)).toBeCloseTo(expectedTax(45000, bands), 6)
  })

  it('matches the derived reference exactly at the £100,000 taper start (no reduction yet)', () => {
    expect(calculateTax(100000, location)).toBeCloseTo(expectedTax(100000, bands), 6)
  })

  it('matches the derived reference £1 into the personal allowance taper', () => {
    expect(calculateTax(100001, location)).toBeCloseTo(expectedTax(100001, bands), 6)
    // the taper must actually have engaged, or this test would be vacuous
    expect(calculateTax(100001, location)).toBeGreaterThan(calculateTax(100000, location))
  })

  it('matches the derived reference at the exact income where the personal allowance is fully withdrawn (£125,140)', () => {
    const fullTaperIncome = 100000 + bands[0].limit * 2
    expect(calculateTax(fullTaperIncome, location)).toBeCloseTo(expectedTax(fullTaperIncome, bands), 6)
  })

  it('clamps the taper at 0 rather than going negative just past full withdrawal', () => {
    const justPastFullTaper = 100000 + bands[0].limit * 2 + 1
    expect(calculateTax(justPastFullTaper, location)).toBeCloseTo(expectedTax(justPastFullTaper, bands), 6)
  })

  it('matches the derived reference for a very high income (personal allowance fully gone, deep into the top band)', () => {
    expect(calculateTax(1000000, location)).toBeCloseTo(expectedTax(1000000, bands), 6)
  })

  it('applies the top band rate to income far above every finite threshold (regression: JSON clone must not turn Infinity into null)', () => {
    const topBand = bands[bands.length - 1]
    const secondToLastLimit = bands[bands.length - 2].limit
    const income = secondToLastLimit + 1000000
    const tax = calculateTax(income, location)
    // If the top band's Infinity limit were lost (e.g. via a JSON.stringify
    // round-trip), the top band would contribute £0 no matter how much
    // income falls inside it. Assert the top slice really is taxed.
    expect(tax).toBeGreaterThan(0)
    expect(tax).toBeCloseTo(expectedTax(income, bands), 6)
    // sanity: the last million pounds of income should be taxed at the top rate
    const taxOnSecondToLastLimit = calculateTax(secondToLastLimit, location)
    expect(tax - taxOnSecondToLastLimit).toBeCloseTo(1000000 * topBand.rate, 6)
  })

  it('does not mutate the shared TAX_RATES constant between calls', () => {
    const before = JSON.stringify(bands.map((b) => ({ ...b, limit: Number.isFinite(b.limit) ? b.limit : 'Infinity' })))
    calculateTax(150000, location)
    calculateTax(9999999, location)
    const after = JSON.stringify(bands.map((b) => ({ ...b, limit: Number.isFinite(b.limit) ? b.limit : 'Infinity' })))
    expect(after).toBe(before)
  })
})

describe('calculateTax — golden values (2026/27, England)', () => {
  // These assume the England constants as researched against gov.uk on
  // 2026-09-16 for the 2026/27 tax year: PA £12,570 / basic 20% to £50,270 /
  // higher 40% to £125,140 / additional 45% above. If constants.ts changes,
  // these should fail — that is the point. See README for sourcing.

  it('£80,000 taxable income → £19,432 tax', () => {
    expect(calculateTax(80000, 'england')).toBeCloseTo(19432, 6)
  })

  it('£30,000 taxable income → £3,486 tax', () => {
    // (£30,000 - £12,570) × 20%
    expect(calculateTax(30000, 'england')).toBeCloseTo(3486, 6)
  })

  it('£200,000 taxable income → £73,689 tax (personal allowance fully withdrawn)', () => {
    // £0–£50,270 @ 20% = £10,054; £50,270–£125,140 @ 40% = £29,948;
    // £125,140–£200,000 @ 45% = £33,687. Total £73,689.
    expect(calculateTax(200000, 'england')).toBeCloseTo(73689, 6)
  })
})
