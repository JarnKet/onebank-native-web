/**
 * The local store: what the app remembers for commands the core did not answer.
 *
 * Only unmapped commands (`../unmapped.ts`) write here, and only after the core
 * refused them or did not answer (`./index.ts`). Nothing in it is fake bank
 * data standing in for the real thing — accounts, members and the transaction
 * history are always the core's. The store holds what the user *did* locally
 * (transfers, payments, decisions, roles, cheques, drafts) plus the few lists a
 * screen needs that the core has no command for yet (billers, recipients).
 *
 * It lives in **sessionStorage**, so it survives a reload in the same tab and
 * is gone on logout (`resetLocalStore`, called from `lib/session.ts`).
 */

import type {
  Biller,
  Cheque,
  ChequeBook,
  Message,
  Permission,
  Recipient,
  TransactionInfo,
  TransferDraft,
} from '../types'

/** A decision recorded locally on a transaction the core owns. */
export type TransactionPatch = Pick<TransactionInfo, 'status' | 'approvals' | 'archived'>

export interface LocalGroup {
  /** Transactions made locally — submitted transfers, bills, salaries. */
  transactions: TransactionInfo[]
  /** Local decisions on the core's own transactions, by transaction id. */
  patches: Record<string, TransactionPatch>
  /** Roles saved locally: new ones carry a negative id, edits keep the core's. */
  permissions: Permission[]
  /** Core roles removed locally. */
  removedPermissions: number[]
  memberRoles: Record<string, string>
  cheques: Cheque[]
  chequeBooks: ChequeBook[]
  drafts: TransferDraft[]
  messages: Message[]
  /**
   * Alert choices by setting id. Optional: state saved before the iBank
   * screens has none, and the defaults apply until the group saves.
   */
  notifications?: Record<string, boolean>
}

export interface LocalState {
  groups: Record<string, LocalGroup>
  recipients: Recipient[]
  sequence: number
}

const STORAGE_KEY = 'onebank-local-v1'

/** Lists the core has no command for yet. Plain reference data, no balances. */
export const BILLERS: Biller[] = [
  { billerid: 'EDL', kind: 'ELECTRICITY', name: 'ລັດວິສາຫະກິດໄຟຟ້າລາວ (EDL)', logo: 'img/ob-mn-electricity.svg' },
  { billerid: 'NPNL', kind: 'WATER', name: 'ລັດວິສາຫະກິດນ້ຳປະປາ ນະຄອນຫຼວງ', logo: 'img/ob-mn-water.svg' },
  { billerid: 'UNITEL', kind: 'PHONE', name: 'Unitel', logo: 'img/ob-mn-phone.svg' },
  { billerid: 'LTC', kind: 'PHONE', name: 'Lao Telecom', logo: 'img/ob-mn-phone.svg' },
  { billerid: 'ETL', kind: 'PHONE', name: 'ETL', logo: 'img/ob-mn-phone.svg' },
  { billerid: 'TPLUS', kind: 'PHONE', name: 'T-Plus', logo: 'img/ob-mn-phone.svg' },
  { billerid: 'BEST', kind: 'PHONE', name: 'Best', logo: 'img/ob-mn-phone.svg' },
]

function emptyGroup(): LocalGroup {
  return {
    transactions: [],
    patches: {},
    permissions: [],
    removedPermissions: [],
    memberRoles: {},
    cheques: [],
    chequeBooks: [],
    drafts: [],
    messages: [],
  }
}

function emptyState(): LocalState {
  return { groups: {}, recipients: [], sequence: 0 }
}

function storage(): Storage | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage
  } catch {
    return undefined
  }
}

let current: LocalState | null = null

export function localState(): LocalState {
  if (current) return current
  try {
    const raw = storage()?.getItem(STORAGE_KEY)
    current = raw ? (JSON.parse(raw) as LocalState) : emptyState()
  } catch {
    // Unreadable state is replaced rather than allowed to break a screen.
    current = emptyState()
  }
  return current
}

export function localGroup(onebankid: string): LocalGroup {
  const state = localState()
  state.groups[onebankid] ??= emptyGroup()
  return state.groups[onebankid]
}

export function persist(): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(localState()))
  } catch {
    // Quota: it keeps working, it just forgets on reload.
  }
}

/** Ids no core record can have, so a local record is always recognisable. */
export function nextLocalId(): number {
  const state = localState()
  state.sequence += 1
  return state.sequence
}

/** Throws everything away. Logout, and tests. */
export function resetLocalStore(): void {
  current = null
  try {
    storage()?.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear.
  }
}
