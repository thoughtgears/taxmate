import { describe, expect, it } from 'vitest'
import {
  CORPORATION_TAX_RATE,
  CORPORATION_TAX_RATE_HIGH,
  CORPORATION_TAX_THRESHOLD,
  CORPORATION_TAX_THRESHOLD_HIGH,
  DIVIDEND_ALLOWANCE,
  DIVIDEND_TAX_RATES,
  NI_RATES_EMPLOYEE,
  NI_RATES_EMPLOYER,
  STUDENT_LOAN_RATES,
  TAX_RATES,
} from '../../../src/lib/calculator'
import type { Location, RateBand } from '../../../src/types'

/**
 * These are structural-integrity checks on bundled tax-rate data, per the
 * org's TDD rule (verify shape, not literal values — the values themselves
 * are HMRC's call, reviewed separately and reported to the owner). They
 * exist to catch a malformed edit to constants.ts (bands out of order, a
 * missing top band, a rate outside 0-1), not to assert what the rates are.
 */

const assertWellFormedBands = (bands: RateBand[], { ratesAscend = false }: { ratesAscend?: boolean } = {}) => {
  expect(bands.length).toBeGreaterThan(0)

  // Every rate is a plausible marginal rate.
  for (const band of bands) {
    expect(band.rate).toBeGreaterThanOrEqual(0)
    expect(band.rate).toBeLessThan(1)
  }

  // Limits are strictly ascending (each band starts where the previous one
  // ended). Rates only rise band-to-band for progressive income tax —
  // employee NI legitimately drops from 8% to 2% above the Upper Earnings
  // Limit, so that check is opt-in.
  for (let i = 1; i < bands.length; i++) {
    expect(bands[i].limit).toBeGreaterThan(bands[i - 1].limit)
    if (ratesAscend) {
      expect(bands[i].rate).toBeGreaterThanOrEqual(bands[i - 1].rate)
    }
  }

  // The top band must be open-ended, or high earners silently stop being
  // taxed on the excess (see calculateTax's Infinity-preservation test).
  expect(bands[bands.length - 1].limit).toBe(Infinity)
}

describe('TAX_RATES', () => {
  it.each<Location>(['england', 'scotland'])('%s bands are well-formed', (location) => {
    assertWellFormedBands(TAX_RATES[location], { ratesAscend: true })
  })

  it.each<Location>(['england', 'scotland'])('%s starts with a 0%% personal allowance band', (location) => {
    expect(TAX_RATES[location][0].rate).toBe(0)
  })
})

describe('NI_RATES_EMPLOYEE', () => {
  it('is well-formed', () => {
    assertWellFormedBands(NI_RATES_EMPLOYEE)
  })
})

describe('NI_RATES_EMPLOYER', () => {
  it('is well-formed', () => {
    assertWellFormedBands(NI_RATES_EMPLOYER)
  })
})

describe('STUDENT_LOAN_RATES', () => {
  it('has a positive threshold and a repayment rate in (0, 1) for every plan', () => {
    for (const plan of Object.values(STUDENT_LOAN_RATES)) {
      expect(plan.threshold).toBeGreaterThan(0)
      expect(plan.rate).toBeGreaterThan(0)
      expect(plan.rate).toBeLessThan(1)
    }
  })
})

describe('Corporation Tax constants', () => {
  it('orders the small-profits and marginal-relief thresholds correctly', () => {
    expect(CORPORATION_TAX_THRESHOLD).toBeGreaterThan(0)
    expect(CORPORATION_TAX_THRESHOLD_HIGH).toBeGreaterThan(CORPORATION_TAX_THRESHOLD)
  })

  it('the main rate is higher than the small-profits rate', () => {
    expect(CORPORATION_TAX_RATE).toBeGreaterThan(0)
    expect(CORPORATION_TAX_RATE).toBeLessThan(1)
    expect(CORPORATION_TAX_RATE_HIGH).toBeGreaterThan(CORPORATION_TAX_RATE)
    expect(CORPORATION_TAX_RATE_HIGH).toBeLessThan(1)
  })
})

describe('Dividend constants', () => {
  it('has a non-negative allowance', () => {
    expect(DIVIDEND_ALLOWANCE).toBeGreaterThanOrEqual(0)
  })

  it('rates increase from basic to higher to additional, each within (0, 1)', () => {
    const { basic, higher, additional } = DIVIDEND_TAX_RATES
    for (const rate of [basic, higher, additional]) {
      expect(rate).toBeGreaterThan(0)
      expect(rate).toBeLessThan(1)
    }
    expect(higher).toBeGreaterThan(basic)
    expect(additional).toBeGreaterThan(higher)
  })
})
