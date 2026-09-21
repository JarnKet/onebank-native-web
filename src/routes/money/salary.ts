/**
 * Reading a payroll file: one row per employee — account, name, amount and an
 * optional description — as CSV, with or without a header row.
 *
 * Kept apart from the page so the parsing rules are tested on their own.
 */

export interface SalaryRow {
  line: number
  account: string
  name: string
  amount: number
  note: string
  /** Why this row cannot be paid, or '' when it can. */
  problem: string
}

/** Splits one CSV line, honouring double-quoted cells with commas in them. */
export function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (quoted) {
      if (char === '"' && line[i + 1] === '"') {
        cell += '"'
        i++
      } else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === ',' || char === ';' || char === '\t') {
      cells.push(cell.trim())
      cell = ''
    } else cell += char
  }
  cells.push(cell.trim())
  return cells
}

export function parseSalaryCsv(text: string): SalaryRow[] {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/)
  const rows: SalaryRow[] = []
  lines.forEach((raw, index) => {
    if (!raw.trim()) return
    const [account = '', name = '', amountText = '', note = ''] = splitCsvLine(raw)
    const amount = Number(amountText.replace(/[\s,]/g, ''))
    // A first line whose amount is not a number is a header, not a payee.
    if (rows.length === 0 && index === 0 && !Number.isFinite(amount)) return
    const digits = account.replace(/\D/g, '')
    let problem = ''
    if (digits.length < 8) problem = 'Account number is too short'
    else if (!name) problem = 'Name is missing'
    else if (!Number.isFinite(amount) || amount <= 0) problem = 'Amount is not a positive number'
    rows.push({ line: index + 1, account: digits, name, amount: Number.isFinite(amount) ? amount : 0, note, problem })
  })
  return rows
}

/** The template the "download" link hands out. */
export const SALARY_TEMPLATE =
  'account,name,amount,description\n010120000345678901,ABCD EFGH,3500000,Salary\n010120000999888777,SAYALATH PHOMMACHANH,4200000,Salary\n'
