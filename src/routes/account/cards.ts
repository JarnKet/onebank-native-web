/**
 * The user's cards, and the accounts hanging off them.
 *
 * onebank-ui reads these with `loadData('USER')` — a bridge call answered from
 * the cached login payload, not the network. Here that payload is already in
 * the `loginData` store, so this is a read, not a request.
 */

import { derived } from 'svelte/store'
import { loginData } from '../../stores/session'
import type { Account } from '../../definition'

export interface Card {
  cardid: string
  cardtype: string
  cardname: string
  cardnumber: string
  /** File under `public/img/`. */
  filename: string
  accounts: Account[]
}

/** Cards that actually carry accounts; the rest have nothing to show. */
export const cards = derived(loginData, ($loginData) => {
  const list = ($loginData as unknown as { USER?: { cards?: Card[] } })?.USER?.cards ?? []
  return list.filter((card) => card?.accounts?.length > 0)
})

/** The cards, keeping only accounts the group is allowed to be given. */
export function withAvailableAccounts(list: Card[], available: string[]): Card[] {
  const usable = new Set(available)
  return list
    .map((card) => ({ ...card, accounts: card.accounts.filter((account) => usable.has(account.accountid)) }))
    .filter((card) => card.accounts.length > 0)
}
