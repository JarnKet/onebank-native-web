/**
 * The app must never render as a blank white page.
 *
 * Every failure mode here looked identical from the outside — nothing on screen,
 * nothing in the console — and two of them were reachable in normal use:
 *
 *   1. An unauthenticated popup (Customer Support and friends) left open across
 *      a successful login. `App.svelte` checks that branch *before* the
 *      logged-in one, so it replaced the whole shell with a fixed, white
 *      `#framecontainer` holding one iframe.
 *   2. The boot state, whose spinner was `border-white` on a `#f9fafb` page.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import { get } from 'svelte/store'
import { completeLogin } from './lib/session'
import { unauthenticatedPopups } from './stores/popup'
import { loggedIn } from './stores/session'
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
  unauthenticatedPopups.set([])
  loggedIn.set(false)
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  host.remove()
  unauthenticatedPopups.set([])
  loggedIn.set(false)
  vi.restoreAllMocks()
})

describe('signing in', () => {
  it('retires any unauthenticated popup left open', () => {
    // Exactly what clicking Customer Support on the login screen leaves behind.
    unauthenticatedPopups.set([
      { id: 'x1', src: 'http://core/b1hybrid/ONECARE.html', isVisible: true, isBcelOne: true },
    ])

    completeLogin({ name: 'Somchai' } as any)

    expect(
      get(unauthenticatedPopups),
      'a pre-login popup survived the login and will hide the whole app',
    ).toEqual([])
    expect(get(loggedIn)).toBe(true)
  })
})

describe('the boot spinner', () => {
  it('is not white on a near-white page', async () => {
    // `PrimaryLoadingSpinner` is for the red submit button. On the page
    // background it is invisible, which is a blank screen by another name.
    app = mount(SecondaryLoadingSpinner, { target: host })
    await settle()

    const className = (host.firstElementChild as HTMLElement).className
    expect(className, 'the boot spinner would be invisible on the page').not.toContain('border-white')
  })

  it('still uses the white spinner where the background is dark', async () => {
    // Guards the other direction: the button spinner must stay white.
    app = mount(PrimaryLoadingSpinner, { target: host })
    await settle()

    expect((host.firstElementChild as HTMLElement).className).toContain('border-white')
  })
})
