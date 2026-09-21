/**
 * The mock backend: one handler per `SERVICE/command`, answered from `db.ts`.
 *
 * A handler receives exactly the payload `../commands.ts` would have sent the
 * core and returns exactly the envelope the core would have answered with —
 * `result: 0` on success, a non-zero `result` and a `message` on refusal.
 * Components cannot tell the difference, which is the point: swap `mockTransport`
 * for a real one and nothing above `client.ts` changes.
 *
 * Mutations write straight into the database and then `persist()` it.
 */

import type { User } from '../../../definition'
import type {
  Approval,
  Cheque,
  TransferDraft,
  Permission,
  TransactionInfo,
  TransferItem,
  TransferRequest,
} from '../types'
import { db, findGroup, nextId, persist, txTime, type MockAccount, type MockGroup } from './db'

type Params = Record<string, any>
type Handler = (params: Params) => Record<string, unknown>

const OK = { result: 0 }

function fail(message: string, result = 2) {
  return { result, message }
}

function me(): User {
  const database = db()
  return database.users[database.meId]
}

function member(group: MockGroup, userid: string): User {
  return { ...db().users[userid], role: group.members[userid] ?? 'MEMBER' }
}

function requireGroup(params: Params): MockGroup {
  const group = findGroup(params.onebankid)
  if (!group) throw new MockError('Group not found')
  return group
}

function findAccount(group: MockGroup, accountid: unknown): MockAccount {
  const account = group.accounts.find((candidate) => candidate.accountid === accountid)
  if (!account) throw new MockError('Account not found')
  return account
}

class MockError extends Error {}

/** Groups the logged-in user is a member of, in the shape `loadgroups` sends. */
function myGroups() {
  const meId = db().meId
  return db()
    .groups.filter((group) => group.members[meId])
    .map(({ onebankid, name, detail, color, logoname }) => ({ onebankid, name, detail, color, logoname, type: 'CORPORATE' }))
}

/** In the design's order: the bill services first, the transfer family after. */
const ALL_MENUS = [
  'PHONE',
  'ELECTRICITY',
  'WATER',
  'IBANKSLIP',
  'LEASING',
  'HISTORY',
  'TRANSFER',
  'ECHEQUE',
  'IBANKSALARY',
  'STATEMENT',
  'IBANKTRANFERIDCARD',
  'IBANKINTERNATIONALTRANSFER',
  'INSURANCE',
  'BILLPAYMENT',
  'ONEPAY',
  'INTERNET',
  'LANDTAX',
  'ROADTAX',
  'SMARTTAX',
  'QUEUE',
  'SECURITIES',
  'SWIFTTRANSFER',
  'TOPUPWALLET',
]

/** Everything a group's home needs, as `ONEBANKHOME/loadhome` returns it. */
function loadHome(group: MockGroup) {
  const meId = db().meId
  const users = Object.keys(group.members).map((userid) => member(group, userid))
  const role = group.members[meId]
  const viewOnly = group.permissions.some((permission) => permission.viewonly && permission.userids.includes(meId))
  return {
    ...OK,
    detail: { onebankid: group.onebankid, name: group.name, detail: group.detail, color: group.color, logoname: group.logoname },
    accounts: group.accounts,
    users,
    me: member(group, meId),
    widgets: ['USAGEDAILY', 'USAGESHARE', 'ACCOUNTBALANCES'],
    shortcutmenus: group.homemenus,
    usablemenus: role === 'OWNER' || role === 'ADMIN' ? ['*'] : viewOnly ? ['STATEMENT', 'HISTORY'] : ['*'],
    homemenus: group.homemenus.map((name, rank) => ({ name, rank, count: 0 })),
    allmenus: ALL_MENUS,
  }
}

// ------------------------------------------------------------ transactions

/**
 * Approvals a new transaction needs before it executes: the levels on the
 * maker's own roles, each counting all of its approvers or its stated minimum.
 */
function approvalsRequired(group: MockGroup, makerid: string): number {
  const mine = group.permissions.filter((permission) => permission.userids.includes(makerid) && !permission.viewonly)
  const levels = (mine.length ? mine : group.permissions).flatMap((permission) => permission.approverlevels ?? [])
  return levels.reduce(
    (sum, level) => sum + (level.mode === 'ATLEAST' ? Math.max(1, level.min ?? 1) : Math.max(1, level.userids?.length ?? 1)),
    0,
  )
}

/** The tightest per-transaction cap among the maker's roles, if any. */
function perTransactionLimit(group: MockGroup, makerid: string): number | undefined {
  const caps = group.permissions
    .filter((permission) => permission.userids.includes(makerid))
    .map((permission) => permission.limit?.pertransaction)
    .filter((cap): cap is number => typeof cap === 'number' && cap > 0)
  return caps.length ? Math.min(...caps) : undefined
}

/**
 * Decides what a transaction becomes once an approver has acted on it.
 *
 * This is the group's approval policy, and the one piece of business logic the
 * mock owns rather than merely stores. As written: a single rejection ends it,
 * and it executes once it has as many approvals as the group requires.
 * A stricter policy — approvals per *level*, in order, or the maker being
 * barred from approving their own transaction — belongs here.
 */
export function resolveApproval(tx: TransactionInfo): 'PENDING' | 'SUCCESS' | 'REJECTED' {
  const approvals = tx.approvals ?? []
  if (approvals.some((approval) => approval.decision === 'REJECTED')) return 'REJECTED'
  const approved = approvals.filter((approval) => approval.decision === 'APPROVED').length
  return approved >= (tx.requiredApprovals ?? 0) ? 'SUCCESS' : 'PENDING'
}

/** Moves the money and posts the inbox message for a transaction that just executed. */
function settle(group: MockGroup, tx: TransactionInfo): void {
  const account = group.accounts.find((candidate) => candidate.account === tx.account)
  if (account) {
    account.availablebalance += Number(tx.amount ?? 0)
    account.currentbalance += Number(tx.amount ?? 0)
  }
  notify(group, tx)
}

function notify(group: MockGroup, tx: TransactionInfo): void {
  db().messages.unshift({
    messageid: `M${nextId()}`,
    onebankid: group.onebankid,
    time: txTime(new Date()),
    title: String(tx.service ?? 'Transfer'),
    transactionid: String(tx.transactionid),
    account: tx.account ?? '',
    accountname: String(tx.detail?.TOACCOUNTNAME ?? ''),
    toaccount: String(tx.detail?.TOACCOUNTNO ?? ''),
    amount: Number(tx.amount ?? 0),
    ccy: tx.ccy ?? 'LAK',
    service: String(tx.service ?? ''),
    status: String(tx.status),
    maker: String(tx.makername ?? ''),
    usertype: tx.makerid === db().meId ? 'MAKER' : 'CHECKER',
    read: false,
  })
}

/** Records a new outgoing transaction; executes it at once when nobody need approve. */
function submit(group: MockGroup, from: MockAccount, service: string, item: TransferItem, schedule?: string): TransactionInfo {
  if (from.status === 'LOCKED') throw new MockError('This account is locked')
  if (from.viewonly) throw new MockError('This account is view-only')
  if (!(item.amount > 0)) throw new MockError('Enter an amount')
  if (item.amount > from.availablebalance) throw new MockError('Insufficient balance')

  const user = me()
  const cap = perTransactionLimit(group, user.userid)
  if (cap !== undefined && item.amount > cap) throw new MockError(`Over your per-transaction limit of ${cap.toLocaleString('en-US')}`)
  const tx: TransactionInfo = {
    transactionid: nextId(),
    onebankid: group.onebankid,
    txtime: txTime(new Date()),
    amount: -item.amount,
    ccy: from.ccy,
    service,
    type: 'DEBIT',
    account: from.account,
    accountname: from.alias || from.name,
    makername: user.name,
    makerid: user.userid,
    status: 'PENDING',
    ticket: `${Date.now()}`.slice(-10),
    detail: {
      AMOUNT: `${item.amount}`,
      CCY: from.ccy,
      DESCRIPTION: item.note || service,
      TOACCOUNTNAME: item.toname,
      TOACCOUNTNO: item.toaccount,
      BANK: item.bank ?? 'BCEL',
    },
    approvals: [],
    requiredApprovals: approvalsRequired(group, user.userid),
    scheduledfor: schedule,
  }
  group.transactions.unshift(tx)

  tx.status = resolveApproval(tx)
  if (tx.status === 'SUCCESS' && !schedule) settle(group, tx)
  else notify(group, tx)
  return tx
}

function decide(params: Params, decision: Approval['decision'], actor: User = me()) {
  const group = requireGroup(params)
  const tx = group.transactions.find((candidate) => String(candidate.transactionid) === String(params.transactionid))
  if (!tx) return fail('Transaction not found')
  if (tx.status !== 'PENDING') return fail('This transaction is no longer pending')
  const user = actor
  if ((tx.approvals ?? []).some((approval) => approval.userid === user.userid)) return fail('You have already decided on this')

  tx.approvals = [
    ...(tx.approvals ?? []),
    {
      userid: user.userid,
      name: user.name,
      decision,
      time: txTime(new Date()),
      level: (tx.approvals?.length ?? 0) + 1,
      reason: decision === 'REJECTED' ? String(params.reason ?? '') : undefined,
    },
  ]
  tx.status = resolveApproval(tx)
  if (tx.status === 'SUCCESS') settle(group, tx)
  else if (tx.status === 'REJECTED') notify(group, tx)
  return { ...OK, item: tx }
}

// ----------------------------------------------------------------- handlers

const handlers: Record<string, Handler> = {
  // ---- login
  'USER/login': (params) => {
    if (!params.email || !params.password) return fail('Enter your username and password')
    return { ...OK, data: loginPayload() }
  },
  'ONEBANK/getdesktoplogintoken': () => ({
    ...OK,
    logintoken: `LT-${Date.now().toString(36)}`,
    servertime: Date.now(),
    devicenumber: `${10 + Math.floor(Math.random() * 89)}`,
  }),
  'USER/authen': () => ({ ...OK, data: loginPayload() }),

  // ---- home
  'ONEBANKHOME/loadhome': (params) => loadHome(requireGroup(params)),
  'ONEBANKHOME/savehomemenus': (params) => {
    const group = requireGroup(params)
    group.homemenus = (params.menus as Array<string | { name: string }>).map((menu) => (typeof menu === 'string' ? menu : menu.name))
    return OK
  },
  'ONEBANKHOME/loadwidget': (params) => {
    const group = requireGroup(params)
    if (params.widget === 'ACCOUNTBALANCES') {
      return {
        ...OK,
        balances: group.accounts.map((account) => ({
          account: account.account,
          ccy: account.ccy,
          name: account.alias || account.name,
          currentbalance: account.currentbalance,
          availablebalance: account.availablebalance,
        })),
      }
    }
    const account = findAccount(group, params.accountid)
    const settled = group.transactions.filter((tx) => tx.account === account.account && tx.status === 'SUCCESS')
    if (params.widget === 'USAGEDAILY') {
      const byDate = new Map<string, { date: string; ccy: string; debit: number; credit: number }>()
      for (const tx of settled) {
        const date = String(tx.txtime).slice(0, 10)
        const entry = byDate.get(date) ?? { date, ccy: account.ccy, debit: 0, credit: 0 }
        const amount = Number(tx.amount)
        if (amount < 0) entry.debit += -amount
        else entry.credit += amount
        byDate.set(date, entry)
      }
      return { ...OK, items: [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date)) }
    }
    const byType = new Map<string, number>()
    for (const tx of settled) {
      if (Number(tx.amount) >= 0) continue
      const type = String(tx.detail?.MERCHANTNAME ?? tx.service ?? 'Other')
      byType.set(type, (byType.get(type) ?? 0) - Number(tx.amount))
    }
    return { ...OK, items: [...byType].map(([type, amount]) => ({ type, amount })) }
  },

  // ---- groups
  'ONEBANKGROUP/loadgroups': () => ({ ...OK, groups: myGroups() }),
  'ONEBANKGROUP/creategroup': (params) => {
    const database = db()
    const picked = database.personalAccounts.filter((account) => (params.accounts as string[]).includes(account.accountid))
    if (picked.length === 0) return fail('Choose at least one account')
    const onebankid = `G${nextId()}`
    database.groups.push({
      onebankid,
      name: String(params.name || 'OneBank'),
      detail: String(params.detail ?? ''),
      color: '#DD2319',
      logoname: String(params.logoname ?? ''),
      members: { [database.meId]: 'OWNER' },
      accounts: picked.map((account) => ({ ...account, accountid: `${account.accountid}-${onebankid}` })),
      permissions: [],
      homemenus: ['TRANSFER', 'STATEMENT', 'ECHEQUE'],
      transactions: [],
      joinCode: `JG-${nextId()}`,
    })
    return { ...OK, onebankid }
  },
  'ONEBANKGROUP/joingrouprequest': () => {
    // A real owner would type this code into "add member". The demo has no
    // other person, so the join page offers to play the owner, and the code
    // is tied to the one group the user is not in yet.
    const database = db()
    if (!database.pendingJoin) database.pendingJoin = { code: `${14391660 + (nextId() % 800000)}`, onebankid: 'G4' }
    return { ...OK, joingroupid: database.pendingJoin.code }
  },
  'ONEBANKGROUP/joingroup': (params) => {
    const code = String(params.code ?? '').trim().toUpperCase()
    const pending = db().pendingJoin
    const group =
      pending && pending.code === code
        ? findGroup(pending.onebankid)
        : db().groups.find((candidate) => candidate.joinCode === code)
    if (pending?.code === code) db().pendingJoin = undefined
    if (!group) return fail('That code does not match any group')
    const meId = db().meId
    if (group.members[meId]) return fail('You are already in this group')
    group.members[meId] = 'MEMBER'
    return { ...OK, onebankid: group.onebankid }
  },
  'ONEBANKGROUP/leavegroup': (params) => {
    const group = requireGroup(params)
    const meId = db().meId
    const owners = Object.entries(group.members).filter(([, role]) => role === 'OWNER')
    if (group.members[meId] === 'OWNER' && owners.length === 1 && Object.keys(group.members).length > 1) {
      return fail('Hand ownership to another member before leaving')
    }
    delete group.members[meId]
    return OK
  },
  'ONEBANKGROUP/changegroupdetail': (params) => {
    const group = requireGroup(params)
    group.name = String(params.name ?? group.name)
    group.detail = String(params.detail ?? group.detail)
    group.color = String(params.color ?? group.color)
    group.logoname = String(params.logoname ?? group.logoname)
    return OK
  },
  'ONEBANKGROUP/changeaccounts': (params) => {
    const group = requireGroup(params)
    for (const change of params.accounts as Array<{ accountid: string; action: 'add' | 'remove' }>) {
      if (change.action === 'remove') {
        group.accounts = group.accounts.filter((account) => account.accountid !== change.accountid)
      } else {
        const source = db().personalAccounts.find((account) => account.accountid === change.accountid)
        if (source && !group.accounts.some((account) => account.account === source.account)) group.accounts.push({ ...source })
      }
    }
    return OK
  },
  'ONEBANKGROUP/changeaccountstatus': (params) => {
    const group = requireGroup(params)
    for (const change of params.accounts as Array<{ accountid: string; status: string }>) {
      findAccount(group, change.accountid).status = change.status
    }
    return OK
  },
  'ONEBANKGROUP/changeaccountalias': (params) => {
    findAccount(requireGroup(params), params.accountid).alias = params.alias ?? ''
    return OK
  },
  'ONEBANKGROUP/getavailableaccounts': (params) => {
    const group = requireGroup(params)
    const held = new Set(group.accounts.map((account) => account.account))
    return { ...OK, accounts: db().personalAccounts.filter((account) => !held.has(account.account)).map((account) => account.accountid) }
  },
  'ONEBANKGROUP/addmemberenquiry': (params) => {
    const userid = db().memberCodes[String(params.joingroupid ?? '').trim()]
    if (!userid) return fail('No user has that member code')
    return { ...OK, user: db().users[userid] }
  },
  'ONEBANKGROUP/addmember': (params) => {
    const group = requireGroup(params)
    const userid = db().memberCodes[String(params.joingroupid ?? '').trim()]
    if (!userid) return fail('No user has that member code')
    if (group.members[userid]) return fail('Already a member of this group')
    group.members[userid] = 'MEMBER'
    if (params.permissionid !== undefined) {
      const permission = group.permissions.find((candidate) => candidate.permissionid === Number(params.permissionid))
      if (permission && !permission.userids.includes(userid)) permission.userids.push(userid)
    }
    return OK
  },
  'ONEBANKGROUP/removemember': (params) => {
    const group = requireGroup(params)
    if (group.members[params.removeuserid] === 'OWNER') return fail('The owner cannot be removed')
    delete group.members[params.removeuserid]
    for (const permission of group.permissions) {
      permission.userids = permission.userids.filter((userid) => userid !== params.removeuserid)
    }
    return OK
  },
  'ONEBANKGROUP/changememberrole': (params) => {
    const group = requireGroup(params)
    if (!group.members[params.userid]) return fail('Not a member of this group')
    group.members[params.userid] = params.role
    return OK
  },
  'ONEBANKGROUP/getpermissions': (params) => ({ ...OK, permissions: requireGroup(params).permissions }),
  'ONEBANKGROUP/savepermission': (params) => {
    const group = requireGroup(params)
    const incoming = params.permission as Permission
    if (incoming.permissionid) {
      group.permissions = group.permissions.map((permission) => (permission.permissionid === incoming.permissionid ? incoming : permission))
      return { ...OK, permission: incoming }
    }
    const created = { ...incoming, permissionid: nextId() }
    group.permissions.push(created)
    return { ...OK, permission: created }
  },
  'ONEBANKGROUP/removepermission': (params) => {
    const group = requireGroup(params)
    group.permissions = group.permissions.filter((permission) => permission.permissionid !== Number(params.permissionid))
    return OK
  },
  'ONEBANKGROUP/getrecipients': () => ({ ...OK, recipients: db().recipients }),
  'ONEBANKGROUP/togglefavourite': (params) => {
    const recipient = db().recipients.find((candidate) => candidate.recipientid === params.recipientid)
    if (recipient) recipient.favourite = !recipient.favourite
    return OK
  },
  'ONEBANKGROUP/lookupaccount': (params) => {
    const number = String(params.account ?? '').replace(/\D/g, '')
    if (number.length < 8) return fail('Enter a full account number')
    const known = db().recipients.find((recipient) => recipient.account === number)
    const names = ['NARIN DJ', 'ABCD EFGH', 'SOMPHONE INTHAVONG', 'NOY CHANTHAVONG']
    return { ...OK, name: known?.name ?? names[Number(number.slice(-2)) % names.length], ccy: known?.ccy ?? 'LAK' }
  },

  // ---- ONEBANK
  'ONEBANK/opennewaccount': (params) => {
    const group = findGroup(params.onebankid) ?? findGroup(myGroups()[0]?.onebankid)
    if (!group) return fail('Group not found')
    const source = db().personalAccounts.find((account) => account.accountid === params.accountid) ?? group.accounts[0]
    const id = nextId()
    group.accounts.push({
      ...source,
      accountid: `${params.accountType === 'SHADOW' ? 'S' : 'V'}${id}`,
      account: params.accountType === 'SHADOW' ? `SHA0000000000${id}` : `${source.account.slice(0, 12)}${id}`,
      type: params.accountType,
      alias: String(params.alias ?? ''),
      availablebalance: params.accountType === 'SHADOW' ? 0 : source.availablebalance,
      currentbalance: params.accountType === 'SHADOW' ? 0 : source.currentbalance,
      status: 'ACTIVE',
    })
    return OK
  },

  // ---- transactions
  'ONEBANKTRANSACTION/viewtransactions': (params) => ({ ...OK, items: requireGroup(params).transactions }),
  'ONEBANKTRANSACTION/getpendingapprovals': (params) => ({
    ...OK,
    items: requireGroup(params).transactions.filter((tx) => tx.status === 'PENDING'),
  }),
  'ONEBANKTRANSACTION/getapprovaldetail': (params) => {
    const tx = requireGroup(params).transactions.find((candidate) => String(candidate.transactionid) === String(params.transactionid))
    if (!tx) return fail('Transaction not found')
    return { ...OK, item: tx, approvers: tx.approvals ?? [] }
  },
  'ONEBANKTRANSACTION/approvetransaction': (params) => decide(params, 'APPROVED'),
  /**
   * Demo only: another approver says yes. A transaction the user made waits on
   * someone else, and a demo has no one else — this plays the next approver
   * named on the maker's role (or any other member).
   */
  'ONEBANKTRANSACTION/simulateapproval': (params) => {
    const group = requireGroup(params)
    const tx = group.transactions.find((candidate) => String(candidate.transactionid) === String(params.transactionid))
    if (!tx) return fail('Transaction not found')
    const decided = new Set((tx.approvals ?? []).map((approval) => approval.userid))
    const named = group.permissions
      .filter((permission) => permission.userids.includes(String(tx.makerid)))
      .flatMap((permission) => permission.approverlevels ?? [])
      .flatMap((level) => level.userids)
    const candidates = [...named, ...Object.keys(group.members)]
    const approver = candidates.find((userid) => userid !== tx.makerid && !decided.has(userid))
    if (!approver) return fail('There is no one else in the group to approve it')
    return decide(params, 'APPROVED', member(group, approver))
  },
  'ONEBANKTRANSACTION/rejecttransaction': (params) => {
    if (!String(params.reason ?? '').trim()) return fail('Give a reason for rejecting')
    return decide(params, 'REJECTED')
  },
  'ONEBANKTRANSACTION/canceltransaction': (params) => {
    const group = requireGroup(params)
    const tx = group.transactions.find((candidate) => String(candidate.transactionid) === String(params.transactionid))
    if (!tx) return fail('Transaction not found')
    if (tx.makerid !== db().meId) return fail('Only the person who made it can cancel it')
    if (tx.status !== 'PENDING') return fail('This transaction is no longer pending')
    tx.status = 'CANCELLED'
    notify(group, tx)
    return { ...OK, item: tx }
  },
  'ONEBANKTRANSACTION/archivetransaction': (params) => {
    const tx = requireGroup(params).transactions.find((candidate) => String(candidate.transactionid) === String(params.transactionid))
    if (!tx) return fail('Transaction not found')
    tx.archived = true
    return { ...OK, item: tx }
  },
  'ONEBANKTRANSACTION/getstatement': (params) => {
    const group = requireGroup(params)
    const account = findAccount(group, params.accountid)
    const from = String(params.from ?? '')
    const to = String(params.to ?? '')
    const items = group.transactions.filter((tx) => {
      if (tx.account !== account.account || tx.status !== 'SUCCESS') return false
      const day = String(tx.txtime).slice(0, 10)
      return (!from || day >= from) && (!to || day <= to)
    })
    return { ...OK, items, balance: account.availablebalance, ccy: account.ccy }
  },
  'ONEBANKTRANSACTION/submittransfer': (params) => {
    const request = params as unknown as TransferRequest & Params
    const group = requireGroup(params)
    const from = findAccount(group, request.fromaccountid)
    if (!request.items?.length) return fail('Add at least one recipient')
    const total = request.items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    if (total > from.availablebalance) return fail('Insufficient balance')
    const service = request.kind === 'SALARY' ? 'SALARY' : request.kind === 'INTERBANK' ? 'INTERBANK' : 'TRANSFER'
    // International and ID-card transfers carry a fee, added to what leaves the account.
    const fee = (item: TransferItem) =>
      request.kind === 'INTERBANK' ? (item.feebearer === 'SHARED' ? 10 : 25) : request.kind === 'IDCARD' ? 15_000 : 0
    const items = request.items.map((item) =>
      submit(group, from, service, { ...item, amount: Number(item.amount) + fee(item) }, request.schedule),
    )
    return { ...OK, item: items[0], items }
  },
  'ONEBANKTRANSACTION/getbillers': () => ({ ...OK, billers: db().billers }),
  'ONEBANKTRANSACTION/lookupbill': (params) => {
    const customerno = String(params.customerno ?? '').trim()
    if (customerno.length < 4) return fail('Enter a valid customer number')
    const seed = [...customerno].reduce((sum, char) => sum + char.charCodeAt(0), 0)
    const names = ['KHAMPHOU SOUVANNAVONG', 'NOY CHANTHAVONG', 'BOUNMY SIHALATH', 'PHOUVONG TRADING']
    const now = new Date()
    return {
      ...OK,
      customername: names[seed % names.length],
      address: 'ບ້ານ ໂພນສີນວນ, ເມືອງ ສີສັດຕະນາກ, ນະຄອນຫຼວງວຽງຈັນ',
      amountdue: (seed % 40) * 12_500 + 85_000,
      period: `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
    }
  },
  'ONEBANKTRANSACTION/paybill': (params) => {
    const group = requireGroup(params)
    const biller = db().billers.find((candidate) => candidate.billerid === params.billerid)
    if (!biller) return fail('Unknown biller')
    const from = findAccount(group, params.fromaccountid)
    const item = submit(
      group,
      from,
      biller.kind === 'PHONE' ? 'TOPUP' : biller.kind,
      { toaccount: String(params.customerno), toname: biller.name, amount: Number(params.amount), ccy: from.ccy, note: biller.name },
    )
    return { ...OK, item }
  },
  'ONEBANKTRANSACTION/getcheques': (params) => {
    const group = requireGroup(params)
    const books = db().chequeBooks.filter((book) => book.onebankid === group.onebankid)
    return {
      ...OK,
      cheques: db().cheques.filter((cheque) => cheque.onebankid === group.onebankid),
      remaining: books.reduce((sum, book) => sum + book.total - book.used, 0),
    }
  },
  'ONEBANKTRANSACTION/getchequebooks': (params) => {
    const group = requireGroup(params)
    return { ...OK, books: db().chequeBooks.filter((book) => book.onebankid === group.onebankid) }
  },
  'ONEBANKTRANSACTION/buychequebook': (params) => {
    const group = requireGroup(params)
    const account = findAccount(group, params.accountid)
    const FEE = 50_000
    if (account.ccy === 'LAK' && account.availablebalance < FEE) return fail('Insufficient balance for the cheque book fee')
    if (account.ccy === 'LAK') {
      account.availablebalance -= FEE
      account.currentbalance -= FEE
    }
    const numbers = db().chequeBooks.map((book) => Number(book.number))
    const book = {
      bookid: `BK${nextId()}`,
      onebankid: group.onebankid,
      number: `${Math.max(12344, ...numbers) + 1}`,
      accountid: account.accountid,
      boughtat: txTime(new Date()),
      used: 0,
      total: 30,
    }
    db().chequeBooks.unshift(book)
    return { ...OK, book }
  },
  'ONEBANKTRANSACTION/getdrafts': (params) => {
    const group = requireGroup(params)
    return { ...OK, drafts: db().drafts.filter((draft) => draft.onebankid === group.onebankid) }
  },
  'ONEBANKTRANSACTION/savedraft': (params) => {
    const group = requireGroup(params)
    const incoming = params.draft as TransferDraft
    const draft: TransferDraft = {
      ...incoming,
      draftid: incoming.draftid || `D${nextId()}`,
      onebankid: group.onebankid,
      savedat: txTime(new Date()),
    }
    db().drafts = [draft, ...db().drafts.filter((existing) => existing.draftid !== draft.draftid)]
    return { ...OK, draft }
  },
  'ONEBANKTRANSACTION/deletedraft': (params) => {
    db().drafts = db().drafts.filter((draft) => draft.draftid !== params.draftid)
    return OK
  },
  'ONEBANKTRANSACTION/createcheque': (params) => {
    const group = requireGroup(params)
    const account = findAccount(group, params.accountid)
    if (!String(params.payee ?? '').trim()) return fail('Enter who the cheque is for')
    if (!(Number(params.amount) > 0)) return fail('Enter an amount')
    const book = db().chequeBooks.find((candidate) =>
      params.bookid ? candidate.bookid === params.bookid : candidate.accountid === account.accountid && candidate.used < candidate.total,
    )
    if (!book) return fail('Buy a cheque book for this account first')
    if (book.used >= book.total) return fail('This cheque book is used up')
    if (params.blockfunds && Number(params.amount) > account.availablebalance) return fail('Insufficient balance to hold for this cheque')
    book.used += 1
    if (params.blockfunds) account.availablebalance -= Number(params.amount)
    const numbers = db().cheques.map((cheque) => Number(cheque.number))
    const cheque: Cheque = {
      chequeid: `CQ${nextId()}`,
      onebankid: group.onebankid,
      number: `${Math.max(12344, ...numbers) + 1}`,
      accountid: account.accountid,
      payee: String(params.payee),
      amount: Number(params.amount),
      ccy: account.ccy,
      issuedate: txTime(new Date()),
      duedate: String(params.duedate),
      memo: String(params.memo ?? ''),
      status: 'ISSUED',
      kind: params.kind === 'ACCOUNT' ? 'ACCOUNT' : 'CASH',
      payeeaccount: params.payeeaccount ? String(params.payeeaccount) : undefined,
      blockfunds: Boolean(params.blockfunds),
      direction: 'ISSUED',
      bookid: book.bookid,
    }
    db().cheques.unshift(cheque)
    return { ...OK, cheque }
  },
  'ONEBANKTRANSACTION/cancelcheque': (params) => {
    const cheque = db().cheques.find((candidate) => candidate.chequeid === params.chequeid)
    if (!cheque) return fail('Cheque not found')
    if (cheque.status !== 'ISSUED') return fail('Only an issued cheque can be cancelled')
    cheque.status = 'CANCELLED'
    if (cheque.blockfunds) {
      const group = findGroup(cheque.onebankid)
      const account = group?.accounts.find((candidate) => candidate.accountid === cheque.accountid)
      if (account) account.availablebalance += cheque.amount
    }
    return OK
  },

  // ---- messages
  'ONEBANKMESSAGE/getmessages': (params) => {
    const group = requireGroup(params)
    return { ...OK, messages: db().messages.filter((message) => message.onebankid === group.onebankid) }
  },
  'ONEBANKMESSAGE/readmessage': (params) => {
    const message = db().messages.find((candidate) => candidate.messageid === params.messageid)
    if (message) message.read = true
    return OK
  },
}

/** What a successful login returns: the user, their cards and their groups. */
export function loginPayload() {
  const database = db()
  const user = me()
  return {
    name: user.name,
    unreadcount: database.messages.filter((message) => !message.read).length,
    USER: {
      idverified: 'Y',
      userid: user.userid,
      name: user.name,
      cards: [
        {
          cardid: 'C1',
          cardtype: 'DEBIT',
          cardname: 'BCEL Mastercard Prepaid',
          cardnumber: '5288 xxxx xxxx 1234',
          filename: 'cc_Mastercard-Prepaid.png',
          accounts: database.personalAccounts,
        },
      ],
    },
    ONEBANK: { groups: myGroups() },
  }
}

const READ_ONLY = /\/(load|get|view|lookup)/

/** Answers one request. Unknown commands fail loudly rather than returning nothing. */
export function handle(service: string, data: Record<string, unknown>): Record<string, unknown> {
  const key = `${service}/${String(data.command)}`
  const handler = handlers[key]
  if (!handler) return fail(`The mock backend has no handler for ${key}`, 404)
  try {
    const response = handler(data)
    if (!READ_ONLY.test(key)) persist()
    // A deep copy, so a component mutating what it was given cannot reach into
    // the database — the same isolation a real network round trip gives.
    return structuredClone(response)
  } catch (error) {
    if (error instanceof MockError) return fail(error.message)
    throw error
  }
}

export type { TransactionInfo }
