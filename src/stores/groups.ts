/**
 * The group list, owned by this app instead of by `MAIN.html`.
 *
 * `MAIN.html` discovered groups two different ways and the distinction matters,
 * so it is reproduced here rather than collapsed:
 *
 * - **Boot** (`MAIN.html:1730-1756`) reads the *cached login payload* over the
 *   bridge — `loadData("USER")` then `loadData("ONEBANK")` — not the network.
 *   Those are answered from `loginData`, which the login response populated. It
 *   then selects `groups[0]`.
 * - **Refresh** (`MAIN.html:1560-1578`) calls `ONEBANKGROUP/loadgroups` for
 *   real, and selects the requested group, falling back to the *last* one —
 *   which is how a newly created group becomes active.
 *
 * Both paths are gated on `idverified`: a user who is unverified, pending,
 * under review or failed gets no OneBank at all (`MAIN.html:1740`). That is an
 * authorization gate, not decoration.
 *
 * KID groups are filtered out. `MAIN.html:1441-1448` already drops them when
 * `isdesktop=1`, which this app always is, so this is parity and not a change.
 *
 * Navigation deliberately lives in the callers: keeping this module free of
 * `helper.ts` lets `helper.ts` depend on it in the other direction.
 */

import { get, writable } from 'svelte/store'
import { loadGroups } from '../lib/api/commands'
import type { OneBankGroup } from '../lib/api/types'
import { currentGroup, registerGroup } from './onebankGroups'
import { popups } from './popup'
import { loginData } from './session'

/** Every group the user belongs to, in server order, KID excluded. */
export const groups = writable<OneBankGroup[]>([])

/** False while the account cannot use OneBank at all. */
export const idVerified = writable<boolean>(false)

/** True until the first seed or refresh settles, so the UI can show skeletons. */
export const groupsLoading = writable<boolean>(true)

/**
 * `idverified` values that deny access: not verified, pending, under review,
 * failed. Anything else — in practice `Y` — is allowed. Matches `MAIN.html:1740`.
 */
const DENIED_VERIFICATION = new Set(['N', 'P', 'V', 'F'])

export function isVerified(idverified: unknown): boolean {
  return typeof idverified === 'string' ? !DENIED_VERIFICATION.has(idverified) : true
}

/** KID groups belong to OneBankKid, which is out of scope for the web app. */
function usable(list: OneBankGroup[] | undefined | null): OneBankGroup[] {
  return (list ?? []).filter((group) => group?.onebankid && group.type !== 'KID')
}

function adopt(list: OneBankGroup[]): void {
  groups.set(list)
  for (const group of list) registerGroup(group.onebankid)
}

/**
 * Seeds from the login payload, exactly what `MAIN.html` does on boot.
 *
 * Returns the group it made active, or `''` when there is none — the caller
 * decides what to do with that (open group management, in practice).
 */
export function seedFromLogin(): string {
  const data = get(loginData) as Record<string, any> | undefined
  const verified = isVerified(data?.USER?.idverified)
  idVerified.set(verified)

  if (!verified) {
    adopt([])
    groupsLoading.set(false)
    return ''
  }

  const list = usable(data?.ONEBANK?.groups)
  adopt(list)
  groupsLoading.set(false)

  // Boot picks the first group (MAIN.html:1754), unlike a refresh.
  const first = list[0]?.onebankid ?? ''
  if (first) selectGroup(first)
  return first
}

/**
 * Re-reads the group list from the core.
 *
 * Selection follows `MAIN.html:1564-1577`: honour `preferId` when it is still a
 * real group, otherwise keep the active group if it survived, otherwise take
 * the last one — the newly created group, by the core's convention.
 *
 * Returns the active group id, or `''` when the user has none left.
 */
export async function refreshGroups(preferId?: string): Promise<string> {
  if (!get(idVerified)) return ''

  groupsLoading.set(true)
  try {
    const response = await loadGroups()
    const list = usable(response?.groups)
    adopt(list)

    const has = (id: string | undefined): boolean =>
      Boolean(id) && list.some((group) => group.onebankid === id)

    const target = has(preferId) ? preferId! : has(get(currentGroup)) ? get(currentGroup) : (list[list.length - 1]?.onebankid ?? '')

    // Not `selectGroup`: a refresh runs while an overlay may still be open and
    // awaiting its result (`closePopup` refreshes on the way out), so it must
    // not tear the stack down underneath it.
    setActive(target)
    return target
  } finally {
    groupsLoading.set(false)
  }
}

function setActive(onebankid: string): void {
  registerGroup(onebankid)
  currentGroup.set(onebankid)
}

/**
 * Makes a group active in response to the user picking it.
 *
 * Overlays belong to the group that opened them, so an explicit switch clears
 * the stack. Callers navigate afterwards; this only moves state.
 */
export function selectGroup(onebankid: string): void {
  setActive(onebankid)
  popups.set([])
}
