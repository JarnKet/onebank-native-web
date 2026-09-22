/**
 * The local answers themselves (`./handlers.ts`): the rules a screen relies on
 * when the core cannot take the command.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { currentGroup, onebankGroups } from '../../../stores/onebankGroups'
import { loginData } from '../../../stores/session'
import { handleLocally, rememberTransactions } from './handlers'
import { resetLocalData } from './index'

const G = 'G-1'
const T = 'ONEBANKTRANSACTION'

function run(service: string, data: Record<string, unknown>): any {
  return handleLocally(service, { onebankid: G, ...data })
}

beforeEach(() => {
  resetLocalData()
  currentGroup.set(G)
  loginData.set({ USER: { userid: 'U1', name: 'ME' } } as any)
  onebankGroups.set({
    [G]: {
      isFinishLoad: true,
      loadHomeResult: {
        accounts: [
          { accountid: 'A1', account: '0101', ccy: 'LAK', name: 'ACME', alias: '', type: 'SAVING', viewonly: 0, status: 'ACTIVE', availablebalance: 5000 },
          { accountid: 'A2', account: '0102', ccy: 'LAK', name: 'LOCKED', alias: '', type: 'SAVING', viewonly: 0, status: 'LOCKED' },
        ],
        me: { userid: 'U1', name: 'ME' },
      } as any,
    },
  })
})

describe('transfers', () => {
  it('refuses more than the balance, when the core sent one', () => {
    const response = run(T, { command: 'submittransfer', kind: 'BCEL', fromaccountid: 'A1', items: [{ toaccount: '0199', toname: 'X', amount: 9000, ccy: 'LAK' }] })
    expect(response.result).not.toBe(0)
  })

  it('refuses a locked account', () => {
    const response = run(T, { command: 'submittransfer', kind: 'BCEL', fromaccountid: 'A2', items: [{ toaccount: '0199', toname: 'X', amount: 10, ccy: 'LAK' }] })
    expect(response.message).toMatch(/locked/i)
  })

  it('remembers who was paid, for the next transfer', () => {
    run(T, { command: 'submittransfer', kind: 'BCEL', fromaccountid: 'A1', items: [{ toaccount: '01020304', toname: 'PAYEE', amount: 10, ccy: 'LAK' }] })
    expect(run('ONEBANKGROUP', { command: 'getrecipients' }).recipients[0].name).toBe('PAYEE')
  })
})

describe('approvals', () => {
  beforeEach(() => rememberTransactions(G, [{ transactionid: 9, status: 'PENDING', makerid: 'U2' }]))

  it('needs a reason to reject', () => {
    expect(run(T, { command: 'rejecttransaction', transactionid: 9, reason: ' ' }).result).not.toBe(0)
    expect(run(T, { command: 'rejecttransaction', transactionid: 9, reason: 'Wrong payee' }).item.status).toBe('REJECTED')
  })

  it('lets only the maker cancel', () => {
    expect(run(T, { command: 'canceltransaction', transactionid: 9 }).result).not.toBe(0)
  })

  it('refuses a second decision by the same person', () => {
    run(T, { command: 'rejecttransaction', transactionid: 9, reason: 'No' })
    expect(run(T, { command: 'approvetransaction', transactionid: 9 }).result).not.toBe(0)
  })
})

describe('cheques', () => {
  it('needs a cheque book first, then uses one leaf per cheque', () => {
    const cheque = { command: 'createcheque', accountid: 'A1', payee: 'PAYEE', amount: 100, duedate: '2026-10-01', memo: '' }
    expect(run(T, cheque).result).not.toBe(0)

    run(T, { command: 'buychequebook', accountid: 'A1' })
    expect(run(T, cheque).result).toBe(0)
    expect(run(T, { command: 'getcheques' }).remaining).toBe(29)
  })
})

describe('bills', () => {
  it('pays a biller it knows, and records the payment', () => {
    expect(run(T, { command: 'paybill', billerid: 'EDL', customerno: '12345678', amount: 100, fromaccountid: 'A1' }).result).toBe(0)
    expect(run(T, { command: 'paybill', billerid: 'NOPE', customerno: '1', amount: 1, fromaccountid: 'A1' }).result).not.toBe(0)
  })
})

describe('drafts', () => {
  it('saves, lists and deletes', () => {
    const { draft } = run(T, { command: 'savedraft', draft: { name: 'Rent', kind: 'BCEL', fromaccountid: 'A1', items: [] } })
    expect(run(T, { command: 'getdrafts' }).drafts).toHaveLength(1)
    run(T, { command: 'deletedraft', draftid: draft.draftid })
    expect(run(T, { command: 'getdrafts' }).drafts).toHaveLength(0)
  })
})

describe('isolation', () => {
  it('hands out copies, so a screen cannot edit the store through a response', () => {
    run(T, { command: 'savedraft', draft: { name: 'Rent', kind: 'BCEL', fromaccountid: 'A1', items: [] } })
    run(T, { command: 'getdrafts' }).drafts[0].name = 'changed'
    expect(run(T, { command: 'getdrafts' }).drafts[0].name).toBe('Rent')
  })

  it('declines a command it has no answer for', () => {
    expect(run(T, { command: 'nosuchcommand' }).result).toBe(404)
  })
})
