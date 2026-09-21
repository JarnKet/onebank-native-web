/**
 * The app must never render as a blank white page, and a login must survive a
 * reload without the login form flashing first.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import { get } from 'svelte/store'
import { completeLogin, forgetSession, restoreSession } from './lib/session'
import { loggedIn, loginData } from './stores/session'
import PrimaryLoadingSpinner from './components/PrimaryLoadingSpinner.svelte'
import SecondaryLoadingSpinner from './components/SecondaryLoadingSpinner.svelte'

let host: HTMLElement
let app: Record<string, any> | null = null

async function settle(): Promise<void> {
  await tick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await tick()
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  sessionStorage.clear()
  loggedIn.set(false)
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  host.remove()
  loggedIn.set(false)
})

describe('signing in', () => {
  it('opens the app and remembers the login for a reload', () => {
    completeLogin({ name: 'Somchai' } as any)
    expect(get(loggedIn)).toBe(true)

    loggedIn.set(false)
    loginData.set(undefined as any)
    expect(restoreSession()).toBe(true)
    expect(get(loggedIn)).toBe(true)
    expect((get(loginData) as any).name).toBe('Somchai')
  })

  it('does not restore a login that was forgotten', () => {
    completeLogin({ name: 'Somchai' } as any)
    forgetSession()
    loggedIn.set(false)
    expect(restoreSession()).toBe(false)
    expect(get(loggedIn)).toBe(false)
  })
})

describe('the spinners', () => {
  it('the grey one is not white on a near-white page', async () => {
    app = mount(SecondaryLoadingSpinner, { target: host })
    await settle()
    expect((host.firstElementChild as HTMLElement).className).not.toContain('border-white')
  })

  it('the button one stays white where the background is dark', async () => {
    app = mount(PrimaryLoadingSpinner, { target: host })
    await settle()
    expect((host.firstElementChild as HTMLElement).className).toContain('border-white')
  })
})
