/**
 * Wire types for the OneBank services.
 *
 * These mirror what the core actually returns and are the single place the wire
 * format is expressed. Keep them aligned with onebank-ui's `libs/definition.ts`
 * and its per-page `definition.ts` files — divergence here is how web and mobile
 * drift apart. See CLAUDE.md.
 */

import type { Account, GroupDetail, LoadHomeResult, Menu, User } from '../../definition'

export type { Account, GroupDetail, LoadHomeResult, Menu, User }

/** Every service response carries this envelope. `result === 0` means success. */
export interface ApiEnvelope {
  result: number
  message?: string
}

/** The core returns `result: 1` when the session has expired. */
export const RESULT_OK = 0
export const RESULT_SESSION_EXPIRED = 1

// ---------------------------------------------------------------- ONEBANKHOME

// `result` and `message` come from ApiEnvelope, which requires `result`.
// `Partial<LoadHomeResult>` would make it optional, and the two declarations
// then conflict — hence the omission rather than a second `Partial`.
export interface LoadHomeResponse extends ApiEnvelope, Omit<Partial<LoadHomeResult>, 'result' | 'message'> {
  detail?: GroupDetail
}

export interface SaveHomeMenusResponse extends ApiEnvelope {}

/**
 * The home widgets, all served by one command with a `widget` discriminator.
 *
 * `ACCOUNTBALANCES` answers on `balances` and takes no account; the two usage
 * widgets answer on `items` and are per-account. Callers branch on the payload
 * key being present rather than on `result` — that is what the mobile widgets
 * do, and an absent key is how the core signals "no data for this account".
 */
export type WidgetKind = 'ACCOUNTBALANCES' | 'USAGEDAILY' | 'USAGESHARE'

export interface Balance {
  account: string
  ccy: string
  name: string
  currentbalance: number
  availablebalance: number
}

export interface UsageDaily {
  date: string
  ccy: string
  debit: number
  credit: number
}

export interface UsageShare {
  type: string
  amount: number
}

export interface LoadWidgetResponse extends ApiEnvelope {
  /** `ACCOUNTBALANCES` only. */
  balances?: Balance[]
  /** `USAGEDAILY` and `USAGESHARE`; the element type follows the widget asked for. */
  items?: UsageDaily[] | UsageShare[]
}

// --------------------------------------------------------------- ONEBANKGROUP

export interface OneBankGroup {
  onebankid: string
  name?: string
  detail?: string
  logoname?: string
  color?: string
  default?: boolean
  type?: string
}

export interface LoadGroupsResponse extends ApiEnvelope {
  groups: OneBankGroup[]
}

export interface CreateGroupResponse extends ApiEnvelope {
  onebankid: string
}

export interface JoinGroupRequestResponse extends ApiEnvelope {
  /** Channel id to subscribe to (`JOINEDGROUP-<id>`) while awaiting approval. */
  joingroupid: string
}

export interface LeaveGroupResponse extends ApiEnvelope {}
export interface ChangeGroupDetailResponse extends ApiEnvelope {}

export interface GroupDetailPatch {
  name: string
  detail: string
  color: string
  /** Empty string clears the logo back to the default. */
  logoname: string
}

/** Where to PUT a picture, and the name it will have once uploaded. */
export interface GetUploadUrlResponse extends ApiEnvelope {
  signedurl?: string
  filename?: string
}

/** A single add/remove instruction for `changeaccounts`. */
export interface AccountChange {
  accountid: string
  action: 'add' | 'remove'
}

export interface ChangeAccountsResponse extends ApiEnvelope {}

/** A single lock/unlock instruction for `changeaccountstatus`. */
export interface AccountStatusChange {
  accountid: string
  status: 'ACTIVE' | 'LOCKED'
}

export interface ChangeAccountStatusResponse extends ApiEnvelope {}
export interface ChangeAccountAliasResponse extends ApiEnvelope {}

/** Account ids the user holds that this group could still be given. */
export interface GetAvailableAccountsResponse extends ApiEnvelope {
  accounts?: string[]
}

/** What a new virtual or shadow account is opened from. */
export interface NewAccount {
  /** VIRTUAL sits on top of a real account; SHADOW is a separate ledger. */
  accountType: 'VIRTUAL' | 'SHADOW'
  /** The real account it is opened against. */
  accountid: string
  alias: string
  /** Picture for the new account. Always empty from the web today. */
  avatar?: string
}

export interface OpenNewAccountResponse extends ApiEnvelope {}

export interface AddMemberEnquiryResponse extends ApiEnvelope {
  user?: User
}

export interface AddMemberResponse extends ApiEnvelope {}
export interface RemoveMemberResponse extends ApiEnvelope {}

export interface TransactionLimit {
  [key: string]: unknown
}

export interface ApproverLevel {
  [key: string]: unknown
}

export interface Permission {
  permissionid?: number
  accountids: string[]
  userids: string[]
  allowedfunctions?: string
  limit?: TransactionLimit
  approverlevels?: ApproverLevel[]
  viewonly: boolean
}

export interface GetPermissionsResponse extends ApiEnvelope {
  permissions?: Permission[]
}

export interface RemovePermissionResponse extends ApiEnvelope {}

// --------------------------------------------------------- ONEBANKTRANSACTION

export interface TransactionDetail {
  AMOUNT?: string
  CCY?: string
  OPERATOR?: string
  PHONE?: number
  TICKET?: number
  MERCHANTNAME?: string
  DESCRIPTION?: string
  CASHOUTAMOUNT?: number
  MERCHANTID?: string
  TIPAMOUNT?: number
  TOACCOUNT?: string
  TOACCOUNTNO?: string
  TOACCOUNTNAME?: string
  [key: string]: unknown
}

/**
 * Mirrors onebank-ui's `pages/TRANSACTION/definition.ts` `transactionInfo`.
 *
 * `transactionid` is a number on the wire but the commands that take one accept
 * a string, and it is used as a key in places, so both are allowed here.
 * `txtime` is a datetime string that `Date` can parse — onebank-ui feeds it
 * straight to dayjs.
 */
export interface TransactionInfo {
  transactionid?: string | number
  onebankid?: string
  txtime?: string
  amount?: number
  service?: string
  command?: string
  ticket?: string
  usertype?: string
  account?: string
  ccy?: string
  accountname?: string
  type?: string
  makername?: string
  profileid?: string
  faceid?: string
  profiletype?: number
  status?: string
  detail?: TransactionDetail
  [key: string]: unknown
}

export interface ViewTransactionsResponse extends ApiEnvelope {
  items?: TransactionInfo[]
}

export interface GetPendingApprovalsResponse extends ApiEnvelope {
  items?: TransactionInfo[]
}

export interface Approver {
  [key: string]: unknown
}

export interface GetApprovalDetailResponse extends ApiEnvelope {
  item?: TransactionInfo
  approvers?: Approver[]
}
