/**
 * Logging in, staying logged in across a reload, and logging out.
 *
 * There is no core and no negotiated session any more: a login is whatever the
 * mock backend's `USER/login` returned. The payload is kept in
 * **sessionStorage** so a reload lands back in the app rather than on the login
 * screen — one tab, gone when the tab closes or the user logs out.
 */

import { get } from 'svelte/store'
import { loggedIn, loginData } from '../stores/session'
import { resetMockDb } from './api/mock'
import type { LoginData } from '../definition'

const STORAGE_KEY = 'onebank-login-v2'

function safeStorage(): Storage | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage
  } catch {
    // Storage disabled: the app still works, a login just does not survive a reload.
    return undefined
  }
}

/** Stores the login payload so the next page load can adopt it. */
export function rememberSession(storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(get(loginData)))
  } catch {
    // Quota or a storage that refuses: logged in, but only until a reload.
  }
}

export function forgetSession(storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // Nothing we can do.
  }
}

/**
 * Completes a login: publishes the payload, remembers it, opens the app.
 * Both login forms end here so that "what logging in means" lives in one place.
 */
export function completeLogin(data: LoginData): void {
  loginData.set(data)
  loggedIn.set(true)
  rememberSession()
}

/** Adopts a stored login, if there is one. Returns whether the app opens logged in. */
export function restoreSession(storage: Storage | undefined = safeStorage()): boolean {
  let stored: LoginData | null = null
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (raw) stored = JSON.parse(raw) as LoginData
  } catch {
    stored = null
  }
  if (!stored) return false
  loginData.set(stored)
  loggedIn.set(true)
  return true
}

/**
 * Ends the session and reloads.
 *
 * The reload is what reliably clears every store. Forgetting first is what
 * stops it restoring the session it was meant to end, and resetting the mock
 * data means the next login starts from a clean demo.
 */
export function logout(): void {
  forgetSession()
  resetMockDb()
  loggedIn.set(false)
  window.location.reload()
}
