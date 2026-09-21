/**
 * The OneBank service surface: one typed function per command.
 *
 * This is the whole backend contract. Components call these and nothing else;
 * `client.ts` decides where the request goes (the mock backend in `./mock`,
 * unless a test injects a transport).
 *
 * `onebankid` identifies the active group. It defaults to the `currentGroup`
 * store so callers rarely pass it, but stays overridable for flows that act on
 * a group other than the active one (leaving a group, for instance).
 */

import { get } from 'svelte/store'
import { currentGroup } from '../../stores/onebankGroups'
import { call } from './client'
import type {
  AccountChange,
  AccountStatusChange,
  ChangeAccountAliasResponse,
  ChangeAccountStatusResponse,
  GetAvailableAccountsResponse,
  NewAccount,
  OpenNewAccountResponse,
  AddMemberEnquiryResponse,
  AddMemberResponse,
  ChangeAccountsResponse,
  ChangeGroupDetailResponse,
  CreateGroupResponse,
  GetApprovalDetailResponse,
  GetPendingApprovalsResponse,
  GetPermissionsResponse,
  GroupDetailPatch,
  JoinGroupRequestResponse,
  LeaveGroupResponse,
  LoadGroupsResponse,
  LoadHomeResponse,
  LoadWidgetResponse,
  Menu,
  RemoveMemberResponse,
  RemovePermissionResponse,
  SaveHomeMenusResponse,
  ViewTransactionsResponse,
  WidgetKind,
  ApiEnvelope,
  ApproveTransactionResponse,
  CreateChequeRequest,
  CreateChequeResponse,
  GetBillersResponse,
  GetChequesResponse,
  GetMessagesResponse,
  GetRecipientsResponse,
  GetStatementResponse,
  LookupAccountResponse,
  LookupBillResponse,
  PayBillRequest,
  Permission,
  SavePermissionResponse,
  SubmitTransactionResponse,
  TransferRequest,
  TransferDraft,
  GetDraftsResponse,
  SaveDraftResponse,
  GetChequeBooksResponse,
} from './types'

const HOME = 'ONEBANKHOME'
const GROUP = 'ONEBANKGROUP'
const TRANSACTION = 'ONEBANKTRANSACTION'
const USER = 'USER'
const ONEBANK = 'ONEBANK'
const MESSAGE = 'ONEBANKMESSAGE'

function groupId(onebankid?: string): string {
  return onebankid ?? get(currentGroup) ?? ''
}

// ---------------------------------------------------------------- ONEBANKHOME

/** Accounts, members, menus and group detail for one group. The main read. */
export function loadHome(onebankid?: string): Promise<LoadHomeResponse> {
  return call<LoadHomeResponse>(HOME, { command: 'loadhome', onebankid: groupId(onebankid) })
}

/** Persists the user's reordered home menu grid. */
export function saveHomeMenus(menus: Menu[] | string[], onebankid?: string): Promise<SaveHomeMenusResponse> {
  return call<SaveHomeMenusResponse>(HOME, { command: 'savehomemenus', menus, onebankid: groupId(onebankid) })
}

/**
 * One of the three home widgets.
 *
 * `ACCOUNTBALANCES` covers the whole group and takes no `accountid`; the two
 * usage widgets are per-account and the caller must supply one.
 */
export function loadWidget(widget: WidgetKind, accountid?: string, onebankid?: string): Promise<LoadWidgetResponse> {
  const data: Record<string, unknown> = { command: 'loadwidget', widget, onebankid: groupId(onebankid) }
  // Sent only when the widget is per-account, matching the mobile payloads.
  if (accountid !== undefined) data.accountid = accountid
  return call<LoadWidgetResponse>(HOME, data)
}

// --------------------------------------------------------------- ONEBANKGROUP

/** Every group the logged-in user belongs to. Drives the group tab bar. */
export function loadGroups(): Promise<LoadGroupsResponse> {
  return call<LoadGroupsResponse>(GROUP, { command: 'loadgroups' })
}

/** Creates a group from the given account ids; returns the new `onebankid`. */
export function createGroup(
  accounts: string[],
  profile: { name?: string; detail?: string; logoname?: string } = {},
): Promise<CreateGroupResponse> {
  return call<CreateGroupResponse>(GROUP, { command: 'creategroup', accounts, ...profile })
}

/** Joins the group an owner's invitation code belongs to. */
export function joinGroup(code: string): Promise<CreateGroupResponse> {
  return call<CreateGroupResponse>(GROUP, { command: 'joingroup', code })
}

/**
 * Starts a join request. Subscribe to `JOINEDGROUP-<joingroupid>` on the socket
 * to learn when an admin approves it.
 */
export function joinGroupRequest(): Promise<JoinGroupRequestResponse> {
  return call<JoinGroupRequestResponse>(GROUP, { command: 'joingrouprequest' })
}

export function leaveGroup(onebankid?: string): Promise<LeaveGroupResponse> {
  return call<LeaveGroupResponse>(GROUP, { command: 'leavegroup', onebankid: groupId(onebankid) })
}

/** Renames / recolours / re-logos a group. */
export function changeGroupDetail(patch: GroupDetailPatch, onebankid?: string): Promise<ChangeGroupDetailResponse> {
  return call<ChangeGroupDetailResponse>(GROUP, {
    command: 'changegroupdetail',
    name: patch.name,
    detail: patch.detail,
    color: patch.color,
    logoname: patch.logoname,
    onebankid: groupId(onebankid),
  })
}

/** Adds or removes accounts from a group in one batch. */
export function changeAccounts(accounts: AccountChange[], onebankid?: string): Promise<ChangeAccountsResponse> {
  return call<ChangeAccountsResponse>(GROUP, { command: 'changeaccounts', accounts, onebankid: groupId(onebankid) })
}

/** Locks or unlocks accounts in a group, in one batch. */
export function changeAccountStatus(accounts: AccountStatusChange[], onebankid?: string): Promise<ChangeAccountStatusResponse> {
  return call<ChangeAccountStatusResponse>(GROUP, { command: 'changeaccountstatus', accounts, onebankid: groupId(onebankid) })
}

/**
 * Renames one account inside the group.
 *
 * An empty alias is sent as null, which is how the core is told to drop the
 * one it has rather than store a blank.
 */
export function changeAccountAlias(accountid: string, alias: string, onebankid?: string): Promise<ChangeAccountAliasResponse> {
  return call<ChangeAccountAliasResponse>(GROUP, {
    command: 'changeaccountalias',
    accountid,
    alias: alias.trim() || null,
    onebankid: groupId(onebankid),
  })
}

/** The user's own accounts that this group does not already hold. */
export function getAvailableAccounts(onebankid?: string): Promise<GetAvailableAccountsResponse> {
  return call<GetAvailableAccountsResponse>(GROUP, { command: 'getavailableaccounts', onebankid: groupId(onebankid) })
}

/** Looks up the user behind a join code, before actually adding them. */
export function addMemberEnquiry(joingroupid: string, onebankid?: string): Promise<AddMemberEnquiryResponse> {
  return call<AddMemberEnquiryResponse>(GROUP, {
    command: 'addmemberenquiry',
    joingroupid,
    onebankid: groupId(onebankid),
  })
}

/** Adds the user behind a member code, optionally straight into a role. */
export function addMember(joingroupid: string, permissionid?: number, onebankid?: string): Promise<AddMemberResponse> {
  const data: Record<string, unknown> = { command: 'addmember', joingroupid, onebankid: groupId(onebankid) }
  if (permissionid !== undefined) data.permissionid = permissionid
  return call<AddMemberResponse>(GROUP, data)
}

export function changeMemberRole(userid: string, role: 'ADMIN' | 'MEMBER', onebankid?: string): Promise<ApiEnvelope> {
  return call<ApiEnvelope>(GROUP, { command: 'changememberrole', userid, role, onebankid: groupId(onebankid) })
}

export function removeMember(removeuserid: string, onebankid?: string): Promise<RemoveMemberResponse> {
  return call<RemoveMemberResponse>(GROUP, { command: 'removemember', removeuserid, onebankid: groupId(onebankid) })
}

/** The group's roles: who may do what, on which accounts, up to which limit. */
export function getPermissions(onebankid?: string): Promise<GetPermissionsResponse> {
  return call<GetPermissionsResponse>(GROUP, { command: 'getpermissions', onebankid: groupId(onebankid) })
}

/** Creates a role, or replaces the one with the same `permissionid`. */
export function savePermission(permission: Permission, onebankid?: string): Promise<SavePermissionResponse> {
  return call<SavePermissionResponse>(GROUP, { command: 'savepermission', permission, onebankid: groupId(onebankid) })
}

/** Saved and recent transfer recipients. */
export function getRecipients(onebankid?: string): Promise<GetRecipientsResponse> {
  return call<GetRecipientsResponse>(GROUP, { command: 'getrecipients', onebankid: groupId(onebankid) })
}

export function toggleFavourite(recipientid: string, onebankid?: string): Promise<ApiEnvelope> {
  return call<ApiEnvelope>(GROUP, { command: 'togglefavourite', recipientid, onebankid: groupId(onebankid) })
}

/** The name on a destination account, shown before the user confirms. */
export function lookupAccount(account: string, bank = 'BCEL', onebankid?: string): Promise<LookupAccountResponse> {
  return call<LookupAccountResponse>(GROUP, { command: 'lookupaccount', account, bank, onebankid: groupId(onebankid) })
}

export function removePermission(permissionid: number, onebankid?: string): Promise<RemovePermissionResponse> {
  return call<RemovePermissionResponse>(GROUP, {
    command: 'removepermission',
    permissionid,
    onebankid: groupId(onebankid),
  })
}

// --------------------------------------------------------- ONEBANKTRANSACTION

/** Transaction history for the group. */
export function viewTransactions(onebankid?: string): Promise<ViewTransactionsResponse> {
  return call<ViewTransactionsResponse>(TRANSACTION, { command: 'viewtransactions', onebankid: groupId(onebankid) })
}

/** Transactions waiting on this user's approval. */
export function getPendingApprovals(onebankid?: string): Promise<GetPendingApprovalsResponse> {
  return call<GetPendingApprovalsResponse>(TRANSACTION, {
    command: 'getpendingapprovals',
    onebankid: groupId(onebankid),
  })
}

export function getApprovalDetail(transactionid: string, onebankid?: string): Promise<GetApprovalDetailResponse> {
  return call<GetApprovalDetailResponse>(TRANSACTION, {
    command: 'getapprovaldetail',
    transactionid,
    onebankid: groupId(onebankid),
  })
}

// ---------------------------------------------------------------- more TRANSACTION

export function approveTransaction(transactionid: string | number, onebankid?: string): Promise<ApproveTransactionResponse> {
  return call<ApproveTransactionResponse>(TRANSACTION, {
    command: 'approvetransaction',
    transactionid,
    onebankid: groupId(onebankid),
  })
}

/** Rejecting needs a reason; the maker sees it on the transaction. */
export function rejectTransaction(
  transactionid: string | number,
  reason: string,
  onebankid?: string,
): Promise<ApproveTransactionResponse> {
  return call<ApproveTransactionResponse>(TRANSACTION, {
    command: 'rejecttransaction',
    transactionid,
    reason,
    onebankid: groupId(onebankid),
  })
}

/** Demo only: the next approver on the maker's role approves it. */
export function simulateApproval(transactionid: string | number, onebankid?: string): Promise<ApproveTransactionResponse> {
  return call<ApproveTransactionResponse>(TRANSACTION, { command: 'simulateapproval', transactionid, onebankid: groupId(onebankid) })
}

/** The maker withdraws a transaction that is still waiting for approval. */
export function cancelTransaction(transactionid: string | number, onebankid?: string): Promise<ApproveTransactionResponse> {
  return call<ApproveTransactionResponse>(TRANSACTION, { command: 'canceltransaction', transactionid, onebankid: groupId(onebankid) })
}

/** Files a rejected transaction away, so it leaves the "awaiting" column. */
export function archiveTransaction(transactionid: string | number, onebankid?: string): Promise<ApproveTransactionResponse> {
  return call<ApproveTransactionResponse>(TRANSACTION, { command: 'archivetransaction', transactionid, onebankid: groupId(onebankid) })
}

/** Settled history for one account, between two `YYYY-MM-DD` days inclusive. */
export function getStatement(accountid: string, from?: string, to?: string, onebankid?: string): Promise<GetStatementResponse> {
  return call<GetStatementResponse>(TRANSACTION, {
    command: 'getstatement',
    accountid,
    from: from ?? '',
    to: to ?? '',
    onebankid: groupId(onebankid),
  })
}

/**
 * Sends money: one source, one or more recipients.
 *
 * In a group whose roles require approval the result is `PENDING` and lands on
 * the authorization page; otherwise it executes at once.
 */
export function submitTransfer(request: TransferRequest, onebankid?: string): Promise<SubmitTransactionResponse> {
  return call<SubmitTransactionResponse>(TRANSACTION, { command: 'submittransfer', ...request, onebankid: groupId(onebankid) })
}

export function getBillers(): Promise<GetBillersResponse> {
  return call<GetBillersResponse>(TRANSACTION, { command: 'getbillers' })
}

/** What a utility says is owed on a customer number. */
export function lookupBill(billerid: string, customerno: string): Promise<LookupBillResponse> {
  return call<LookupBillResponse>(TRANSACTION, { command: 'lookupbill', billerid, customerno })
}

/** Pays a utility bill or tops up a phone, depending on the biller. */
export function payBill(request: PayBillRequest, onebankid?: string): Promise<SubmitTransactionResponse> {
  return call<SubmitTransactionResponse>(TRANSACTION, { command: 'paybill', ...request, onebankid: groupId(onebankid) })
}

export function getCheques(onebankid?: string): Promise<GetChequesResponse> {
  return call<GetChequesResponse>(TRANSACTION, { command: 'getcheques', onebankid: groupId(onebankid) })
}

export function createCheque(request: CreateChequeRequest, onebankid?: string): Promise<CreateChequeResponse> {
  return call<CreateChequeResponse>(TRANSACTION, { command: 'createcheque', ...request, onebankid: groupId(onebankid) })
}

export function getChequeBooks(onebankid?: string): Promise<GetChequeBooksResponse> {
  return call<GetChequeBooksResponse>(TRANSACTION, { command: 'getchequebooks', onebankid: groupId(onebankid) })
}

/** Buys a book of 30 cheque leaves against an account. */
export function buyChequeBook(accountid: string, onebankid?: string): Promise<ApiEnvelope> {
  return call<ApiEnvelope>(TRANSACTION, { command: 'buychequebook', accountid, onebankid: groupId(onebankid) })
}

export function getDrafts(onebankid?: string): Promise<GetDraftsResponse> {
  return call<GetDraftsResponse>(TRANSACTION, { command: 'getdrafts', onebankid: groupId(onebankid) })
}

export function saveDraft(draft: Omit<TransferDraft, 'onebankid' | 'savedat'>, onebankid?: string): Promise<SaveDraftResponse> {
  return call<SaveDraftResponse>(TRANSACTION, { command: 'savedraft', draft, onebankid: groupId(onebankid) })
}

export function deleteDraft(draftid: string, onebankid?: string): Promise<ApiEnvelope> {
  return call<ApiEnvelope>(TRANSACTION, { command: 'deletedraft', draftid, onebankid: groupId(onebankid) })
}

export function cancelCheque(chequeid: string, onebankid?: string): Promise<ApiEnvelope> {
  return call<ApiEnvelope>(TRANSACTION, { command: 'cancelcheque', chequeid, onebankid: groupId(onebankid) })
}

// ------------------------------------------------------------- ONEBANKMESSAGE

export function getMessages(onebankid?: string): Promise<GetMessagesResponse> {
  return call<GetMessagesResponse>(MESSAGE, { command: 'getmessages', onebankid: groupId(onebankid) })
}

export function markMessageRead(messageid: string, onebankid?: string): Promise<ApiEnvelope> {
  return call<ApiEnvelope>(MESSAGE, { command: 'readmessage', messageid, onebankid: groupId(onebankid) })
}

// ------------------------------------------------------------------------ USER

/** What a successful login hands the shell: the user, their cards, their groups. */
export interface LoginResponse extends ApiEnvelope {
  data?: Record<string, any>
}

export function login(email: string, password: string): Promise<LoginResponse> {
  return call<LoginResponse>(USER, { command: 'login', email, password, devicetype: 'B' })
}

export interface LoginTokenResponse extends ApiEnvelope {
  logintoken?: string
  servertime?: number
  devicenumber?: string
}

/** A token for the QR code the mobile app scans to approve a desktop login. */
export function getLoginToken(): Promise<LoginTokenResponse> {
  return call<LoginTokenResponse>(ONEBANK, { command: 'getdesktoplogintoken' })
}

/** Completes a QR login once the phone has approved `logintoken`. */
export function authenticateToken(logintoken: string): Promise<LoginResponse> {
  return call<LoginResponse>(USER, { command: 'authen', logintoken })
}

// --------------------------------------------------------------------- ONEBANK

/**
 * Opens a virtual or shadow account against one of the user's real accounts.
 *
 * The core took the group from the session and onebank-ui sends no
 * `onebankid`; the mock backend has no session, so it is sent here.
 */
export function openNewAccount(account: NewAccount, onebankid?: string): Promise<OpenNewAccountResponse> {
  return call<OpenNewAccountResponse>(ONEBANK, {
    command: 'opennewaccount',
    onebankid: groupId(onebankid),
    accountType: account.accountType,
    accountid: account.accountid,
    alias: account.alias,
    avatar: account.avatar ?? '',
  })
}
