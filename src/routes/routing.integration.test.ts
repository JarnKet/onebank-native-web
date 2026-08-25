/**
 * Mounts the real Router with the real route map and checks that a hash change
 * puts the right page on screen.
 *
 * Every page is reachable by URL. Home is native as of Phase 2, GROUP and
 * ACCOUNT as of Phase 3; the rest are still iframed and flip one at a time in
 * Phases 3-4.
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

describe('routed pages', () => {
  const cases: Array<[string, string]> = [
    ['#/transaction', 'TRANSACTION.html'],
    ['#/authorization', 'AUTHORIZATION.html'],
    ['#/role', 'ROLE.html'],
    ['#/member', 'MEMBER.html'],
    ['#/group-management', 'GROUPMANAGEMENT.html'],
    ['#/register', 'REGISTERONEBANK.html'],
  ]

  for (const [hash, page] of cases) {
    it(`${hash} loads ${page}`, async () => {
      await goto(hash)
      const src = iframe()?.getAttribute('src') ?? ''
      expect(src).toContain(page)
    })
  }

  it('serves routed pages from the onebank-ui origin, not b1hybrid', async () => {
    await goto('#/role')
    expect(iframe()?.getAttribute('src')).toContain(env.onebankPath)
    expect(iframe()?.getAttribute('src')).not.toContain(env.payloadPath)
  })

  it('carries the legacy query contract every embedded page expects', async () => {
    await goto('#/transaction')
    const src = iframe()?.getAttribute('src') ?? ''
    expect(src).toContain('isinbrowser=1')
    expect(src).toContain('isdesktop=1')
    expect(src).toContain('versioncode=')
  })

  it('fills onebankid from the active group', async () => {
    await goto('#/member')
    expect(iframe()?.getAttribute('src')).toContain('onebankid=G-42')
  })

  it('passes route params through to the page', async () => {
    await goto('#/role?page=addpermission&newuserid=U7')
    const src = iframe()?.getAttribute('src') ?? ''
    expect(src).toContain('page=addpermission')
    expect(src).toContain('newuserid=U7')
  })

  it('lets an explicit onebankid win over the active group', async () => {
    await goto('#/member?onebankid=OTHER')
    const src = iframe()?.getAttribute('src') ?? ''
    expect(src).toContain('onebankid=OTHER')
    expect(src).not.toContain('onebankid=G-42')
  })
})

describe('navigation', () => {
  it('swaps the page when the hash changes', async () => {
    await goto('#/transaction')
    expect(iframe()?.getAttribute('src')).toContain('TRANSACTION.html')
    await goto('#/role')
    expect(iframe()?.getAttribute('src')).toContain('ROLE.html')
  })

  it('returns to the native home', async () => {
    await goto('#/role')
    expect(iframe()).not.toBeNull()
    await goto('#/')
    expect(iframe()).toBeNull()
  })

  it('falls back to home for an unknown path rather than a blank screen', async () => {
    await goto('#/nope')
    expect(iframe()).toBeNull()
  })
})

describe('onebankid fallback', () => {
  it('fills from the active group when the route sends an empty one', async () => {
    await goto('#/member?onebankid=')
    expect(iframe()?.getAttribute('src')).toContain('onebankid=G-42')
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

  it('positions a routed page itself once a route has content', async () => {
    await goto('#/role')
    const frame = host.querySelector('.route-frame')
    expect(frame).not.toBeNull()
    expect(frame?.querySelector('iframe')).not.toBeNull()
  })

  it('tears that page down again on the way back to home', async () => {
    await goto('#/role')
    expect(host.querySelector('.route-frame')).not.toBeNull()
    await goto('#/')
    expect(host.querySelector('.route-frame')).toBeNull()
  })
})
