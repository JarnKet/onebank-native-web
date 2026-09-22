/**
 * Keeping a login across a page reload.
 *
 * The core attaches a login to the session key negotiated by `getsession`, and
 * `Connector` holds that key and its password in memory. A reload therefore
 * used to mean a new handshake, an unauthenticated session and the login
 * screen — which is why logout is implemented as `window.location.reload()`.
 *
 * This stores the negotiated pair, plus the login payload the shell needs to
 * seed itself, in **sessionStorage**: it survives a reload, dies with the tab,
 * and is not shared with other tabs. That is a live credential at rest and any
 * script on the page can read it — the same exposure the device RSA key and
 * the saved password hash already carry in `localStorage`, but scoped to one
 * tab and to the core's own session lifetime.
 *
 * A restored session is never trusted on its face: `restoreSession` makes a
 * real request and falls back to the login screen when the core has expired it.
 */

import { get } from 'svelte/store'
import Connector from './utils/connector'
import { isOk } from './api/client'
import { loadGroups } from './api/commands'
import { resetLocalData } from './api/local'
import { loggedIn, loginData } from '../stores/session'
import { unauthenticatedPopups } from '../stores/popup'
import type { LoginData } from '../definition'

const STORAGE_KEY = 'onebank-session-v1'

interface PersistedSession {
  /** `Connector`'s session key. */
  key: string
  /** Its session password, hex-encoded. */
  password: string
  /** The login response payload, which seeds groups and the verification gate. */
  login: unknown
}

function safeStorage(): Storage | undefined {
  try {
    return typeof sessionStorage === 'undefined' ? undefined : sessionStorage
  } catch {
    // A browser with storage disabled: the app still works, logins just do not
    // survive a reload.
    return undefined
  }
}

/** Stores the current session so the next page load can adopt it. */
export function rememberSession(storage: Storage | undefined = safeStorage()): void {
  const session = Connector.exportSession()
  if (!session) return
  try {
    const persisted: PersistedSession = { ...session, login: get(loginData) }
    storage?.setItem(STORAGE_KEY, JSON.stringify(persisted))
  } catch {
    // Quota or a storage that refuses: the user is still logged in, they just
    // have to log in again after a reload.
  }
}

/** Removes the stored session. Logging out, or the core having expired it. */
export function forgetSession(storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do: there is no safe way to force a write we cannot make.
  }
}

/**
 * Completes a login: publishes the payload, remembers the session, opens the app.
 *
 * Both login forms end here so that "what logging in means" lives in one place.
 */
export function completeLogin(data: LoginData): void {
  loginData.set(data)
  // Unauthenticated popups are the pre-login helper pages — Customer Support and
  // friends. `App.svelte` renders them *instead of* the app, and that check runs
  // before the logged-in one, so one left open here replaces the whole shell
  // with a blank `#framecontainer` the moment the user signs in. Signing in
  // makes them meaningless, so they go.
  unauthenticatedPopups.set([])
  loggedIn.set(true)
  rememberSession()
}

/**
 * Restores a stored session, if there is one the core still honours.
 *
 * `validate` is the request used to prove the session is alive — injectable so
 * tests do not need a transport that answers `loadgroups` specifically.
 * Returns whether the app should open logged in.
 */
export async function restoreSession(
  storage: Storage | undefined = safeStorage(),
  validate: () => Promise<unknown> = loadGroups,
): Promise<boolean> {
  let persisted: PersistedSession | null = null
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (raw) persisted = JSON.parse(raw) as PersistedSession
  } catch {
    persisted = null
  }
  if (!persisted?.key || !persisted.password) return false

  Connector.adoptSession(persisted.key, persisted.password)
  loginData.set(persisted.login as LoginData)

  let response: any
  try {
    response = await validate()
  } catch {
    response = null
  }

  // Anything but a clear success means log in again. An expired session and an
  // unreachable core are the same thing from here, and the other guess leaves
  // the user inside an app that cannot talk to anything.
  if (!isOk(response)) {
    forgetSession(storage)
    Connector.clearSession()
    loggedIn.set(false)
    return false
  }

  loggedIn.set(true)
  return true
}

/**
 * Ends the session and reloads.
 *
 * The reload is how this app has always logged out — it is the one thing that
 * reliably clears every store and every iframe. Forgetting first is what stops
 * the reload from restoring the session it was meant to end.
 */
export function logout(): void {
  forgetSession()
  // What was kept locally for commands the core did not answer belongs to this login.
  resetLocalData()
  Connector.clearSession()
  loggedIn.set(false)
  window.location.reload()
}
