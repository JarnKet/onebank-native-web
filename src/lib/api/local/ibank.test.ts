/**
 * The local answers for the iBank screens (`./handlers.ts` + `./ibank.ts`):
 * reference data is consistent, alert choices persist per group, and
 * destination accounts are the same list the transfer form reads.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { currentGroup, onebankGroups } from '../../../stores/onebankGroups'
import { loginData } from '../../../stores/session'
import { handleLocally } from './handlers'
import { LOANS, loanSchedule, NOTIFICATION_SETTINGS } from './ibank'
import { resetLocalData } from './index'
import { localState } from './store'

const G = 'G-1'
const GROUP = 'ONEBANKGROUP'

function run(service: string, data: Record<string, unknown>, onebankid = G): any {
  return handleLocally(service, { onebankid, ...data })
}

beforeEach(() => {
  resetLocalData()
  currentGroup.set(G)
  loginData.set({ USER: { userid: 'U1', name: 'ME' } } as any)
  onebankGroups.set({
    [G]: { isFinishLoad: true, loadHomeResult: { accounts: [], me: { userid: 'U1', name: 'ME' } } as any },
    'G-2': { isFinishLoad: true, loadHomeResult: { accounts: [], me: { userid: 'U1', name: 'ME' } } as any },
  })
})

describe('rates', () => {
  it('answers exchange and interest rates with the date they were published', () => {
    const exchange = run('IBANKEXCHANGERATES', { command: 'loadRates' })
    expect(exchange.result).toBe(0)
    expect(exchange.rates.length).toBeGreaterThan(0)
    expect(exchange.updated).toMatch(/^\d{4}-\d{2}-\d{2} /)

    const interest = run('IBANKINTERESTRATES', { command: 'loadRates' })
    expect(interest.result).toBe(0)
    expect(interest.tables.map((table: any) => table.id)).toContain('FIXED_DEPOSIT')
  })
})

describe('term deposits and loans', () => {
  it('filters movements by date, inclusive', () => {
    const all = run('IBANKTERMDEPOSITACCOUNT', { command: 'getTransactions', accountid: 'TD1' }).items
    const some = run('IBANKTERMDEPOSITACCOUNT', {
      command: 'getTransactions',
      accountid: 'TD1',
      from: '2026-04-15',
      to: '2026-04-15',
    }).items
    expect(all.length).toBeGreaterThan(1)
    expect(some.map((item: any) => item.date)).toEqual(['2026-04-15'])
  })

  it('refuses an account it does not know', () => {
    expect(run('IBANKLOANACCOUNT', { command: 'getSchedule', accountid: 'NOPE' }).result).not.toBe(0)
  })

  it('keeps a loan, its repayments and its schedule in agreement', () => {
    const loan = run('IBANKLOANACCOUNT', { command: 'loadAccounts' }).loans[0]
    const schedule = run('IBANKLOANACCOUNT', { command: 'getSchedule', accountid: loan.id }).schedule
    const repayments = run('IBANKLOANACCOUNT', { command: 'getTransactions', accountid: loan.id }).items

    expect(schedule).toHaveLength(loan.term)
    expect(schedule.at(-1).closing).toBe(0)
    const lastPaid = schedule.filter((instalment: any) => instalment.paid).at(-1)
    expect(loan.outstanding).toBe(lastPaid.closing)
    expect(repayments.at(-1).balance).toBe(loan.outstanding)
    expect(Math.abs(loan.monthlyPayment - (schedule[0].principal + schedule[0].interest))).toBeLessThanOrEqual(1)
  })

  it('repays the whole loan and no more', () => {
    for (const loan of LOANS) {
      const principal = loanSchedule(loan).reduce((sum, instalment) => sum + instalment.principal, 0)
      expect(Math.abs(principal - loan.amount)).toBeLessThanOrEqual(loan.term)
    }
  })
})

describe('notification settings', () => {
  it('starts from the defaults', () => {
    const settings = run('IBANKNOTIFICATIONSETTING', { command: 'loadSettings' }).settings
    expect(settings.map((setting: any) => [setting.id, setting.enabled])).toEqual(
      NOTIFICATION_SETTINGS.map((setting) => [setting.id, setting.enabled]),
    )
  })

  it('keeps what a group saves, for that group only', () => {
    run('IBANKNOTIFICATIONSETTING', { command: 'saveSettings', settings: { payroll_alert: true, bill_payment_alert: false } })
    const mine = run('IBANKNOTIFICATIONSETTING', { command: 'loadSettings' }).settings
    const theirs = run('IBANKNOTIFICATIONSETTING', { command: 'loadSettings' }, 'G-2').settings
    const enabled = (list: any[], id: string) => list.find((setting) => setting.id === id).enabled

    expect(enabled(mine, 'payroll_alert')).toBe(true)
    expect(enabled(mine, 'bill_payment_alert')).toBe(false)
    expect(enabled(theirs, 'payroll_alert')).toBe(false)
  })

  it('ignores ids it does not offer', () => {
    run('IBANKNOTIFICATIONSETTING', { command: 'saveSettings', settings: { nonsense: true } })
    expect(localState().groups[G].notifications).toEqual({})
  })
})

describe('destination accounts', () => {
  it('adds one the transfer form then offers, and removes it again', () => {
    const added = run(GROUP, { command: 'addrecipient', name: 'Supplier', account: '0101-2000-1234', ccy: 'USD', bank: 'LDB' })
    expect(added.result).toBe(0)
    expect(added.recipient.account).toBe('010120001234')

    const offered = run(GROUP, { command: 'getrecipients' }).recipients
    expect(offered.map((recipient: any) => recipient.name)).toContain('Supplier')

    expect(run(GROUP, { command: 'removerecipient', recipientid: added.recipient.recipientid }).result).toBe(0)
    expect(run(GROUP, { command: 'getrecipients' }).recipients).toHaveLength(0)
  })

  it('refuses a short number, a missing name and a duplicate', () => {
    expect(run(GROUP, { command: 'addrecipient', name: 'X', account: '123' }).result).not.toBe(0)
    expect(run(GROUP, { command: 'addrecipient', name: ' ', account: '010120001234' }).result).not.toBe(0)
    run(GROUP, { command: 'addrecipient', name: 'X', account: '010120001234' })
    expect(run(GROUP, { command: 'addrecipient', name: 'Y', account: '010120001234' }).result).not.toBe(0)
  })
})
