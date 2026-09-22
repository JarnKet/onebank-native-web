/**
 * Mounts the real Router with the real route map and checks that a hash change
 * puts the right page on screen.
 *
 * Every Figma page is reachable by URL. A route marked native renders its
 * Svelte screen; the rest frame their legacy page until their core commands
 * are mapped (`src/lib/routes.ts`).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import Router from 'svelte-spa-router'
import routes from './index'
import { currentGroup } from '../stores/onebankGroups'
import { setTransport } from '../lib/api/client'
import { groups, groupsLoading, idVerified } from '../stores/groups'
import { env } from '../lib/env'

let host: HTMLElement
let app: Record<string, any> | null = null

async function goto(hash: string): Promise<void> {
  window.location.hash = hash
  await new Promise((resolve) => setTimeout(resolve, 0))
  await tick()
}

function iframe(): HTMLIFrameElement | null {
  return host.querySelector('iframe')
}

beforeEach(async () => {
  // Home now loads its own data. Without a stub the api client builds a real
  // Connector, and that generates a 2048-bit RSA keypair per test file.
  setTransport(async () => ({ result: 0 }))
  currentGroup.set('G-42')
  idVerified.set(true)
  groupsLoading.set(false)
  groups.set([{ onebankid: 'G-42' }])
  host = document.createElement('div')
  document.body.appendChild(host)
  await goto('')
  app = mount(Router, { target: host, props: { routes } })
  await tick()
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  host.remove()
})

describe('home', () => {
  it('renders no page iframe of its own', () => {
    expect(iframe()).toBeNull()
  })
})

describe('framed pages', () => {
  // Group management is the one route left framed: embedded pages still open
  // it by name, and the bridge sends its flags to the native screens.
  it('#/group-management loads GROUPMANAGEMENT.html', async () => {
    await goto('#/group-management')
    expect(iframe()?.getAttribute('src')).toContain('GROUPMANAGEMENT.html')
  })

  it('serves it from the onebank-ui origin, not b1hybrid', async () => {
    await goto('#/group-management')
    expect(iframe()?.getAttribute('src')).toContain(env.onebankPath)
    expect(iframe()?.getAttribute('src')).not.toContain(env.payloadPath)
  })

  it('carries the legacy query contract every embedded page expects', async () => {
    await goto('#/group-management')
    const src = iframe()?.getAttribute('src') ?? ''
    expect(src).toContain('isinbrowser=1')
    expect(src).toContain('isdesktop=1')
    expect(src).toContain('versioncode=')
  })

  it('fills onebankid from the active group', async () => {
    await goto('#/group-management')
    expect(iframe()?.getAttribute('src')).toContain('onebankid=G-42')
  })

  it('passes route params through to the page', async () => {
    await goto('#/group-management?newgroup=1&from=U7')
    const src = iframe()?.getAttribute('src') ?? ''
    expect(src).toContain('newgroup=1')
    expect(src).toContain('from=U7')
  })

  it('lets an explicit onebankid win over the active group', async () => {
    await goto('#/group-management?onebankid=OTHER')
    const src = iframe()?.getAttribute('src') ?? ''
    expect(src).toContain('onebankid=OTHER')
    expect(src).not.toContain('onebankid=G-42')
  })

  it('fills from the active group when the route sends an empty onebankid', async () => {
    await goto('#/group-management?onebankid=')
    expect(iframe()?.getAttribute('src')).toContain('onebankid=G-42')
  })

  it('positions itself, and is torn down on the way back to home', async () => {
    await goto('#/group-management')
    expect(host.querySelector('.route-frame iframe')).not.toBeNull()
    await goto('#/')
    expect(host.querySelector('.route-frame')).toBeNull()
  })
})

describe('the Figma screens the core contract lacks commands for', () => {
  // Native too: their commands go to the core first and fall back to the local
  // store (src/lib/api/local). None of them may frame a legacy page any more.
  const hashes = [
    '#/authorization',
    '#/authorization/history',
    '#/role',
    '#/statement',
    '#/transfer',
    '#/transfer/interbank',
    '#/transfer/idcard',
    '#/salary',
    '#/echeque',
    '#/bill/electricity',
    '#/bill/water',
    '#/topup',
    '#/accounts/detail',
    '#/rates/exchange',
    '#/rates/interest',
    '#/slips',
    '#/beneficiaries',
    '#/term-deposits',
    '#/loans',
    '#/settings/notifications',
  ]
  for (const hash of hashes) {
    it(`${hash} renders its native screen, not an iframe`, async () => {
      await goto(hash)
      expect(host.querySelectorAll('*').length).toBeGreaterThan(0)
      expect(iframe()).toBeNull()
    })
  }
})

describe('navigation', () => {
  it('swaps a framed page for a native one when the hash changes', async () => {
    await goto('#/group-management')
    expect(iframe()).not.toBeNull()
    await goto('#/role')
    expect(iframe()).toBeNull()
  })

  it('returns to the native home', async () => {
    await goto('#/group-management')
    expect(iframe()).not.toBeNull()
    await goto('#/')
    expect(iframe()).toBeNull()
  })

  it('falls back to home for an unknown path rather than a blank screen', async () => {
    await goto('#/nope')
    expect(iframe()).toBeNull()
  })
})

describe('the account route', () => {
  it('renders the native page rather than an iframe', async () => {
    await goto('#/account')
    expect(iframe()).toBeNull()
  })

  it('shows the account list', async () => {
    await goto('#/account')
    expect(host.textContent).toContain('Accounts')
  })
})

describe('the native routes', () => {
  for (const hash of ['#/messages', '#/member', '#/register', '#/group/join', '#/group/leave']) {
    it(`${hash} renders its screen rather than an iframe`, async () => {
      await goto(hash)
      expect(host.querySelectorAll('*').length).toBeGreaterThan(0)
      expect(iframe()).toBeNull()
    })
  }
})

describe('the group route', () => {
  it('renders the native page rather than an iframe', async () => {
    await goto('#/group')
    expect(iframe()).toBeNull()
  })

  it('shows the group form', async () => {
    await goto('#/group')
    expect(host.textContent).toContain('Group name')
  })
})

describe('the home route', () => {
  // Phase 1 had home render nothing, so MAIN.html showed through behind the
  // outlet. Phase 2 deleted that frame and home is a real page — the assertion
  // inverts rather than disappears.
  it('renders the native page rather than an empty outlet', async () => {
    await goto('#/')
    expect(host.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('renders it without an iframe', async () => {
    await goto('#/')
    expect(iframe()).toBeNull()
  })

  it('falls back to it for an unknown path', async () => {
    await goto('#/nope')
    expect(host.querySelectorAll('*').length).toBeGreaterThan(0)
    expect(iframe()).toBeNull()
  })
})
