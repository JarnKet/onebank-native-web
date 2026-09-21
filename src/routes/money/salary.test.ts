import { describe, expect, it } from 'vitest'
import { parseSalaryCsv, splitCsvLine, SALARY_TEMPLATE } from './salary'

describe('splitCsvLine', () => {
  it('keeps a quoted comma inside its cell', () => {
    expect(splitCsvLine('1,"DOE, JOHN",5')).toEqual(['1', 'DOE, JOHN', '5'])
  })

  it('accepts semicolons and tabs, which spreadsheets export too', () => {
    expect(splitCsvLine('a;b\tc')).toEqual(['a', 'b', 'c'])
  })
})

describe('parseSalaryCsv', () => {
  it('reads the template, skipping its header', () => {
    const rows = parseSalaryCsv(SALARY_TEMPLATE)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ account: '010120000345678901', name: 'ABCD EFGH', amount: 3500000, problem: '' })
  })

  it('flags rows it cannot pay instead of dropping them', () => {
    const rows = parseSalaryCsv('123,SHORT,100\n010120000345678901,,100\n010120000345678901,X,-5')
    expect(rows.map((row) => row.problem)).toEqual([
      'Account number is too short',
      'Name is missing',
      'Amount is not a positive number',
    ])
  })

  it('reads amounts with thousands separators', () => {
    expect(parseSalaryCsv('010120000345678901,A,"1,250,000"')[0].amount).toBe(1250000)
  })
})
