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
5 April 2027). The England/Wales/NI income tax bands, National Insurance
primary threshold and upper earnings limit, Corporation Tax rates and
thresholds, and the dividend allowance in `src/lib/calculator/constants.ts`
were checked against gov.uk on 2026-09-16 and are current for 2026/27.

**Some constants in that file are known to be stale** — most notably the
Scottish income tax bands (missing the Advanced Rate band entirely) and the
employer NI secondary threshold/rate. These are flagged for the maintainer
rather than silently changed; see the code comments in `constants.ts` and
the project history for the sourced comparison. Check the constants against
[gov.uk](https://www.gov.uk/income-tax-rates) before relying on this tool
for a tax year other than the one it was last checked against.

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
that directory. UI components (`App.tsx`, `ResultsTable.tsx`) are
intentionally untested; they're presentation, eyeballed by the maintainer
rather than unit tested.

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
Get advice from a qualified accountant before making a decision based on
these numbers.

## Tech stack

- React 19 + TypeScript, built with Vite
- Tailwind CSS v4
- vitest + `@vitest/coverage-v8` for testing
