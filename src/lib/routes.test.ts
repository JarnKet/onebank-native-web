import { describe, expect, it } from 'vitest'
import { BCELONE_PAGES, sidebarMenuItems } from './constant'
import { HOME_PATH, isRoutedPage, routeDefinitions, routeForMenu, routeForPage, routeForPath } from './routes'

describe('route table', () => {
  it('has unique paths', () => {
    const paths = routeDefinitions.map((r) => r.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('starts at the home path', () => {
    expect(routeForPath(HOME_PATH)?.menu).toBe('HOME')
  })

  it('covers every sidebar entry that opens a page', () => {
    const opensAPage = sidebarMenuItems.filter((m) => m.popupName !== '')
    for (const menu of opensAPage) {
      expect(routeForPage(`${menu.popupName}.html`), `no route for ${menu.popupName}`).toBeDefined()
    }
  })

  it('maps each sidebar menu id to a route', () => {
    for (const menu of sidebarMenuItems) {
      if (menu.id === 'LOGOUT') continue
      expect(routeForMenu(menu.id), `no route for menu ${menu.id}`).toBeDefined()
    }
  })

  it('sends a sidebar entry to the first route that claims it, not the last', () => {
    // `/group`, `/group-management` and `/register` all carry menu GROUP. A
    // Map built from pairs keeps the last, which sent the sidebar's Group entry
    // to REGISTERONEBANK.
    expect(routeForMenu('GROUP')?.path).toBe('/group')
  })

  it('resolves every menu to a route that actually declares it', () => {
    for (const menu of new Set(routeDefinitions.map((r) => r.menu))) {
      expect(routeForMenu(menu)?.menu, `menu ${menu} resolved elsewhere`).toBe(menu)
    }
  })
})

describe('page ownership', () => {
  it('owns the corporate OneBank pages', () => {
    for (const page of ['TRANSACTION.html', 'ROLE.html', 'MEMBER.html', 'GROUPMANAGEMENT.html']) {
      expect(isRoutedPage(page), page).toBe(true)
    }
  })

  it('is case-insensitive on the page name', () => {
    expect(isRoutedPage('role.html')).toBe(true)
  })

  it('never claims a b1hybrid page', () => {
    // b1hybrid stays iframed; claiming one of its pages as a route would break it.
    for (const page of BCELONE_PAGES) {
      expect(isRoutedPage(page), `${page} must stay an iframe`).toBe(false)
    }
  })

  it('does not claim the 2FA page onebank-ui depends on', () => {
    expect(isRoutedPage('TWOFACTOR.html')).toBe(false)
  })

  it('does not claim the main frame', () => {
    expect(isRoutedPage('MAIN.html')).toBe(false)
  })

  it('does not claim out-of-scope onebank-ui pages', () => {
    for (const page of ['ONEBANKKIDHOME.html', 'ONEBANKSTATEMENT.html', 'ECHEQUE.html']) {
      expect(isRoutedPage(page), page).toBe(false)
    }
  })
})
