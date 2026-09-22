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

  it('maps each sidebar menu id to a route', () => {
    for (const menu of sidebarMenuItems) {
      if (menu.id === 'LOGOUT') continue
      expect(routeForMenu(menu.id), `no route for menu ${menu.id}`).toBeDefined()
    }
  })

  it('sends a sidebar entry to its main page, not a sub-page sharing its highlight', () => {
    expect(routeForMenu('MESSAGE')?.path).toBe('/messages')
  })

  it('matches parameterised paths', () => {
    expect(routeForPath('/messages/123')?.menu).toBe('MESSAGE')
    expect(routeForPath('/nowhere')).toBeUndefined()
  })

  it('gives every non-native route a legacy page to frame', () => {
    for (const definition of routeDefinitions.filter((r) => !r.native)) {
      expect(definition.page, `${definition.path} would frame nothing`).toMatch(/\.html$/)
    }
  })
})

describe('page ownership', () => {
  it('owns the pages its native screens replace', () => {
    for (const page of ['TRANSACTION.html', 'ACCOUNT.html', 'MEMBER.html', 'GROUP.html', 'REGISTERONEBANK.html']) {
      expect(routeForPage(page)?.native, page).toBe(true)
    }
  })

  it('owns the onebank-ui pages its native screens replace', () => {
    expect(routeForPage('ROLE.html')?.path).toBe('/role')
    expect(routeForPage('AUTHORIZATION.html')?.path).toBe('/authorization')
  })

  it('owns the b1hybrid pages its native screens replace', () => {
    const owned: Array<[string, string]> = [
      ['STATEMENT.html', '/statement'],
      ['TRANSFER.html', '/transfer'],
      ['ELECTRICITY.html', '/bill/electricity'],
      ['WATER.html', '/bill/water'],
      ['PHONE.html', '/topup'],
    ]
    for (const [page, path] of owned) expect(routeForPage(page)?.path, page).toBe(path)
  })

  it('owns the aliases menu tiles open', () => {
    const aliases: Array<[string, string]> = [
      ['NEWPHONE.html', '/topup'],
      ['ONEBANKTRANSFER.html', '/transfer'],
      ['ONEBANKSTATEMENT.html', '/statement'],
      ['ONEBANKELECTRICITY.html', '/bill/electricity'],
      ['ONEBANKWATER.html', '/bill/water'],
      ['SWIFTTRANSFER.html', '/transfer/interbank'],
    ]
    for (const [page, path] of aliases) expect(routeForPage(page)?.path, page).toBe(path)
  })

  it('is case-insensitive on the page name', () => {
    expect(isRoutedPage('role.html')).toBe(true)
  })

  it('never claims a b1hybrid page while its route is not native', () => {
    // b1hybrid pages run as popups that hand results back; routing one would drop them.
    for (const page of BCELONE_PAGES) {
      const route = routeForPage(page)
      if (route) expect(route.native, `${page} is claimed by a framed route`).toBe(true)
    }
  })

  it('mounts every Figma screen natively', () => {
    const figma = [
      '/authorization', '/authorization/history', '/role', '/statement', '/transfer', '/transfer/interbank',
      '/transfer/idcard', '/salary', '/echeque', '/bill/electricity', '/bill/water', '/topup',
    ]
    for (const path of figma) expect(routeForPath(path)?.native, path).toBe(true)
  })

  it('owns every iBank tile page, on a native screen', () => {
    const ibank: Array<[string, string]> = [
      ['IBANKACCOUNTDETAIL.html', '/accounts/detail'],
      ['IBANKEXCHANGERATES.html', '/rates/exchange'],
      ['IBANKINTERESTRATES.html', '/rates/interest'],
      ['IBANKSLIP.html', '/slips'],
      ['IBANKDESTINATIONACCOUNT.html', '/beneficiaries'],
      ['IBANKTERMDEPOSITACCOUNT.html', '/term-deposits'],
      ['IBANKLOANACCOUNT.html', '/loans'],
      ['IBANKNOTIFICATIONSETTING.html', '/settings/notifications'],
    ]
    for (const [page, path] of ibank) {
      expect(routeForPage(page)?.path, page).toBe(path)
      expect(routeForPage(page)?.native, page).toBe(true)
    }
  })

  it('frames only group management', () => {
    expect(routeDefinitions.filter((r) => !r.native).map((r) => r.path)).toEqual(['/group-management'])
  })
})
