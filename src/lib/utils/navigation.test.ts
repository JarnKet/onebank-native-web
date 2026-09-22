import { beforeEach, describe, expect, it } from 'vitest'
import { tick } from 'svelte'
import { router } from 'svelte-spa-router'
import { BCELONE_PAGES } from '../constant'
import { isRoutedPage } from '../routes'
import { currentPath, hasOverlays, isAtHome, navigateToMenu, navigateToPage } from './navigation'
import { popups } from '../../stores/popup'

/**
 * `push` is async in svelte-spa-router 5, and the router only picks the new
 * location up on `hashchange`. Wait for both before asserting.
 *
 * **Two macrotasks, not one.** jsdom assigns `window.location.hash`
 * synchronously but dispatches `hashchange` in a *later* task, so there is a
 * window where the hash already reads `#/role` while everything derived from
 * the event — `router.location`, and this app's own `routeLocation` store —
 * still reports the old path. One macrotask lands inside that window; the
 * assertions that read the hash directly pass there and the ones that read
 * listener state fail. Since `navigateToPage` does not await the async `push`,
 * exactly which task the assignment lands in shifts with any timing change
 * beneath us, so waiting for the event to be delivered is the only stable
 * thing to wait for.
 */
async function settle(): Promise<string> {
  await tick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
  return window.location.hash
}

beforeEach(async () => {
  window.location.hash = ''
  await settle()
  popups.set([])
})

describe('navigateToPage', () => {
  it('routes a page this app owns and reports it handled it', async () => {
    expect(navigateToPage('TRANSACTION.html')).toBe(true)
    expect(await settle()).toBe('#/messages')
  })

  it('declines a b1hybrid page so the caller opens an overlay instead', async () => {
    expect(navigateToPage('TWOFACTOR.html')).toBe(false)
    expect(await settle()).toBe('')
  })

  it('declines every b1hybrid page no native screen replaces', async () => {
    for (const page of BCELONE_PAGES.filter((candidate) => !isRoutedPage(candidate))) {
      expect(navigateToPage(page), page).toBe(false)
    }
    expect(await settle()).toBe('')
  })

  it('routes a b1hybrid page a native screen replaces', async () => {
    expect(navigateToPage('TRANSFER.html')).toBe(true)
    expect(await settle()).toBe('#/transfer')
  })

  it('carries object params into the hash querystring', async () => {
    navigateToPage('ROLE.html', { page: 'addpermission', newuserid: 'U7' })
    expect(await settle()).toBe('#/role?page=addpermission&newuserid=U7')
  })

  it('carries an already-encoded param string through unchanged', async () => {
    navigateToPage('GROUPMANAGEMENT.html', 'newgroup=1')
    expect(await settle()).toBe('#/group-management?newgroup=1')
  })

  it('encodes values that need it', async () => {
    navigateToPage('GROUP.html', { name: 'a b&c' })
    expect(await settle()).toContain('name=a%20b%26c')
  })

  it('omits the question mark when there are no params', async () => {
    navigateToPage('MEMBER.html')
    expect(await settle()).toBe('#/member')
  })
})

describe('navigateToMenu', () => {
  it('routes by sidebar menu id', async () => {
    expect(navigateToMenu('AUTHORIZATION')).toBe(true)
    expect(await settle()).toBe('#/authorization')
  })

  it('declines a menu with no route', async () => {
    expect(navigateToMenu('LOGOUT')).toBe(false)
  })
})

describe('location reporting', () => {
  it('reads back the active path without its querystring', async () => {
    navigateToPage('ROLE.html', { page: 'addpermission' })
    await settle()
    expect(router.location).toBe('/role')
    expect(currentPath()).toBe('/role')
  })

  it('treats an empty hash as home', async () => {
    expect(isAtHome()).toBe(true)
  })

  it('is not at home once a page is routed', async () => {
    navigateToPage('ACCOUNT.html')
    await settle()
    expect(isAtHome()).toBe(false)
  })
})

describe('overlay awareness', () => {
  it('reports no overlays on a clean stack', async () => {
    expect(hasOverlays()).toBe(false)
  })

  it('reports overlays once one is pushed', async () => {
    popups.set([{ id: '1', src: 'x', callbackid: null, isVisible: true, isBcelOne: true } as any])
    expect(hasOverlays()).toBe(true)
  })
})

describe('the routed set and the b1hybrid set', () => {
  it('overlap only where a native screen replaces the page', async () => {
    const { routeForPage } = await import('../routes')
    for (const page of BCELONE_PAGES.filter((candidate) => isRoutedPage(candidate))) {
      expect(routeForPage(page)?.native, page).toBe(true)
    }
  })
})
