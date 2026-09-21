/**
 * The sidebar's badge counts: unread messages and transactions awaiting the
 * user's approval. Read from the backend, never hardcoded — the old sidebar
 * carried a literal `notifications: 2` on two entries whatever the data said.
 */

import { get, writable } from 'svelte/store'
import { getMessages, getPendingApprovals } from '../lib/api/commands'
import { currentGroup } from './onebankGroups'
import { loginData } from './session'

export const unreadCount = writable(0)
export const pendingCount = writable(0)

/** The logged-in user's id, from the login payload. */
export function myUserId(): string {
  return ((get(loginData) as any)?.USER?.userid as string) ?? 'U1'
}

export async function refreshBadges(onebankid: string = get(currentGroup)): Promise<void> {
  if (!onebankid) return
  try {
    const [messages, pending] = await Promise.all([getMessages(onebankid), getPendingApprovals(onebankid)])
    unreadCount.set((messages.messages ?? []).filter((message) => !message.read).length)
    const me = myUserId()
    pendingCount.set(
      (pending.items ?? []).filter(
        (tx) => tx.makerid !== me && !(tx.approvals ?? []).some((approval) => approval.userid === me),
      ).length,
    )
  } catch {
    // A badge is decoration; a failed count must not break the shell.
  }
}
