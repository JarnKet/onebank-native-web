/**
 * The route table for the corporate OneBank pages.
 *
 * Phase 1 puts every page on a real URL while its content is still an iframe.
 * As a page is migrated it swaps `component` from `IframePage` to the native
 * Svelte route — the path, the sidebar wiring and the deep link do not change.
 *
 * `page` is the legacy page name the rest of the app still speaks (`ROLE.html`),
 * which is what `buildPopupUrl` needs and what embedded frames ask for by name.
 */

import type { SidebarMenuTitle } from '../definition'

export interface RouteDefinition {
  /** Hash path, e.g. `/transaction`. */
  path: string
  /** Legacy page name, e.g. `TRANSACTION.html`. */
  page: string
  /** Sidebar entry to highlight while this route is active. */
  menu: SidebarMenuTitle
  /**
   * True once the route renders a native component instead of an iframe.
   * `src/routes/index.ts` reads this to decide what to mount, so flipping it —
   * and adding the component — is the whole of migrating a page.
   */
  native: boolean
}

export const HOME_PATH = '/'

export const routeDefinitions: RouteDefinition[] = [
  { path: HOME_PATH, page: '', menu: 'HOME', native: true },
  { path: '/transaction', page: 'TRANSACTION.html', menu: 'TRANSACTION', native: false },
  { path: '/authorization', page: 'AUTHORIZATION.html', menu: 'AUTHORIZATION', native: false },
  { path: '/role', page: 'ROLE.html', menu: 'ROLE', native: false },
  { path: '/account', page: 'ACCOUNT.html', menu: 'ACCOUNT', native: true },
  { path: '/member', page: 'MEMBER.html', menu: 'MEMBER', native: false },
  { path: '/group', page: 'GROUP.html', menu: 'GROUP', native: true },
  { path: '/group-management', page: 'GROUPMANAGEMENT.html', menu: 'GROUP', native: false },
  { path: '/register', page: 'REGISTERONEBANK.html', menu: 'GROUP', native: false },
]

const byPage = new Map(routeDefinitions.filter((r) => r.page).map((r) => [r.page.toUpperCase(), r]))
const byPath = new Map(routeDefinitions.map((r) => [r.path, r]))
// First definition wins. Three routes carry `menu: 'GROUP'` — `/group`,
// `/group-management` and `/register` — and building this from pairs kept the
// *last*, so the sidebar's Group entry navigated to REGISTERONEBANK. The table
// lists the entry's real destination first.
const byMenu = new Map<SidebarMenuTitle, RouteDefinition>()
for (const definition of routeDefinitions) {
  if (!byMenu.has(definition.menu)) byMenu.set(definition.menu, definition)
}

/** The route that owns a legacy page name, if this app routes it at all. */
export function routeForPage(pagename: string): RouteDefinition | undefined {
  return byPage.get(pagename.toUpperCase())
}

export function routeForPath(path: string): RouteDefinition | undefined {
  return byPath.get(path)
}

export function routeForMenu(menu: SidebarMenuTitle): RouteDefinition | undefined {
  return byMenu.get(menu)
}

/**
 * True when this app owns the page as a route. Pages we do not own — every
 * b1hybrid page, and the onebank-ui pages still out of scope — open as iframe
 * overlays instead.
 */
export function isRoutedPage(pagename: string): boolean {
  return routeForPage(pagename) !== undefined
}
