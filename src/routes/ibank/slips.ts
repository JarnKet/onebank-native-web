import type { TransactionInfo } from '../../lib/api/types'

/** The services that move money to someone, so a transfer slip can be printed for them. */
export const SLIP_SERVICES = ['TRANSFER', 'INTERBANK', 'SALARY'] as const

/**
 * Whether a transaction gets a slip — a confirmation the group can print or
 * send to whoever was paid. The Slip report lists exactly these, and each row
 * opens the receipt at `/messages/:id`.
 *
 * TODO(you): decide which transactions deserve a slip. Things to weigh:
 *  - service: only outgoing transfers (`SLIP_SERVICES`), or bills and top-ups too?
 *  - status: a PENDING transfer has not moved money yet — is a slip for it a
 *    promise the bank has not kept? And CANCELLED ones?
 *  - direction: money *in* (`amount > 0`, service RECEIVE) has no one to send a slip to.
 */
export function isSlip(tx: TransactionInfo): boolean {
  return (SLIP_SERVICES as readonly string[]).includes(String(tx.service))
}
