import { describe, expect, it } from 'vitest'
import { calculateDividendTax, DIVIDEND_ALLOWANCE, DIVIDEND_TAX_RATES, PERSONAL_ALLOWANCE, TAX_RATES } from '../../../src/lib/calculator'

/**
 * Golden values are worked from the published 2026/27 figures by hand and
 * shown in the comment above each case:
 *
 *   personal allowance   £12,570, tapering £1 per £2 above £100,000
 *   dividend allowance   £500, a nil-RATE band (it uses up band room)
 *   UK basic rate band   £37,700 of taxable income
 *   UK higher rate band  to £125,140 of taxable income
 *   dividend rates       10.75% / 35.75% / 39.35%
 *
 * Dividends are the TOP slice of income, so the salary underneath them
 * decides which band they land in.
 */

const SALARY = PERSONAL_ALLOWANCE // the usual director's salary: exactly the allowance

describe('calculateDividendTax — edge cases', () => {
  it('charges nothing on nil or negative dividends', () => {
    expect(calculateDividendTax(0, SALARY)).toBe(0)
    expect(calculateDividendTax(-5000, SALARY)).toBe(0)
  })

  it('treats negative other income as nil', () => {
    expect(calculateDividendTax(20000, -1000)).toBeCloseTo(calculateDividendTax(20000, 0), 6)
  })

  it('charges nothing while the dividends sit inside the unused personal allowance', () => {
    expect(calculateDividendTax(PERSONAL_ALLOWANCE, 0)).toBe(0)
  })

  it('charges nothing on dividends covered by the dividend allowance alone', () => {
    expect(calculateDividendTax(DIVIDEND_ALLOWANCE, SALARY)).toBe(0)
  })
})

describe('calculateDividendTax — golden values (2026/27)', () => {
  it('£10,000 dividends on a £12,570 salary → £1,021.25', () => {
    // Salary uses the whole allowance. £500 of dividends at 0%, the
    // remaining £9,500 at 10.75% = £1,021.25.
    expect(calculateDividendTax(10000, SALARY)).toBeCloseTo(1021.25, 6)
  })

  it('£50,000 dividends on a £12,570 salary → £8,396.25', () => {
    // Basic band holds £37,700 of taxable income: £500 at 0% and £37,200 at
    // 10.75% = £3,999.00. The remaining £12,300 is in the higher band at
    // 35.75% = £4,397.25. Total £8,396.25.
    expect(calculateDividendTax(50000, SALARY)).toBeCloseTo(8396.25, 6)
  })

  it('£200,000 dividends on a £12,570 salary → £68,311.23', () => {
    // Allowance fully tapered, so the salary itself takes the first £12,570
    // of the basic band. £25,130 of basic band left: £500 at 0%, £24,630 at
    // 10.75% = £2,647.725. Higher band £87,440 at 35.75% = £31,259.80.
    // The remaining £87,430 at 39.35% = £34,403.705. Total £68,311.23.
    expect(calculateDividendTax(200000, SALARY)).toBeCloseTo(68311.23, 6)
  })

  it('£20,000 dividends with no other income → £744.975', () => {
    // The full £12,570 allowance is available against the dividends, leaving
    // £7,430. £500 at 0%, £6,930 at 10.75% = £744.975.
    expect(calculateDividendTax(20000, 0)).toBeCloseTo(744.975, 6)
  })

  it('£5,000 dividends on a £60,000 salary → £1,608.75 (basic band already spent)', () => {
    // Taxable salary £47,430 has already filled the £37,700 basic band, so
    // every dividend pound is in the higher band: £500 at 0% and £4,500 at
    // 35.75% = £1,608.75.
    expect(calculateDividendTax(5000, 60000)).toBeCloseTo(1608.75, 6)
  })

  it('£95,000 dividends on a £12,570 salary → £25,430.00 (allowance part-tapered)', () => {
    // Total income £107,570 tapers the allowance to £8,785, so £3,785 of the
    // salary is taxable and eats into the basic band. £33,915 of basic band
    // left: £500 at 0%, £33,415 at 10.75% = £3,592.1125. The remaining
    // £61,085 is in the higher band at 35.75% = £21,837.8875.
    // Total £25,430.00.
    expect(calculateDividendTax(95000, SALARY)).toBeCloseTo(25430, 6)
  })
})

describe('calculateDividendTax — band structure', () => {
  it('uses the UK basic rate limit, not the Scottish one', () => {
    // £50,270 of dividends and no other income: £12,570 covered by the
    // personal allowance, £500 by the dividend allowance, £37,200 at the
    // basic dividend rate = £3,999.00 — nothing at the higher rate.
    // Scotland's basic band ends at £29,526, so if Scottish thresholds were
    // being applied here this would be far higher. Dividends are taxed at UK
    // rates against UK limits for Scottish taxpayers too.
    expect(TAX_RATES.scotland[2].limit).toBeLessThan(TAX_RATES.england[1].limit)
    expect(calculateDividendTax(50270, 0)).toBeCloseTo(3999, 6)
  })

  it('charges the basic dividend rate on the marginal pound inside the basic band', () => {
    const marginal = calculateDividendTax(10001, SALARY) - calculateDividendTax(10000, SALARY)
    expect(marginal).toBeCloseTo(DIVIDEND_TAX_RATES.basic, 6)
  })

  it('charges the higher dividend rate on the marginal pound above the basic band', () => {
    // Salary £12,570 + £500 nil rate + £37,700 basic band is the crossover.
    const crossover = SALARY + DIVIDEND_ALLOWANCE + 37700
    const marginal = calculateDividendTax(crossover - SALARY + 1, SALARY) - calculateDividendTax(crossover - SALARY, SALARY)
    expect(marginal).toBeCloseTo(DIVIDEND_TAX_RATES.higher, 6)
  })

  it('charges the additional dividend rate on the marginal pound above £125,140 of taxable income', () => {
    const dividends = 150000
    const marginal = calculateDividendTax(dividends + 1, SALARY) - calculateDividendTax(dividends, SALARY)
    expect(marginal).toBeCloseTo(DIVIDEND_TAX_RATES.additional, 6)
  })

  it('treats the dividend allowance as a nil-rate band, not a deduction', () => {
    // A deduction would shift the whole band structure down by £500. As a
    // nil-rate band it only zeroes the rate on the first £500, so £500 of
    // dividends that would have been basic-rate is pushed into the higher
    // band instead. The difference is worth exactly £500 x (higher - basic).
    const justFillingTheBasicBand = SALARY + DIVIDEND_ALLOWANCE + 37700 - SALARY
    const asNilRateBand = calculateDividendTax(justFillingTheBasicBand, SALARY)
    const asDeduction = (justFillingTheBasicBand - DIVIDEND_ALLOWANCE) * DIVIDEND_TAX_RATES.basic
    expect(asNilRateBand - asDeduction).toBeCloseTo(DIVIDEND_ALLOWANCE * (DIVIDEND_TAX_RATES.higher - DIVIDEND_TAX_RATES.basic), 6)
  })
})
