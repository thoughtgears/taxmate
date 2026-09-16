# TaxMate

A small UK salary and contractor take-home pay calculator, built with React
and Vite. It compares three ways of getting paid in the UK — permanent PAYE
employment, a contract inside IR35 (via an umbrella company), and a contract
outside IR35 (via your own limited company) — and shows the tax, National
Insurance, student loan, and net pay for each.

## Who it's for

Contractors and permanent employees who want a quick, rough comparison of
take-home pay across employment types. It is a planning tool, not an
accounting one — see [Limitations](#limitations-and-disclaimer) below.

## Tax year

The calculator is built around UK tax rules for **2026/27** (6 April 2026 –
5 April 2027), and for Corporation Tax the financial year beginning 1 April
2026. Every constant in `src/lib/calculator/constants.ts` — income tax bands
for both England/Wales/NI and Scotland, employee and employer National
Insurance, student loan thresholds, dividend rates and allowance, and
Corporation Tax rates, limits and marginal relief fraction — was checked
against its primary source on **2026-09-16** and is current for that year.

Sources, all linked from the header comment in `constants.ts`:

- [Income tax rates and Personal Allowances](https://www.gov.uk/income-tax-rates)
- [Scottish Income Tax rates](https://www.mygov.scot/scottish-income-tax/current-income-tax-rates)
- [Rates and thresholds for employers 2026 to 2027](https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027)
- [Tax on dividends](https://www.gov.uk/tax-on-dividends)
- [Repaying your student loan](https://www.gov.uk/repaying-your-student-loan/what-you-pay)
- [Corporation Tax rates and reliefs](https://www.gov.uk/corporation-tax-rates)

Re-check these before relying on the tool for any later tax year. Band
`limit` values are written as gov.uk publishes them — cumulative income
ceilings assuming a full personal allowance — with one documented exception,
the additional/top-rate threshold of £125,140, which gov.uk quotes at a nil
allowance. `calculateTax` reconciles the two; see its `taxableLimit` comment
before editing either.

## Running locally

Requires Node.js (LTS; developed and tested against Node 24).

```bash
npm install
npm run dev       # starts the Vite dev server
```

Other scripts:

```bash
npm run build     # type-check and build for production
npm run lint       # ESLint
npm run preview    # preview a production build locally
```

## Running the tests

The pure calculation logic in `src/lib/calculator/` — the only part of this
codebase that decides how much tax someone pays — is covered by a full
vitest suite, enforced at 100% statement/branch/function/line coverage for
that directory. Every decision about how much tax is due lives in that
directory — including Corporation Tax, marginal relief and dividend tax, all
of which were moved out of `App.tsx` so the gate can see them. UI components
(`App.tsx`, `ResultsTable.tsx`) are intentionally untested; they're
presentation, eyeballed by the maintainer rather than unit tested.

```bash
npm run test            # watch mode
npm run test:run        # single run
npm run test:coverage   # single run with a coverage report
```

## Limitations and disclaimer

**This is not tax advice.** TaxMate is a simplified planning tool and does
not account for every circumstance that affects a real tax bill: Scottish
tax residency rules, marriage allowance, Gift Aid, salary sacrifice beyond
a flat pension percentage, benefits in kind, the High Income Child Benefit
Charge, multiple income sources, VAT (including the Flat Rate Scheme for
limited companies), employment allowance, or any tax year other than the
one described above. Figures are estimates for comparison purposes only.

Two omissions worth naming, because they affect the limited-company
comparison specifically: student loan repayments are not charged on the
outside-IR35 route at all, although dividends do attract them through Self
Assessment; and the outside-IR35 route assumes a director's salary fixed at
the personal allowance with no employer NI or employment allowance.

Get advice from a qualified accountant before making a decision based on
these numbers.

## Tech stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS v4
- vitest + `@vitest/coverage-v8` for testing
