import { describe, expect, it } from 'vitest'
import {
  calculateCorporationTax,
  CORPORATION_TAX_MARGINAL_RELIEF_FRACTION,
  CORPORATION_TAX_RATE,
  CORPORATION_TAX_RATE_HIGH,
  CORPORATION_TAX_THRESHOLD,
  CORPORATION_TAX_THRESHOLD_HIGH,
} from '../../../src/lib/calculator'

describe('calculateCorporationTax — derived cases', () => {
  it('charges nothing on nil or negative profit', () => {
    expect(calculateCorporationTax(0)).toBe(0)
    expect(calculateCorporationTax(-25000)).toBe(0)
  })

  it('charges the small profits rate up to and including the lower limit', () => {
    expect(calculateCorporationTax(1)).toBeCloseTo(CORPORATION_TAX_RATE, 6)
    expect(calculateCorporationTax(CORPORATION_TAX_THRESHOLD)).toBeCloseTo(CORPORATION_TAX_THRESHOLD * CORPORATION_TAX_RATE, 6)
  })

  it('charges the unrelieved main rate at and above the upper limit', () => {
    expect(calculateCorporationTax(CORPORATION_TAX_THRESHOLD_HIGH)).toBeCloseTo(CORPORATION_TAX_THRESHOLD_HIGH * CORPORATION_TAX_RATE_HIGH, 6)
    expect(calculateCorporationTax(1000000)).toBeCloseTo(1000000 * CORPORATION_TAX_RATE_HIGH, 6)
  })

  it('applies marginal relief between the two limits', () => {
    const profit = 150000
    const expected = profit * CORPORATION_TAX_RATE_HIGH - (CORPORATION_TAX_THRESHOLD_HIGH - profit) * CORPORATION_TAX_MARGINAL_RELIEF_FRACTION
    expect(calculateCorporationTax(profit)).toBeCloseTo(expected, 6)
  })

  it('is continuous at the lower limit — no cliff edge in the bill', () => {
    const atLimit = calculateCorporationTax(CORPORATION_TAX_THRESHOLD)
    const justOver = calculateCorporationTax(CORPORATION_TAX_THRESHOLD + 1)
    expect(justOver - atLimit).toBeGreaterThan(0)
    expect(justOver - atLimit).toBeLessThan(1)
  })

  it('meets the unrelieved main rate at the upper limit without a jump', () => {
    // Relief runs out exactly at the upper limit, so the last pound below it
    // still carries the marginal-relief rate and the next one the main rate.
    const justUnder = calculateCorporationTax(CORPORATION_TAX_THRESHOLD_HIGH - 1)
    const atLimit = calculateCorporationTax(CORPORATION_TAX_THRESHOLD_HIGH)
    const justOver = calculateCorporationTax(CORPORATION_TAX_THRESHOLD_HIGH + 1)
    expect(atLimit - justUnder).toBeCloseTo(CORPORATION_TAX_RATE_HIGH + CORPORATION_TAX_MARGINAL_RELIEF_FRACTION, 6)
    expect(justOver - atLimit).toBeCloseTo(CORPORATION_TAX_RATE_HIGH, 6)
  })

  it('never charges more than the main rate on any profit', () => {
    for (const profit of [10000, 50000, 75000, 125000, 200000, 250000, 400000]) {
      expect(calculateCorporationTax(profit)).toBeLessThanOrEqual(profit * CORPORATION_TAX_RATE_HIGH + 1e-9)
    }
  })
})

describe('calculateCorporationTax — golden values (FY2026: 19% / 25%, £50k / £250k, 3/200)', () => {
  it('£50,000 profit → £9,500', () => {
    // £50,000 x 19%.
    expect(calculateCorporationTax(50000)).toBeCloseTo(9500, 6)
  })

  it('£100,000 profit → £22,750', () => {
    // £100,000 x 25% = £25,000, less marginal relief
    // (£250,000 - £100,000) x 3/200 = £2,250. Total £22,750.
    expect(calculateCorporationTax(100000)).toBeCloseTo(22750, 6)
  })

  it('£250,000 profit → £62,500', () => {
    // £250,000 x 25%; marginal relief has run out entirely.
    expect(calculateCorporationTax(250000)).toBeCloseTo(62500, 6)
  })

  it('charges 26.5% on the marginal pound inside the relief band', () => {
    // The well-known effective marginal rate between £50,000 and £250,000:
    // 25% on the pound plus 3/200 (1.5%) of relief lost on it.
    const marginal = calculateCorporationTax(100001) - calculateCorporationTax(100000)
    expect(marginal).toBeCloseTo(0.265, 6)
  })
})
