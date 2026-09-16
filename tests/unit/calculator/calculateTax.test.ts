import { describe, expect, it } from 'vitest'
import { calculateTax, PERSONAL_ALLOWANCE_TAPER_RATE, PERSONAL_ALLOWANCE_TAPER_THRESHOLD, TAX_RATES } from '../../../src/lib/calculator'
import type { Location, RateBand } from '../../../src/types'

/**
 * Independent reference implementation of the personal-allowance taper +
 * banded income tax rules, built directly from the `TAX_RATES` constants
 * (never a duplicated literal rate/threshold). This keeps the bulk of this
 * suite immune to HMRC rate updates: bump a number in `constants.ts` and
 * every test below re-derives its expectation from the new value.
 *
 * It works the way the legislation does — in TAXABLE income, i.e. income
 * after the personal allowance — rather than in the total-income figures
 * gov.uk publishes. The two only coincide while the allowance is untouched.
 * Above £100,000 the allowance tapers and the published band ceilings move
 * down with it; the additional/top-rate threshold (£125,140) is the one
 * published figure that is already stated at a nil allowance, so it stays
 * put. Treating all of them as fixed understates tax for every £100k+ earner.
 *
 * A small number of GOLDEN VALUE cases further down assert literal £
 * amounts. Those are deliberately not derived — they exist to fail loudly
 * if a rate or threshold changes, and are labelled with the tax year they
 * assume.
 */
const expectedTax = (income: number, bands: RateBand[]): number => {
  const standardAllowance = bands[0].limit
  const taperedAway = Math.max(0, income - PERSONAL_ALLOWANCE_TAPER_THRESHOLD) / PERSONAL_ALLOWANCE_TAPER_RATE
  const allowance = Math.max(0, standardAllowance - taperedAway)

  // Statutory taxable-income ceilings: published ceilings are quoted
  // inclusive of a full allowance, except the second-from-last (the
  // additional/top-rate threshold), which is quoted at a nil allowance.
  const limits = bands.map((band, i) => (i === bands.length - 2 ? band.limit : band.limit - standardAllowance))

  let taxable = Math.max(0, income - allowance)
  let tax = 0
  for (let i = 1; i < bands.length; i++) {
    const taxableInBand = Math.max(0, Math.min(taxable, limits[i] - limits[i - 1]))
    tax += taxableInBand * bands[i].rate
    taxable -= taxableInBand
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

  it('£200,000 taxable income → £76,203 tax (personal allowance fully withdrawn)', () => {
    // Allowance nil, so taxable income is the full £200,000.
    // £37,700 @ 20% = £7,540; £37,700–£125,140 (£87,440) @ 40% = £34,976;
    // £125,140–£200,000 (£74,860) @ 45% = £33,687. Total £76,203.
    expect(calculateTax(200000, 'england')).toBeCloseTo(76203, 6)
  })

  it('£150,000 taxable income → £53,703 tax', () => {
    // £37,700 @ 20% = £7,540; £87,440 @ 40% = £34,976;
    // £24,860 @ 45% = £11,187. Total £53,703.
    expect(calculateTax(150000, 'england')).toBeCloseTo(53703, 6)
  })

  it('£120,000 taxable income → £39,432 tax (allowance part-tapered)', () => {
    // Allowance £12,570 − £10,000 = £2,570, so taxable income is £117,430.
    // £37,700 @ 20% = £7,540; £79,730 @ 40% = £31,892. Total £39,432.
    expect(calculateTax(120000, 'england')).toBeCloseTo(39432, 6)
  })
})

describe('calculateTax — personal allowance taper marginal rates', () => {
  const marginalRateAt = (income: number, location: Location): number => calculateTax(income + 1, location) - calculateTax(income, location)

  it('England: 40% just below the £100,000 taper threshold', () => {
    expect(marginalRateAt(99999, 'england')).toBeCloseTo(0.4, 6)
  })

  it('England: 60% inside the taper zone — the "£100k trap"', () => {
    // Each extra £1 is taxed at 40% AND withdraws 50p of allowance, which is
    // itself then taxed at 40%: 40% + 20% = 60%. This is the single most
    // documented feature of UK income tax above £100,000, and the check that
    // catches the band ceilings failing to move with the allowance.
    expect(marginalRateAt(110000, 'england')).toBeCloseTo(0.6, 6)
    expect(marginalRateAt(100000, 'england')).toBeCloseTo(0.6, 6)
    expect(marginalRateAt(125139, 'england')).toBeCloseTo(0.6, 6)
  })

  it('England: back to 45% once the allowance is fully withdrawn', () => {
    expect(marginalRateAt(125140, 'england')).toBeCloseTo(0.45, 6)
    expect(marginalRateAt(200000, 'england')).toBeCloseTo(0.45, 6)
  })

  it('Scotland: 67.5% inside the taper zone (45% Advanced Rate plus the withdrawn allowance)', () => {
    expect(marginalRateAt(110000, 'scotland')).toBeCloseTo(0.675, 6)
  })

  it('Scotland: 48% once the allowance is fully withdrawn', () => {
    expect(marginalRateAt(130000, 'scotland')).toBeCloseTo(0.48, 6)
  })
})

describe('calculateTax — golden values (2026/27, taper zone, Scotland)', () => {
  it('£150,000 → £59,634.35 tax', () => {
    // Allowance nil, so taxable income is the full £150,000.
    // £3,967 @ 19% = £753.73; £12,989 @ 20% = £2,597.80;
    // £14,136 @ 21% = £2,968.56; £31,338 @ 42% = £13,161.96;
    // £62,430–£125,140 (£62,710) @ 45% = £28,219.50;
    // £24,860 @ 48% = £11,932.80. Total £59,634.35.
    expect(calculateTax(150000, 'scotland')).toBeCloseTo(59634.35, 6)
  })
})

describe('calculateTax — golden values (2026/27, Scotland)', () => {
  // Scottish bands as published on mygov.scot and checked on 2026-09-16:
  // PA £12,570 / starter 19% to £16,537 / basic 20% to £29,526 /
  // intermediate 21% to £43,662 / higher 42% to £75,000 / advanced 45% to
  // £125,140 / top 48% above. Band widths therefore run £3,967 starter,
  // £12,989 basic, £14,136 intermediate, £31,338 higher.

  it('£30,000 → £3,451.07 tax', () => {
    // £3,967 @ 19% = £753.73; £12,989 @ 20% = £2,597.80;
    // £474 @ 21% = £99.54. Total £3,451.07.
    expect(calculateTax(30000, 'scotland')).toBeCloseTo(3451.07, 6)
  })

  it('£80,000 → £21,732.05 tax (£5,000 inside the Advanced Rate band)', () => {
    // £3,967 @ 19% = £753.73; £12,989 @ 20% = £2,597.80;
    // £14,136 @ 21% = £2,968.56; £31,338 @ 42% = £13,161.96;
    // £5,000 @ 45% = £2,250.00. Total £21,732.05.
    expect(calculateTax(80000, 'scotland')).toBeCloseTo(21732.05, 6)
  })

  it('charges 45%, not 42%, on the pound after the Advanced Rate threshold', () => {
    // Regression guard for the missing Advanced Rate band: before it was
    // added, income just above £75,000 was charged at the Higher Rate.
    const advancedThreshold = 75000
    const marginalPound = calculateTax(advancedThreshold + 1, 'scotland') - calculateTax(advancedThreshold, 'scotland')
    expect(marginalPound).toBeCloseTo(0.45, 6)
  })

  it('charges 48% on the pound after the Top Rate threshold', () => {
    const topThreshold = 125140
    const marginalPound = calculateTax(topThreshold + 1, 'scotland') - calculateTax(topThreshold, 'scotland')
    expect(marginalPound).toBeCloseTo(0.48, 6)
  })
})
