/**
 * The mock backend's data: everything the app would otherwise read from the core.
 *
 * This app no longer talks to BCEL One. Every command in `../commands.ts` is
 * answered by `handlers.ts` against the database built here, so the whole UI is
 * usable offline and in a demo. The shapes are the wire types from `../types.ts`
 * — nothing here is a view model — which is what lets a real transport replace
 * this one later without touching a component.
 *
 * Dates are generated relative to "now", so the statement, the calendar and
 * the pending list always look current. The generator is seeded, so the same
 * day produces the same data and a reload does not reshuffle the screen.
 *
 * State survives a reload through sessionStorage (one tab, gone on logout),
 * which makes a transfer you just submitted still be there after F5.
 */

import type { Account, User } from '../../../definition'
import type {
  Approval,
  Biller,
  Cheque,
  Message,
  Permission,
  ChequeBook,
  Recipient,
  TransactionInfo,
  TransferDraft,
} from '../types'

export interface MockAccount extends Account {
  availablebalance: number
  currentbalance: number
}

export interface MockGroup {
  onebankid: string
  name: string
  detail: string
  color: string
  logoname: string
  /** userid -> role within this group. */
  members: Record<string, 'OWNER' | 'ADMIN' | 'MEMBER'>
  accounts: MockAccount[]
  permissions: Permission[]
  homemenus: string[]
  transactions: TransactionInfo[]
  /** Outstanding invitation codes a member can be added with. */
  joinCode: string
}

export interface MockDb {
  meId: string
  users: Record<string, User>
  /** Codes a user shows to be added to a group, -> userid. */
  memberCodes: Record<string, string>
  groups: MockGroup[]
  /** The logged-in user's own accounts, which a group can be given. */
  personalAccounts: MockAccount[]
  messages: Message[]
  cheques: Cheque[]
  chequeBooks: ChequeBook[]
  drafts: TransferDraft[]
  recipients: Recipient[]
  billers: Biller[]
  /** The code a user shows a group owner to be let in, once they have asked for one. */
  pendingJoin?: { code: string; onebankid: string }
  sequence: number
}

const STORAGE_KEY = 'onebank-mock-db-v1'

// ------------------------------------------------------------------ helpers

/** mulberry32: small, fast, and deterministic for a given seed. */
function seeded(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pad(value: number): string {
  return `${value}`.padStart(2, '0')
}

/** `YYYY-MM-DD HH:mm:ss` in local time — the format the core sends. */
export function txTime(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

function daysAgo(now: Date, days: number, hour: number, minute: number): Date {
  const date = new Date(now)
  date.setDate(date.getDate() - days)
  date.setHours(hour, minute, Math.floor(minute * 0.7) % 60, 0)
  return date
}

function account(
  accountid: string,
  number: string,
  name: string,
  ccy: Account['ccy'],
  type: Account['type'],
  balance: number,
  alias = '',
): MockAccount {
  return {
    accountid,
    account: number,
    ccy,
    name,
    alias,
    type,
    viewonly: 0,
    maskedAccount: '',
    status: 'ACTIVE',
    availablebalance: balance,
    currentbalance: balance,
  }
}

function user(userid: string, name: string, role = 'MEMBER'): User {
  return { userid, name, profileid: '', faceid: '', profiletype: 0, role }
}

// --------------------------------------------------------------------- seed

const MERCHANTS = ['OnePay', 'ບິນໄຟຟ້າ', 'ສີຫາວັງ', 'ເຕີມເງິນໂທລະສັບ', 'ນ້ຳປະປາ', 'Pink Shop', 'Jomaa Coffee']
const COUNTERPARTS = [
  'PHOUVSENG PHONEPASERTH',
  'SAYALATH PHOMMACHANH',
  'KHAMPHOU SOUVANNAVONG',
  'VILAYVANH KEOMANY',
  'NARIN DJ',
  'SOMPHONE INTHAVONG',
]

function seedTransactions(groupId: string, accounts: MockAccount[], users: User[], now: Date, seed: number): TransactionInfo[] {
  const random = seeded(seed)
  const items: TransactionInfo[] = []
  let id = seed * 1000

  // Sixty days of settled history: the statement, the calendar and the charts.
  for (let day = 0; day < 60; day++) {
    const count = 2 + Math.floor(random() * 4)
    for (let n = 0; n < count; n++) {
      const from = accounts[Math.floor(random() * accounts.length)]
      const credit = random() < 0.4
      const amount = Math.round((random() * (from.ccy === 'LAK' ? 4_000_000 : 400) + 10) / 10) * 10
      const merchant = MERCHANTS[Math.floor(random() * MERCHANTS.length)]
      const counterpart = COUNTERPARTS[Math.floor(random() * COUNTERPARTS.length)]
      const maker = users[Math.floor(random() * users.length)]
      const when = daysAgo(now, day, 8 + Math.floor(random() * 10), Math.floor(random() * 60))
      const status = random() < 0.08 ? 'CANCELLED' : 'SUCCESS'
      items.push({
        transactionid: ++id,
        onebankid: groupId,
        txtime: txTime(when),
        amount: credit ? amount : -amount,
        ccy: from.ccy,
        service: credit ? 'RECEIVE' : n % 2 ? 'PAYMENT' : 'TRANSFER',
        type: credit ? 'CREDIT' : 'DEBIT',
        account: from.account,
        accountname: from.alias || from.name,
        makername: maker.name,
        makerid: maker.userid,
        status,
        ticket: `${1234567890 + id}`,
        detail: {
          AMOUNT: `${amount}`,
          CCY: from.ccy,
          DESCRIPTION: credit ? `ຮັບເງິນຈາກ ${counterpart}` : merchant,
          MERCHANTNAME: credit ? undefined : merchant,
          TOACCOUNTNAME: credit ? from.name : counterpart,
          TOACCOUNTNO: credit ? from.account : `0101200000${Math.floor(random() * 90000000 + 10000000)}`,
        },
        approvals: [],
        requiredApprovals: 0,
      })
    }
  }

  // Waiting on approval: the pending-authorization page and the badge.
  const pending: Array<[number, number, string]> = [
    [0, 15_000_000, 'SAYALATH PHOMMACHANH'],
    [0, 2_400_000, 'VILAYVANH KEOMANY'],
    [1, 98_500_000, 'KHAMPHOU SOUVANNAVONG'],
  ]
  // Kip accounts only: these amounts are in kip, and 98.5M on a dollar account is not a demo, it is a bug.
  const kip = accounts.filter((account) => account.ccy === 'LAK' && account.type !== 'SHADOW')
  pending.forEach(([day, amount, to], index) => {
    const from = (kip.length ? kip : accounts)[index % (kip.length || accounts.length)]
    const maker = users[(index + 1) % users.length]
    items.push({
      transactionid: ++id,
      onebankid: groupId,
      txtime: txTime(daysAgo(now, day, 9 + index, 51)),
      amount: -amount,
      ccy: from.ccy,
      service: 'TRANSFER',
      type: 'DEBIT',
      account: from.account,
      accountname: from.alias || from.name,
      makername: maker.name,
      makerid: maker.userid,
      status: 'PENDING',
      ticket: `${1234567890 + id}`,
      detail: {
        AMOUNT: `${amount}`,
        CCY: from.ccy,
        DESCRIPTION: index === 2 ? 'ຊຳລະຄ່າສິນຄ້າປະຈຳເດືອນ' : 'ໂອນເງິນ',
        TOACCOUNTNAME: to,
        TOACCOUNTNO: `01012000000${index}1234567`,
      },
      approvals:
        index === 2
          ? [{ userid: users[users.length - 1].userid, name: users[users.length - 1].name, decision: 'APPROVED', time: txTime(daysAgo(now, 1, 10, 5)), level: 1 }]
          : [],
      requiredApprovals: index === 2 ? 2 : 1,
    })
  })

  return items.sort((a, b) => String(b.txtime).localeCompare(String(a.txtime)))
}

const HOME_MENUS = ['TRANSFER', 'ECHEQUE', 'IBANKSALARY', 'STATEMENT', 'IBANKTRANFERIDCARD', 'IBANKINTERNATIONALTRANSFER']

export function createSeed(now: Date = new Date()): MockDb {
  const users: Record<string, User> = {}
  for (const u of [
    user('U1', 'MANILITPHONE THEPHAVANH', 'OWNER'),
    user('U2', 'SAYALATH PHOMMACHANH'),
    user('U3', 'KHAMPHOU SOUVANNAVONG'),
    user('U4', 'VILAYVANH KEOMANY'),
    user('U5', 'SOMPHONE INTHAVONG'),
    user('U6', 'NOY CHANTHAVONG'),
    user('U7', 'BOUNMY SIHALATH'),
    user('U8', 'ANOUSONE VONGPHACHANH'),
    user('U9', 'KEO SENGSOURIYA'),
  ]) {
    users[u.userid] = u
  }

  const personal = [
    account('P1', '010120000123456789', 'MANILITPHONE THEPHAVANH', 'LAK', 'SAVING', 5_000_111.84),
    account('P2', '010120000987654321', 'MANILITPHONE THEPHAVANH', 'USD', 'CURRENT', 5_000.84),
    account('P3', '010120000555000111', 'MANILITPHONE THEPHAVANH', 'THB', 'SAVING', 51_000.84),
    account('P4', '010120000777000222', 'MANILITPHONE THEPHAVANH', 'LAK', 'CURRENT', 1_250_000),
  ]

  const companyAccounts = [
    account('A1', '160120000123695001', 'PHOUVSENG PHONEPASERTH', 'LAK', 'SAVING', 162_840_960.5),
    account('A2', '010120000451200957', 'Onecash 392', 'LAK', 'CURRENT', 104_790),
    account('A3', '010120000000000001', 'MANILITPHONE THEPHAVANH', 'USD', 'SAVING', 5_000.84),
    account('A4', 'SHA000000000000123', 'SHADOWXXX', 'LAK', 'SHADOW', 5_000_111.84, 'Petty cash'),
  ]
  const shopAccounts = [
    account('B1', '010120000321000456', 'PHOUVONG TRADING', 'LAK', 'CURRENT', 48_250_000),
    account('B2', '010120000321000789', 'PHOUVONG TRADING', 'THB', 'SAVING', 125_400),
  ]
  const familyAccounts = [account('C1', '010120000888000111', 'THEPHAVANH FAMILY', 'LAK', 'SAVING', 12_500_000)]

  const all = Object.values(users)

  const groups: MockGroup[] = [
    {
      onebankid: 'G1',
      name: 'ບໍລິສັດ ນາມສົມມຸດ ຈຳກັດ',
      detail: 'ບັນຊີກຸ່ມສຳລັບການເງິນຂອງບໍລິສັດ',
      color: '#DD2319',
      logoname: '',
      members: { U1: 'OWNER', U2: 'ADMIN', U3: 'MEMBER', U4: 'MEMBER', U5: 'MEMBER', U6: 'MEMBER', U7: 'MEMBER', U8: 'MEMBER' },
      accounts: companyAccounts,
      permissions: [
        {
          permissionid: 1,
          name: 'ຜູ້ອະນຸມັດ',
          accountids: ['A1', 'A2', 'A3'],
          userids: ['U1', 'U2'],
          allowedfunctions: 'TRANSFER,IBANKSALARY,ECHEQUE,ELECTRICITY,WATER,PHONE',
          limit: { daily: 500_000_000, pertransaction: 200_000_000 },
          approverlevels: [{ level: 1, userids: ['U2', 'U3'], mode: 'ATLEAST', min: 1 }],
          viewonly: false,
        },
        {
          permissionid: 2,
          name: 'ເບິ່ງຢ່າງດຽວ',
          accountids: ['A1', 'A2'],
          userids: ['U4', 'U5', 'U6'],
          allowedfunctions: 'STATEMENT,HISTORY',
          viewonly: true,
        },
        {
          permissionid: 3,
          name: 'ພະນັກງານການເງິນ',
          accountids: ['A2'],
          userids: ['U7', 'U8'],
          allowedfunctions: 'TRANSFER,ELECTRICITY,WATER',
          limit: { pertransaction: 5_000_000, daily: 20_000_000 },
          approverlevels: [{ level: 1, userids: ['U1', 'U2'], mode: 'ALL' }],
          viewonly: false,
        },
      ],
      homemenus: HOME_MENUS,
      transactions: seedTransactions('G1', companyAccounts, all.slice(0, 6), now, 11),
      joinCode: 'JG-4821',
    },
    {
      onebankid: 'G2',
      name: 'ຮ້ານ ພູວົງ ເທຣດດິ້ງ',
      detail: 'ຮ້ານຄ້າສົ່ງ ແລະ ຍ່ອຍ',
      color: '#133D6B',
      logoname: '',
      members: { U1: 'OWNER', U7: 'MEMBER', U9: 'MEMBER' },
      accounts: shopAccounts,
      permissions: [],
      homemenus: HOME_MENUS.slice(0, 4),
      transactions: seedTransactions('G2', shopAccounts, [users.U1, users.U7, users.U9], now, 23),
      joinCode: 'JG-7310',
    },
    {
      onebankid: 'G3',
      name: 'ຄອບຄົວ ເທບພະວົງ',
      detail: 'ເງິນເກັບຄອບຄົວ',
      color: '#4caf50',
      logoname: '',
      members: { U1: 'OWNER', U6: 'MEMBER' },
      accounts: familyAccounts,
      permissions: [],
      homemenus: HOME_MENUS.slice(0, 3),
      transactions: seedTransactions('G3', familyAccounts, [users.U1, users.U6], now, 37),
      joinCode: 'JG-1188',
    },
    {
      // Not one of the user's groups: the "Join group" flow joins it with JG-5050.
      onebankid: 'G4',
      name: 'ສະມາຄົມ ນັກທຸລະກິດໜຸ່ມ',
      detail: 'ກອງທຶນສະມາຊິກ',
      color: '#133D6B',
      logoname: '',
      members: { U2: 'OWNER', U3: 'MEMBER' },
      accounts: [account('D1', '010120000444000555', 'YOUNG ENTREPRENEURS', 'LAK', 'SAVING', 30_000_000)],
      permissions: [],
      homemenus: HOME_MENUS.slice(0, 4),
      transactions: [],
      joinCode: 'JG-5050',
    },
  ]

  const messages: Message[] = groups[0].transactions
    .filter((tx) => tx.status !== 'PENDING')
    .slice(0, 14)
    .map((tx, index) => ({
      messageid: `M${index + 1}`,
      onebankid: 'G1',
      time: String(tx.txtime),
      title: tx.service === 'RECEIVE' ? 'Receive' : 'Transfer',
      transactionid: String(tx.transactionid),
      account: tx.account ?? '',
      accountname: String(tx.detail?.TOACCOUNTNAME ?? ''),
      toaccount: String(tx.detail?.TOACCOUNTNO ?? ''),
      amount: Number(tx.amount),
      ccy: tx.ccy ?? 'LAK',
      service: String(tx.service),
      status: index === 3 ? 'EXPIRED' : String(tx.status),
      maker: String(tx.makername),
      usertype: index % 3 ? 'MAKER' : 'CHECKER',
      read: index > 1,
    }))

  const cheques: Cheque[] = [
    {
      chequeid: 'CQ1',
      onebankid: 'G1',
      number: '12345',
      accountid: 'A1',
      payee: 'KHAMPHOU SOUVANNAVONG',
      amount: 150_000_000,
      ccy: 'LAK',
      issuedate: txTime(daysAgo(now, 3, 11, 2)),
      duedate: txTime(daysAgo(now, -27, 11, 2)),
      memo: 'ຄ່າສິນຄ້າ ງວດທີ 3',
      status: 'ISSUED',
    },
    {
      chequeid: 'CQ2',
      onebankid: 'G1',
      number: '12346',
      accountid: 'A1',
      payee: 'VILAYVANH KEOMANY',
      amount: 25_000_000,
      ccy: 'LAK',
      issuedate: txTime(daysAgo(now, 9, 14, 30)),
      duedate: txTime(daysAgo(now, -5, 14, 30)),
      memo: '',
      status: 'CASHED',
      direction: 'ISSUED',
    },
    {
      chequeid: 'CQ3',
      onebankid: 'G1',
      number: '7701',
      accountid: 'A1',
      payee: 'MANILITPHONE THEPHAVANH',
      amount: 42_000_000,
      ccy: 'LAK',
      issuedate: txTime(daysAgo(now, 2, 9, 51)),
      duedate: txTime(daysAgo(now, -2, 9, 51)),
      memo: 'ຊຳລະຄ່າສິນຄ້າ',
      status: 'ISSUED',
      kind: 'ACCOUNT',
      direction: 'RECEIVED',
    },
  ]
  for (const cheque of cheques) cheque.direction ??= 'ISSUED'

  const chequeBooks: ChequeBook[] = [
    { bookid: 'BK1', onebankid: 'G1', number: '12345', accountid: 'A1', boughtat: txTime(daysAgo(now, 40, 9, 51)), used: 2, total: 30 },
    { bookid: 'BK2', onebankid: 'G1', number: '12346', accountid: 'A2', boughtat: txTime(daysAgo(now, 12, 14, 5)), used: 0, total: 30 },
  ]

  const drafts: TransferDraft[] = [
    {
      draftid: 'D1',
      onebankid: 'G1',
      name: 'ຄ່າສິນຄ້າ ປະຈຳເດືອນ',
      kind: 'BCEL',
      fromaccountid: 'A1',
      items: [
        { toaccount: '010120000345678901', toname: 'ABCD EFGH', amount: 2_500_000, ccy: 'LAK', note: 'ຄ່າເຄື່ອງ' },
        { toaccount: '010120000999888777', toname: 'SAYALATH PHOMMACHANH', amount: 1_200_000, ccy: 'LAK', note: 'ຄ່າຂົນສົ່ງ' },
      ],
      savedat: txTime(daysAgo(now, 1, 16, 20)),
    },
  ]

  const recipients: Recipient[] = [
    { recipientid: 'R1', name: 'ABCD EFGH', account: '010120000345678901', ccy: 'LAK', bank: 'BCEL', favourite: true },
    { recipientid: 'R2', name: 'SAYALATH PHOMMACHANH', account: '010120000999888777', ccy: 'LAK', bank: 'BCEL', favourite: true },
    { recipientid: 'R3', name: 'KHAMPHOU SOUVANNAVONG', account: '0201200011223344', ccy: 'LAK', bank: 'LDB', favourite: false },
    { recipientid: 'R4', name: 'NARIN DJ', account: '010120000000000009', ccy: 'USD', bank: 'BCEL', favourite: false },
    { recipientid: 'R5', name: 'VILAYVANH KEOMANY', account: '0301200055667788', ccy: 'LAK', bank: 'JDB', favourite: true },
  ]

  const billers: Biller[] = [
    { billerid: 'EDL', kind: 'ELECTRICITY', name: 'ລັດວິສາຫະກິດໄຟຟ້າລາວ (EDL)', logo: 'img/ob-mn-electricity.svg' },
    { billerid: 'NPNL', kind: 'WATER', name: 'ລັດວິສາຫະກິດນ້ຳປະປາ ນະຄອນຫຼວງ', logo: 'img/ob-mn-water.svg' },
    { billerid: 'UNITEL', kind: 'PHONE', name: 'Unitel', logo: 'img/ob-mn-phone.svg' },
    { billerid: 'LTC', kind: 'PHONE', name: 'Lao Telecom', logo: 'img/ob-mn-phone.svg' },
    { billerid: 'ETL', kind: 'PHONE', name: 'ETL', logo: 'img/ob-mn-phone.svg' },
    { billerid: 'TPLUS', kind: 'PHONE', name: 'T-Plus', logo: 'img/ob-mn-phone.svg' },
    { billerid: 'BEST', kind: 'PHONE', name: 'Best', logo: 'img/ob-mn-phone.svg' },
  ]

  return {
    meId: 'U1',
    users,
    memberCodes: { '2045': 'U9', '3312': 'U8', '7788': 'U7' },
    groups,
    personalAccounts: personal,
    messages,
    cheques,
    chequeBooks,
    drafts,
    recipients,
    billers,
    sequence: 90_000,
  }
}

// ---------------------------------------------------------------- lifecycle

function storage(): Storage | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage
  } catch {
    return undefined
  }
}

function load(): MockDb {
  try {
    const raw = storage()?.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as MockDb
  } catch {
    // Unreadable state is replaced by a fresh seed rather than crashing the app.
  }
  return createSeed()
}

let current: MockDb | null = null

/** The live database, created on first use. */
export function db(): MockDb {
  if (!current) current = load()
  return current
}

/** Writes the database back so a reload keeps what the user did. */
export function persist(): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(db()))
  } catch {
    // Quota: the demo keeps working, it just forgets on reload.
  }
}

/** Throws the state away. Logout, and every test's `beforeEach`. */
export function resetMockDb(now?: Date): void {
  current = now ? createSeed(now) : null
  try {
    storage()?.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
}

export function nextId(): number {
  const database = db()
  database.sequence += 1
  return database.sequence
}

export function findGroup(onebankid: unknown): MockGroup | undefined {
  return db().groups.find((group) => group.onebankid === onebankid)
}

export type { Approval }
