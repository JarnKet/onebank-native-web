/**
 * Loading a group's home payload, for whichever screen needs it.
 *
 * The shell's group card, the sidebar and most pages read `loadHomeResult`.
 * It used to be fetched only by the home route, so a deep link to `#/account`
 * rendered an empty group card until the user visited home. The layout now
 * calls `loadGroupHome` whenever the active group changes, and a page that
 * changed the group (an account added, a member removed) calls `reloadHome`.
 */

import { get, writable } from 'svelte/store'
import { loadHome } from '../lib/api/commands'
import { adoptLoadHomeResult, currentGroup, onebankGroups } from './onebankGroups'

/** The message of the last failed load, or '' — the home route shows it. */
export const homeError = writable('')
export const homeLoading = writable(false)

const inFlight = new Map<string, Promise<boolean>>()

/**
 * Loads `onebankid`'s home unless it is already cached. Concurrent callers
 * share one request; the cache entry is cleared in `finally` so one failure
 * cannot wedge every later attempt.
 */
export function loadGroupHome(onebankid: string, force = false): Promise<boolean> {
  if (!onebankid) return Promise.resolve(false)
  if (!force && get(onebankGroups)[onebankid]?.isFinishLoad) return Promise.resolve(true)
  const pending = inFlight.get(onebankid)
  if (pending) return pending

  const request = (async () => {
    homeLoading.set(true)
    homeError.set('')
    try {
      const response = await loadHome(onebankid)
      if (response?.result === 0) return adoptLoadHomeResult(response as any)
      homeError.set(response?.message || 'Unable to load data')
      return false
    } catch (error) {
      homeError.set((error as Error)?.message || 'Unable to load data')
      return false
    } finally {
      homeLoading.set(false)
      inFlight.delete(onebankid)
    }
  })()
  inFlight.set(onebankid, request)
  return request
}

/** Re-reads the active group's home after something changed it. */
export function reloadHome(): Promise<boolean> {
  return loadGroupHome(get(currentGroup), true)
}
