import { type FC, useMemo, useState } from 'react'
import type { CalculationResult, IncomeType, Location, StudentLoanPlan } from './types'
import {
  calculateCorporationTax,
  calculateDividendTax,
  calculateNI,
  calculateStudentLoan,
  calculateTax,
  NI_RATES_EMPLOYEE,
  NI_RATES_EMPLOYER,
  PERSONAL_ALLOWANCE,
  salaryFromAssignmentPot,
} from './lib/calculator'
import { ResultsTable } from './components/ResultsTable'

const App: FC = () => {
  // --- State Management ---
  const [incomeType, setIncomeType] = useState<IncomeType>('permanent')
  const [annualSalary, setAnnualSalary] = useState<string>('80000')
  const [dayRate, setDayRate] = useState<string>('600')
  const [weeksPerYear, setWeeksPerYear] = useState<number>(48)
  const [studentLoan, setStudentLoan] = useState<StudentLoanPlan>('none')
  const [pensionContribution, setPensionContribution] = useState<number>(5)
  const [location, setLocation] = useState<Location>('england')
  const [employerNI, setEmployerNI] = useState<boolean>(true)
  const [umbrellaFee, setUmbrellaFee] = useState<number>(100)
  const [businessExpenses, setBusinessExpenses] = useState<number>(10000)

  // --- Memoized Calculations ---
  const grossIncome = useMemo(() => {
    if (incomeType === 'permanent') return Number(annualSalary || '0')
    return Number(dayRate || '0') * 5 * weeksPerYear
  }, [incomeType, annualSalary, dayRate, weeksPerYear])

  const permanentCalculation: CalculationResult = useMemo(() => {
    const pensionDeduction = grossIncome * (pensionContribution / 100)
    const taxableIncome = grossIncome - pensionDeduction
    const tax = calculateTax(taxableIncome, location)
    const ni = calculateNI(grossIncome, NI_RATES_EMPLOYEE)
    const sl = calculateStudentLoan(grossIncome, studentLoan)
    const net = grossIncome - tax - ni - sl - pensionDeduction
    return {
      gross: grossIncome,
      tax,
      ni,
      studentLoan: sl,
      pension: pensionDeduction,
      net,
    }
  }, [grossIncome, pensionContribution, studentLoan, location])

  const insideIR35Calculation: CalculationResult = useMemo(() => {
    const annualUmbrellaFee = umbrellaFee * 12
    const incomeAfterUmbrella = grossIncome - annualUmbrellaFee
    // Employer NI comes out of the same pot as the salary, so the pot is
    // grossed down: charging the rate on the whole pot would levy employer NI
    // on the employer NI itself.
    const taxableIncome = employerNI ? salaryFromAssignmentPot(incomeAfterUmbrella, NI_RATES_EMPLOYER) : incomeAfterUmbrella
    const employerNIDeduction = incomeAfterUmbrella - taxableIncome
    const pensionDeduction = taxableIncome * (pensionContribution / 100)
    const finalTaxable = taxableIncome - pensionDeduction
    const tax = calculateTax(finalTaxable, location)
    const ni = calculateNI(taxableIncome, NI_RATES_EMPLOYEE)
    const sl = calculateStudentLoan(taxableIncome, studentLoan)
    const net = grossIncome - tax - ni - sl - pensionDeduction - employerNIDeduction - annualUmbrellaFee
    return {
      gross: grossIncome,
      tax,
      ni,
      employerNI: employerNIDeduction,
      studentLoan: sl,
      pension: pensionDeduction,
      umbrellaFee: annualUmbrellaFee,
      net,
    }
  }, [grossIncome, pensionContribution, studentLoan, location, employerNI, umbrellaFee])

  const outsideIR35Calculation: CalculationResult = useMemo(() => {
    // The usual director's arrangement: a salary equal to the personal
    // allowance, with the rest of the profit taken as dividends.
    const salary = PERSONAL_ALLOWANCE
    const profit = grossIncome - businessExpenses - salary
    const corporationTax = calculateCorporationTax(profit)
    const dividend = Math.max(0, profit - corporationTax)
    // Salary and dividends share one personal allowance, and their combined
    // total is what tapers it, so the salary is not always tax free.
    const tax = calculateTax(salary, location, salary + dividend)
    const dividendTax = calculateDividendTax(dividend, salary)
    const net = salary + dividend - tax - dividendTax
    return {
      gross: grossIncome,
      tax,
      ni: 0,
      studentLoan: 0,
      pension: 0,
      corporationTax,
      salary,
      dividend,
      dividendTax,
      businessExpenses,
      net,
    }
  }, [grossIncome, businessExpenses, location])

  // --- Render Method ---
  return (
    <div className="min-h-screen bg-[#D6E4F0]" style={{ fontFamily: 'Helvetica, sans-serif' }}>
      <div className="mx-auto max-w-7xl p-4 sm:p-8">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-[#163172]" style={{ fontFamily: 'Verdana, sans-serif', lineHeight: '1.2' }}>
            UK Salary & Contract Calculator
          </h1>
          <p className="mt-2 text-gray-700" style={{ lineHeight: '1.5' }}>
            Support Every Step of Your Journey
          </p>
        </header>

        <div className="mb-8 rounded-xl bg-white/70 p-6 shadow-lg backdrop-blur-sm">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="font-bold text-[#163172]">Employment Type</label>
              <select value={incomeType} onChange={(e) => setIncomeType(e.target.value as IncomeType)} className="mt-1 w-full rounded-md border border-gray-300 p-2 shadow-sm">
                <option value="permanent">Permanent</option>
                <option value="contract">Contract</option>
              </select>
            </div>

            {incomeType === 'permanent' ? (
              <div>
                <label className="font-bold text-[#163172]">Annual Salary (£)</label>
                <input type="number" value={annualSalary} onChange={(e) => setAnnualSalary(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 p-2 shadow-sm" />
              </div>
            ) : (
              <div>
                <label className="font-bold text-[#163172]">Day Rate (£)</label>
                <input type="number" value={dayRate} onChange={(e) => setDayRate(e.target.value)} className="mt-1 w-full rounded-md border border-gray-300 p-2 shadow-sm" />
              </div>
            )}

            <div>
              <label className="font-bold text-[#163172]">Working Weeks per Year</label>
              <input type="number" value={weeksPerYear} onChange={(e) => setWeeksPerYear(Number(e.target.value))} className="mt-1 w-full rounded-md border border-gray-300 p-2 shadow-sm" />
            </div>
          </div>
        </div>

        <div className="mb-8 rounded-xl bg-white/70 p-6 shadow-lg backdrop-blur-sm">
          <h2 className="mb-4 text-2xl font-bold text-[#163172]" style={{ fontFamily: 'Verdana, sans-serif', lineHeight: '1.2' }}>
            Additional Details
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <label className="font-bold text-[#163172]">Location (Tax purposes)</label>
              <select value={location} onChange={(e) => setLocation(e.target.value as Location)} className="mt-1 w-full rounded-md border border-gray-300 p-2 shadow-sm">
                <option value="england">England, NI & Wales</option>
                <option value="scotland">Scotland</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-[#163172]">Student Loan</label>
              <select value={studentLoan} onChange={(e) => setStudentLoan(e.target.value as StudentLoanPlan)} className="mt-1 w-full rounded-md border border-gray-300 p-2 shadow-sm">
                <option value="none">None</option>
                <option value="plan1">Plan 1</option>
                <option value="plan2">Plan 2</option>
                <option value="plan4">Plan 4</option>
                <option value="plan5">Plan 5</option>
                <option value="postgraduate">Postgraduate</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-[#163172]">Pension Contribution (%)</label>
              <input
                type="number"
                value={pensionContribution}
                onChange={(e) => setPensionContribution(Number(e.target.value))}
                className="mt-1 w-full rounded-md border border-gray-300 p-2 shadow-sm"
              />
            </div>
            {incomeType === 'contract' && (
              <>
                <div>
                  <label className="font-bold text-[#163172]">Inside IR35: Monthly Umbrella Fee (£)</label>
                  <input type="number" value={umbrellaFee} onChange={(e) => setUmbrellaFee(Number(e.target.value))} className="mt-1 w-full rounded-md border border-gray-300 p-2 shadow-sm" />
                </div>
                <div className="mt-6 flex items-center">
                  <input
                    type="checkbox"
                    id="employerNI"
                    checked={employerNI}
                    onChange={(e) => setEmployerNI(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#1E56A0] focus:ring-[#1E56A0]"
                  />
                  <label htmlFor="employerNI" className="ml-2 block text-sm font-bold text-[#163172]">
                    Employer's NI borne by contractor?
                  </label>
                </div>
                <div>
                  <label className="font-bold text-[#163172]">Outside IR35: Annual Business Expenses (£)</label>
                  <input type="number" value={businessExpenses} onChange={(e) => setBusinessExpenses(Number(e.target.value))} className="mt-1 w-full rounded-md border border-gray-300 p-2 shadow-sm" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {incomeType === 'permanent' && <ResultsTable title="Permanent Employee" data={permanentCalculation} type="permanent" />}
          {incomeType === 'contract' && <ResultsTable title="Inside IR35 (Umbrella)" data={insideIR35Calculation} type="insideIR35" employerNI={employerNI} />}
          {incomeType === 'contract' && <ResultsTable title="Outside IR35 (Limited Co)" data={outsideIR35Calculation} type="outsideIR35" />}
        </div>

        <div className="mt-8 rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-2xl font-bold text-[#163172]" style={{ fontFamily: 'Verdana, sans-serif', lineHeight: '1.2' }}>
            Recommendations & Explanations
          </h2>
          <div className="space-y-4 text-gray-800" style={{ fontFamily: 'Helvetica, sans-serif', lineHeight: '1.5' }}>
            <p>
              <strong>Permanent Employment:</strong> The most straightforward option. Your employer handles all tax and NI deductions through PAYE. You receive benefits like holiday pay, sick pay, and
              pension contributions.
            </p>
            <p>
              <strong>Inside IR35:</strong> When your contract is 'inside IR35', you are treated as an employee for tax purposes. You'll typically work through an umbrella company that processes your
              payments, deducting tax, NI, and their fee. You do not get the same employment rights as a permanent employee. The 'Employer's NI' is often passed on to the contractor, reducing the day
              rate, which is reflected in the calculator.
            </p>
            <p>
              <strong>Outside IR35:</strong> This offers the most tax efficiency but also comes with the most administrative responsibility. You operate as a genuine business through your own limited
              company. You can claim a wider range of business expenses and pay yourself a combination of a small salary and dividends. You are responsible for all your taxes, including Corporation
              Tax, VAT (if applicable), and personal tax on your salary and dividends.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
