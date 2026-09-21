/**
 * The mock backend answers the real command functions, so these exercise
 * `commands.ts` end to end: what a component sends is what gets handled.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { setTransport } from '../client'
import {
  addMember,
  approveTransaction,
  changeAccountStatus,
  createGroup,
  getPendingApprovals,
  getStatement,
  joinGroup,
  leaveGroup,
  loadGroups,
  loadHome,
  loadWidget,
  lookupAccount,
  payBill,
  rejectTransaction,
  submitTransfer,
} from '../commands'
import { resetMockDb } from './db'
import { resolveApproval } from './handlers'

beforeEach(() => {
  sessionStorage.clear()
  setTransport(null)
  resetMockDb(new Date(2026, 8, 21, 12, 0, 0))
})

describe('home', () => {
  it('loads a group with its accounts, members and menus', async () => {
    const home = await loadHome('G1')
    expect(home.result).toBe(0)
    expect(home.detail?.onebankid).toBe('G1')
    expect(home.accounts?.length).toBeGreaterThan(0)
    expect(home.me?.role).toBe('OWNER')
    expect(home.allmenus).toContain('TRANSFER')
  })

  it('answers every widget', async () => {
    const balances = await loadWidget('ACCOUNTBALANCES', undefined, 'G1')
    expect(balances.balances?.length).toBeGreaterThan(0)
    const daily = await loadWidget('USAGEDAILY', 'A1', 'G1')
    expect(daily.items?.length).toBeGreaterThan(0)
  })

  it('refuses an unknown group rather than inventing one', async () => {
    const home = await loadHome('NOPE')
    expect(home.result).not.toBe(0)
  })
})

describe('groups', () => {
  it('lists only groups the user belongs to', async () => {
    const { groups } = await loadGroups()
    expect(groups.map((group) => group.onebankid)).toEqual(['G1', 'G2', 'G3'])
  })

  it('joins by code, creates, and leaves', async () => {
    expect((await joinGroup('jg-5050')).onebankid).toBe('G4')
    const created = await createGroup(['P1'], { name: 'New shop' })
    expect(created.result).toBe(0)
    expect((await loadGroups()).groups.map((group) => group.name)).toContain('New shop')
    await leaveGroup('G4')
    expect((await loadGroups()).groups.map((group) => group.onebankid)).not.toContain('G4')
  })

  it('adds a member by their code', async () => {
    expect((await addMember('2045', undefined, 'G1')).result).toBe(0)
    const home = await loadHome('G1')
    expect(home.users?.map((user) => user.userid)).toContain('U9')
    expect((await addMember('0000', undefined, 'G1')).result).not.toBe(0)
  })
})

describe('money movement', () => {
  it('holds a transfer for approval in a group that requires it, then settles it', async () => {
    const before = (await loadHome('G1')).accounts!.find((account) => account.accountid === 'A1')!.availablebalance!
    const sent = await submitTransfer(
      { kind: 'BCEL', fromaccountid: 'A1', items: [{ toaccount: '010120000345678901', toname: 'ABCD EFGH', amount: 1000, ccy: 'LAK' }] },
      'G1',
    )
    expect(sent.item?.status).toBe('PENDING')
    expect((await getPendingApprovals('G1')).items?.map((tx) => tx.transactionid)).toContain(sent.item?.transactionid)

    const approved = await approveTransaction(sent.item!.transactionid!, 'G1')
    expect(approved.item?.status).toBe('SUCCESS')
    const after = (await loadHome('G1')).accounts!.find((account) => account.accountid === 'A1')!.availablebalance!
    expect(after).toBe(before - 1000)
  })

  it('executes at once in a group with no approvers', async () => {
    const sent = await submitTransfer(
      { kind: 'BCEL', fromaccountid: 'B1', items: [{ toaccount: '010120000345678901', toname: 'X', amount: 500, ccy: 'LAK' }] },
      'G2',
    )
    expect(sent.item?.status).toBe('SUCCESS')
    const statement = await getStatement('B1', undefined, undefined, 'G2')
    expect(statement.items?.[0]?.transactionid).toBe(sent.item?.transactionid)
  })

  it('needs a reason to reject, and a rejection ends it', async () => {
    const pending = (await getPendingApprovals('G1')).items![0]
    expect((await rejectTransaction(pending.transactionid!, '  ', 'G1')).result).not.toBe(0)
    expect((await rejectTransaction(pending.transactionid!, 'Wrong account', 'G1')).item?.status).toBe('REJECTED')
  })

  it('refuses more than the balance, and a locked account', async () => {
    const tooMuch = await submitTransfer(
      { kind: 'BCEL', fromaccountid: 'A2', items: [{ toaccount: '1', toname: 'X', amount: 10 ** 12, ccy: 'LAK' }] },
      'G1',
    )
    expect(tooMuch.result).not.toBe(0)
    await changeAccountStatus([{ accountid: 'A1', status: 'LOCKED' }], 'G1')
    const locked = await payBill({ billerid: 'EDL', customerno: '12345', amount: 1000, fromaccountid: 'A1' }, 'G1')
    expect(locked.result).not.toBe(0)
  })

  it('names the owner of a destination account', async () => {
    expect((await lookupAccount('010120000345678901')).name).toBe('ABCD EFGH')
  })
})

describe('resolveApproval', () => {
  it('waits until enough approvals arrive', () => {
    const approval = { userid: 'U2', name: 'x', decision: 'APPROVED' as const, time: '', level: 1 }
    expect(resolveApproval({ requiredApprovals: 2, approvals: [approval] })).toBe('PENDING')
    expect(resolveApproval({ requiredApprovals: 2, approvals: [approval, { ...approval, userid: 'U3' }] })).toBe('SUCCESS')
  })

  it('lets one rejection end it', () => {
    const rejection = { userid: 'U2', name: 'x', decision: 'REJECTED' as const, time: '', level: 1 }
    expect(resolveApproval({ requiredApprovals: 1, approvals: [rejection] })).toBe('REJECTED')
  })
})
