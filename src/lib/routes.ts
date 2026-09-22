/**
 * The route table: every screen in the app, and whether it is native.
 *
 * Every Figma page has a route and is native (`native: true` mounts its Svelte
 * screen). A route with `native: false` renders its legacy page (`page`) — a
 * b1hybrid or onebank-ui page — in an iframe instead; only group management is
 * left like that, for embedded pages that still ask for it by name. Screens
 * whose commands the core contract lacks are native too: those commands go to
 * the core first and fall back to the local store (`src/lib/api/local`).
 *
 * `page` is also how the rest of the app speaks: menu tiles, the bridge and
 * embedded frames ask for pages by name (`ROLE.html`), and `routeForPage`
 * decides whether that name is a route here or an iframe overlay.
 */

import type { SidebarMenuTitle } from '../definition'
import { BCELONE_PAGES } from './constant'

export interface RouteDefinition {
  /** Hash path, e.g. `/statement`. May carry `:param` segments. */
  path: string
  /** Legacy page name this route stands for, e.g. `ROLE.html`; '' for none. */
  page: string
  /**
   * Other page names that open this route: the OneBank-branded variants of a
   * service (`ONEBANKTRANSFER.html`) and registry renames (`NEWPHONE.html`).
   * Only a native route claims them.
   */
  aliases?: string[]
  /** Sidebar entry to highlight while this route is active, if any. */
  menu: SidebarMenuTitle | null
  /** True when the route mounts its native Svelte screen instead of an iframe. */
  native: boolean
  /**
   * Drawn without the group/nav column, as the design draws the group
   * management screens: they are about *which* group, not inside one.
   */
  fullWidth?: boolean
}

export const HOME_PATH = '/'

export const routeDefinitions: RouteDefinition[] = [
  { path: HOME_PATH, page: '', menu: 'HOME', native: true },
  // Native on `viewtransactions` — the data the old TRANSACTION page showed.
  { path: '/messages', page: 'TRANSACTION.html', menu: 'MESSAGE', native: true },
  { path: '/messages/:id', page: '', menu: 'MESSAGE', native: true },
  // The screens from here down call commands the core contract lacks; those
  // are sent to the core first and answered locally when it cannot
  // (src/lib/api/local), so they are native too.
  { path: '/authorization', page: 'AUTHORIZATION.html', menu: 'AUTHORIZATION', native: true },
  { path: '/authorization/history', page: '', menu: 'AUTHORIZATION', native: true },
  { path: '/role', page: 'ROLE.html', menu: 'ROLE', native: true },
  { path: '/account', page: 'ACCOUNT.html', menu: 'ACCOUNT', native: true },
  { path: '/member', page: 'MEMBER.html', menu: 'MEMBER', native: true },
  { path: '/group', page: 'GROUP.html', menu: 'GROUP', native: true },
  { path: '/register', page: 'REGISTERONEBANK.html', menu: null, native: true, fullWidth: true },
  { path: '/group/join', page: '', menu: null, native: true, fullWidth: true },
  { path: '/group/leave', page: '', menu: null, native: true, fullWidth: true },
  // Kept for embedded pages that still open group management by name; the
  // bridge sends its flags to the native screens above (FrameContainer).
  { path: '/group-management', page: 'GROUPMANAGEMENT.html', menu: null, native: false },
  { path: '/statement', page: 'STATEMENT.html', aliases: ['ONEBANKSTATEMENT.html', 'HISTORY.html'], menu: null, native: true },
  {
    path: '/transfer',
    page: 'TRANSFER.html',
    aliases: ['ONEBANKTRANSFER.html', 'MYACCOUNTTRANSFER.html'],
    menu: null,
    native: true,
  },
  {
    path: '/transfer/interbank',
    page: 'IBANKINTERNATIONALTRANSFER.html',
    aliases: ['SWIFTTRANSFER.html'],
    menu: null,
    native: true,
  },
  { path: '/transfer/idcard', page: 'IBANKTRANFERIDCARD.html', menu: null, native: true },
  { path: '/salary', page: 'IBANKSALARY.html', menu: null, native: true },
  { path: '/echeque', page: 'ECHEQUE.html', menu: null, native: true },
  { path: '/bill/electricity', page: 'ELECTRICITY.html', aliases: ['ONEBANKELECTRICITY.html'], menu: null, native: true },
  { path: '/bill/water', page: 'WATER.html', aliases: ['ONEBANKWATER.html'], menu: null, native: true },
  {
    path: '/topup',
    page: 'PHONE.html',
    // `PHONE` opens `NEWPHONE` (PAGE_RENAMES in routes/home/openMenu.ts).
    aliases: ['NEWPHONE.html', 'ONEBANKPHONE.html', 'ONEBANKUTILITIES.html'],
    menu: null,
    native: true,
  },
  // The iBanking tiles. No Figma frames; built from the design's patterns
  // (DESIGN.md). Their onebank-ui pages only ever ran on mock data.
  { path: '/accounts/detail', page: 'IBANKACCOUNTDETAIL.html', menu: null, native: true },
  { path: '/rates/exchange', page: 'IBANKEXCHANGERATES.html', menu: null, native: true },
  { path: '/rates/interest', page: 'IBANKINTERESTRATES.html', menu: null, native: true },
  { path: '/slips', page: 'IBANKSLIP.html', menu: null, native: true },
  { path: '/beneficiaries', page: 'IBANKDESTINATIONACCOUNT.html', menu: null, native: true },
  { path: '/term-deposits', page: 'IBANKTERMDEPOSITACCOUNT.html', menu: null, native: true },
  { path: '/loans', page: 'IBANKLOANACCOUNT.html', menu: null, native: true },
  { path: '/settings/notifications', page: 'IBANKNOTIFICATIONSETTING.html', menu: null, native: true },
]

/** `/messages/:id` -> a regex that matches `/messages/M3`. */
function matcher(path: string): RegExp {
  const pattern = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\/:[^/]+/g, '/[^/]+')
  return new RegExp(`^${pattern}$`)
}

const compiled = routeDefinitions.map((definition) => ({ definition, regex: matcher(definition.path) }))

/**
 * Which page names a route claims.
 *
 * A b1hybrid page is claimed only by a *native* route. While its route still
 * renders the legacy page, a tile for it must keep opening the page as an
 * overlay: b1hybrid pages are built to run as popups that return results
 * through `callbackid`, and routing them instead would drop those results.
 * The flip side, once a route is native: a b1hybrid page that opens one of
 * these by name expecting a `callbackid` result gets the native screen, which
 * returns none. Aliases are claimed by native routes only, for the same reason.
 */
const byPage = new Map<string, RouteDefinition>()
for (const definition of routeDefinitions) {
  if (definition.page && (definition.native || !BCELONE_PAGES.includes(definition.page))) {
    byPage.set(definition.page.toUpperCase(), definition)
  }
  if (!definition.native) continue
  for (const alias of definition.aliases ?? []) if (!byPage.has(alias.toUpperCase())) byPage.set(alias.toUpperCase(), definition)
}

// First definition wins, so a sidebar entry goes to its main page rather than
// to a sub-page that shares its highlight (`/messages`, not `/messages/:id`).
const byMenu = new Map<SidebarMenuTitle, RouteDefinition>()
for (const definition of routeDefinitions) {
  if (definition.menu && !byMenu.has(definition.menu)) byMenu.set(definition.menu, definition)
}

/** The route a concrete path belongs to, parameters included. */
export function routeForPath(path: string): RouteDefinition | undefined {
  return compiled.find(({ regex }) => regex.test(path))?.definition
}

/** The route that owns a legacy page name, if this app routes it at all. */
export function routeForPage(pagename: string): RouteDefinition | undefined {
  return byPage.get(pagename.toUpperCase())
}

export function routeForMenu(menu: SidebarMenuTitle): RouteDefinition | undefined {
  return byMenu.get(menu)
}

/**
 * True when this app owns the page as a route. Pages we do not own — b1hybrid
 * pages, and onebank-ui pages outside the Figma — open as iframe overlays.
 */
export function isRoutedPage(pagename: string): boolean {
  return routeForPage(pagename) !== undefined
}
