export type Location = 'england' | 'scotland'
export type IncomeType = 'permanent' | 'contract'
export type StudentLoanPlan = 'none' | 'plan1' | 'plan2' | 'plan4' | 'plan5' | 'postgraduate'

export interface RateBand {
  band: string
  limit: number
  rate: number
}

export interface StudentLoanInfo {
  threshold: number
  rate: number
}

export interface CalculationResult {
  gross: number
  net: number
  tax: number
  ni: number
  studentLoan: number
  pension: number
  employerNI?: number
  umbrellaFee?: number
  businessExpenses?: number
  salary?: number
  corporationTax?: number
  dividend?: number
  dividendTax?: number
}

export interface ResultsTableProps {
  title: string
  data: CalculationResult
  type: 'permanent' | 'insideIR35' | 'outsideIR35'
  employerNI?: boolean
}
