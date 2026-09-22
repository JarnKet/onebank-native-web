/**
 * A login survives a reload, and only a login the core still honours does.
 *
 * `Connector` is the real class here — these tests drive its session statics
 * through the public export/adopt/clear surface, which is what a reload
 * actually exercises.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { get } from 'svelte/store'
import Connector from './utils/connector'
import { completeLogin, forgetSession, logout, rememberSession, restoreSession } from './session'
import { loggedIn, loginData, sessionKey } from '../stores/session'
import type { LoginData } from '../definition'

const KEY = 'onebank-session-v1'
const LOGIN = { USER: { idverified: 'Y' }, ONEBANK: { groups: [{ onebankid: 'G1' }] } } as unknown as LoginData

/** A `Storage` backed by a plain object, so a test never touches the real one. */
function fakeStorage(seed: Record<string, string> = {}): Storage {
  const entries = new Map(Object.entries(seed))
  return {
    get length() {
      return entries.size
    },
    clear: () => entries.clear(),
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    removeItem: (key: string) => void entries.delete(key),
    setItem: (key: string, value: string) => void entries.set(key, value),
  }
}

/** Puts a live session on `Connector`, as the handshake would. */
function negotiated(): void {
  Connector.adoptSession('SK-1', 'a1b2c3d4')
}

beforeEach(() => {
  Connector.clearSession()
  loginData.set(undefined as unknown as LoginData)
  loggedIn.set(false)
})

afterEach(() => {
  Connector.clearSession()
})

describe('remembering', () => {
  it('stores the session key, its password and the login payload', () => {
    const storage = fakeStorage()
    negotiated()
    loginData.set(LOGIN)

    rememberSession(storage)

    const stored = JSON.parse(storage.getItem(KEY) as string)
    expect(stored).toMatchObject({ key: 'SK-1', password: 'a1b2c3d4' })
    expect(stored.login).toMatchObject({ USER: { idverified: 'Y' } })
  })

  it('stores nothing when there is no session to store', () => {
    const storage = fakeStorage()
    rememberSession(storage)
    expect(storage.getItem(KEY)).toBeNull()
  })

  it('completing a login opens the app and remembers it', () => {
    negotiated()
    completeLogin(LOGIN)

    expect(get(loggedIn)).toBe(true)
    expect(get(loginData)).toBe(LOGIN)
    expect(sessionStorage.getItem(KEY)).not.toBeNull()
  })
})

describe('restoring', () => {
  it('adopts the stored session and opens the app when the core still honours it', async () => {
    const storage = fakeStorage({ [KEY]: JSON.stringify({ key: 'SK-1', password: 'a1b2c3d4', login: LOGIN }) })

    const restored = await restoreSession(storage, async () => ({ result: 0, groups: [] }))

    expect(restored).toBe(true)
    expect(get(loggedIn)).toBe(true)
    expect(get(loginData)).toMatchObject({ USER: { idverified: 'Y' } })
    // The whole point: requests go out on the session the reload inherited.
    expect(Connector.currentSessionKey).toBe('SK-1')
    expect(get(sessionKey)).toBe('SK-1')
  })

  it('drops to the login screen when the core has expired the session', async () => {
    const storage = fakeStorage({ [KEY]: JSON.stringify({ key: 'SK-1', password: 'a1b2c3d4', login: LOGIN }) })

    const restored = await restoreSession(storage, async () => ({ result: 3, message: 'session expired' }))

    expect(restored).toBe(false)
    expect(get(loggedIn)).toBe(false)
    expect(storage.getItem(KEY)).toBeNull()
    // Left in place, the dead key would be sent with every later request.
    expect(Connector.currentSessionKey).toBeNull()
  })

  it('drops to the login screen when the validating request throws', async () => {
    const storage = fakeStorage({ [KEY]: JSON.stringify({ key: 'SK-1', password: 'a1b2c3d4', login: LOGIN }) })

    const restored = await restoreSession(storage, async () => {
      throw new Error('network down')
    })

    expect(restored).toBe(false)
    expect(get(loggedIn)).toBe(false)
  })

  it('does nothing when there is nothing stored', async () => {
    let validated = false
    const restored = await restoreSession(fakeStorage(), async () => {
      validated = true
      return { result: 0 }
    })

    expect(restored).toBe(false)
    expect(validated).toBe(false)
    expect(get(loggedIn)).toBe(false)
  })

  it('ignores a corrupt entry rather than throwing on boot', async () => {
    const restored = await restoreSession(fakeStorage({ [KEY]: 'not json' }), async () => ({ result: 0 }))
    expect(restored).toBe(false)
  })

  it('ignores an entry with no session in it', async () => {
    const storage = fakeStorage({ [KEY]: JSON.stringify({ login: LOGIN }) })
    const restored = await restoreSession(storage, async () => ({ result: 0 }))
    expect(restored).toBe(false)
  })
})

describe('forgetting', () => {
  it('removes the stored session', () => {
    const storage = fakeStorage({ [KEY]: '{}' })
    forgetSession(storage)
    expect(storage.getItem(KEY)).toBeNull()
  })

  it('logging out forgets before the reload that would restore it', () => {
    negotiated()
    completeLogin(LOGIN)
    expect(sessionStorage.getItem(KEY)).not.toBeNull()

    // jsdom refuses to navigate, so the reload itself is out of scope; what
    // matters is the state it would leave behind.
    try {
      logout()
    } catch {
      // "Not implemented: navigation" — the reload, not a failure.
    }

    expect(sessionStorage.getItem(KEY)).toBeNull()
    expect(Connector.currentSessionKey).toBeNull()
    expect(get(loggedIn)).toBe(false)
  })
})
