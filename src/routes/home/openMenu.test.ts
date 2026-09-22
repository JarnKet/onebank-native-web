/**
 * The menu grid is HOME's whole job, and the dispatch it performs is the seam
 * the migration moves: a page this app owns becomes a URL, everything else
 * opens as a b1hybrid iframe overlay. Getting this wrong either strands the
 * user on a blank route or re-frames a page we already migrated.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { tick } from 'svelte'
import { get } from 'svelte/store'
import { menus } from '../../lib/menus'
import { BCELONE_PAGES } from '../../lib/constant'
import { popups } from '../../stores/popup'
import { currentGroup, onebankGroups } from '../../stores/onebankGroups'
import { isUsable, menuParams, openMenu, pageNameFor } from './openMenu'
import { isRoutedPage } from '../../lib/routes'

function hash(): string {
  return window.location.hash
}

// `push` awaits a tick before assigning the hash, so routing settles a
// microtask after `openMenu` returns.
async function settle(): Promise<void> {
  await tick()
  await tick()
}

const HOME_PAYLOAD = {
  result: 0,
  accounts: [
    { accountid: '1', account: '010123456789012345', status: 'ACTIVE', ccy: 'LAK' },
    { accountid: '2', account: '010999999999999999', status: 'CLOSED', ccy: 'LAK' },
  ],
  users: [],
  detail: { onebankid: 'G-1', name: 'Acme', detail: 'Acme Co', logoname: 'logo.png' },
}

beforeEach(() => {
  window.location.hash = '#/'
  popups.set([])
  currentGroup.set('G-1')
  onebankGroups.set({ 'G-1': { isFinishLoad: true, loadHomeResult: HOME_PAYLOAD as any } })
})

describe('page name resolution', () => {
  it('uses the key when the registry names no override', () => {
    expect(pageNameFor('STATEMENT')).toBe('STATEMENT')
  })

  it('honours popupname, which is how providers share one page', () => {
    // The Securities providers all open SECURITIES.html with a providercode.
    expect(pageNameFor('0002')).toBe('SECURITIES')
  })

  // Two renames live in the mobile grid and are easy to lose in a port; without
  // them the user lands on a page the core no longer serves.
  it('applies the LANDTAX and PHONE renames', () => {
    expect(pageNameFor('LANDTAX')).toBe('LANDTAXNEW')
    expect(pageNameFor('PHONE')).toBe('NEWPHONE')
  })
})

describe('dispatch', () => {
  it('routes a page this app owns instead of framing it', async () => {
    expect(openMenu('TRANSACTION')).toBe(true)
    await settle()
    expect(hash()).toContain('/messages')
    expect(get(popups)).toHaveLength(0)
  })

  it('opens a native screen for a b1hybrid page it replaces', async () => {
    expect(openMenu('STATEMENT')).toBe(true)
    await settle()
    expect(get(popups)).toHaveLength(0)
    expect(hash()).toBe('#/statement')
  })

  it('opens every Figma service tile on its native screen', async () => {
    const tiles: Array<[string, string]> = [
      ['TRANSFER', '#/transfer'],
      ['ONEBANKTRANSFER', '#/transfer'],
      ['IBANKSALARY', '#/salary'],
      ['ECHEQUE', '#/echeque'],
      ['ELECTRICITY', '#/bill/electricity'],
      ['WATER', '#/bill/water'],
      ['PHONE', '#/topup'],
      ['IBANKINTERNATIONALTRANSFER', '#/transfer/interbank'],
      ['IBANKTRANFERIDCARD', '#/transfer/idcard'],
      ['IBANKACCOUNTDETAIL', '#/accounts/detail'],
      ['IBANKEXCHANGERATES', '#/rates/exchange'],
      ['IBANKINTERESTRATES', '#/rates/interest'],
      ['IBANKSLIP', '#/slips'],
      ['IBANKDESTINATIONACCOUNT', '#/beneficiaries'],
      ['IBANKTERMDEPOSITACCOUNT', '#/term-deposits'],
      ['IBANKLOANACCOUNT', '#/loans'],
      ['IBANKNOTIFICATIONSETTING', '#/settings/notifications'],
      ['AUTHORIZATION', '#/authorization'],
      ['ROLE', '#/role'],
    ]
    for (const [key, target] of tiles) {
      popups.set([])
      window.location.hash = '#/'
      openMenu(key)
      await settle()
      expect(hash(), key).toBe(target)
      expect(get(popups), `${key} should route, not overlay`).toHaveLength(0)
    }
  })

  it('still overlays a b1hybrid page no native screen replaces', () => {
    for (const key of Object.keys(menus)) {
      const page = `${pageNameFor(key)}.html`
      if (!BCELONE_PAGES.includes(page) || isRoutedPage(page)) continue
      popups.set([])
      window.location.hash = '#/'
      openMenu(key)
      expect(get(popups), `${key} should overlay, not route`).toHaveLength(1)
    }
  })

  it('reports an unknown key rather than opening a broken page', () => {
    expect(openMenu('NOT_A_MENU')).toBe(false)
    expect(get(popups)).toHaveLength(0)
  })

  it('carries the registry params through, so a provider is identified', () => {
    openMenu('0002')
    expect(get(popups)[0].src).toContain('providercode=0002')
  })
})

describe('the parameter bundle every launched page expects', () => {
  it('passes only ACTIVE accounts', () => {
    const accounts = menuParams().accounts as any[]
    expect(accounts).toHaveLength(1)
    expect(accounts[0].accountid).toBe('1')
  })

  it('masks each account, because the receiving page renders it verbatim', () => {
    const accounts = menuParams().accounts as any[]
    expect(accounts[0].maskedAccount).toBe('010-12-34xxxxx-012-345')
    expect(accounts[0].maskedAccount).not.toBe(accounts[0].account)
  })

  it('carries the group identity', () => {
    const params = menuParams()
    expect(params.onebankname).toBe('Acme')
    expect(params.onebanklogoname).toBe('logo.png')
  })

  it('falls back to defaults before the home payload arrives', () => {
    onebankGroups.set({})
    expect(menuParams().onebankname).toBe('OneBank')
    expect(menuParams().accounts).toEqual([])
  })
})

describe('permission gating', () => {
  it('treats * as everything allowed', () => {
    expect(isUsable(['*'], 'ANYTHING')).toBe(true)
  })

  it('allows a named menu and denies an unnamed one', () => {
    expect(isUsable(['STATEMENT'], 'STATEMENT')).toBe(true)
    expect(isUsable(['STATEMENT'], 'TRANSFER')).toBe(false)
  })

  it('denies everything when the group sent no list', () => {
    expect(isUsable(undefined, 'STATEMENT')).toBe(false)
  })
})

/**
 * A rename is only half a decision: the page it points at still has to be on
 * the b1hybrid allowlist, or `buildPopupUrl` sends it to onebank-ui, which has
 * no such page. The overlay then loads a 404 and shows a blank frame.
 */
describe('renamed pages resolve to a real origin', () => {
  it('puts every rename target on the b1hybrid allowlist', () => {
    const targets = ['LANDTAXNEW', 'ELECTRICITYNEW']
    const missing = targets.filter((page) => !BCELONE_PAGES.includes(`${page}.html`))
    expect(missing, 'these would be requested from onebank-ui, which does not serve them').toEqual([])
  })
})
