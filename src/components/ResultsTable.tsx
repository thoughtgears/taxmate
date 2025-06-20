import type { ResultsTableProps } from '../types'
import type { FC } from 'react'

export const ResultsTable: FC<ResultsTableProps> = ({ title, data, type, employerNI }) => {
  if (!data) return null
  return (
    <div className="rounded-lg bg-white p-6 shadow-lg">
      <h3 className="mb-4 text-xl font-bold text-[#163172]" style={{ fontFamily: 'Verdana, sans-serif' }}>
        {title}
      </h3>
      <div className="space-y-2 text-sm" style={{ fontFamily: 'Helvetica, sans-serif', lineHeight: '1.5' }}>
        <div className="flex justify-between">
          <span>Gross Income:</span> <span>£{data.gross.toFixed(2)}</span>
        </div>

        {type === 'permanent' && (
          <>
            <div className="flex justify-between text-red-600">
              <span>Income Tax:</span>
              <span>- £{data.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>National Insurance:</span>
              <span>- £{data.ni.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Pension:</span>
              <span>- £{data.pension.toFixed(2)}</span>
            </div>
            {data.studentLoan > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Student Loan:</span>
                <span>- £{data.studentLoan.toFixed(2)}</span>
              </div>
            )}
          </>
        )}

        {type === 'insideIR35' && (
          <>
            <div className="flex justify-between text-red-600">
              <span>Income Tax:</span>
              <span>- £{data.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Employee's NI:</span>
              <span>- £{data.ni.toFixed(2)}</span>
            </div>
            {employerNI && (
              <div className="flex justify-between text-red-600">
                <span>Employer's NI:</span>
                <span>- £{data.employerNI?.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-red-600">
              <span>Umbrella Fee:</span>
              <span>- £{data.umbrellaFee?.toFixed(2)}</span>
            </div>
            {data.studentLoan > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Student Loan:</span>
                <span>- £{data.studentLoan.toFixed(2)}</span>
              </div>
            )}
          </>
        )}

        {type === 'outsideIR35' && (
          <>
            <div className="flex justify-between text-red-600">
              <span>Business Expenses:</span>
              <span>- £{data.businessExpenses?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#1E56A0]">
              <span>Salary Taken:</span>
              <span>£{data.salary?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Corporation Tax:</span>
              <span>- £{data.corporationTax?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#1E56A0]">
              <span>Dividends:</span>
              <span>£{data.dividend?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Dividend Tax:</span>
              <span>- £{data.dividendTax?.toFixed(2)}</span>
            </div>
          </>
        )}

        <div className="mt-2 border-t border-gray-200 pt-2">
          <div className="flex justify-between text-lg font-bold text-[#163172]">
            <span>Net Annual Pay:</span>
            <span>£{data.net.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Net Monthly Pay:</span> <span>£{(data.net / 12).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Net Weekly Pay:</span> <span>£{(data.net / 52).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
