/**
 * The route table: every screen in the app, and what points at it.
 *
 * Every route is a native Svelte page — there are no iframes any more.
 * `src/routes/index.ts` maps each path to its component; this file is the part
 * the rest of the app reasons about without importing a component:
 *
 * - `menu` is the sidebar entry to highlight while the route is active.
 * - `menuKeys` are the registry keys (`src/lib/menus.ts`) a home tile opens
 *   this route for. A key no route claims opens the "coming soon" page, which
 *   is how the dozens of BCEL One services without a design still go somewhere.
 */

import type { SidebarMenuTitle } from '../definition'

export interface RouteDefinition {
  /** Hash path, e.g. `/statement`. May carry `:param` segments. */
  path: string
  /** Sidebar entry to highlight while this route is active, if any. */
  menu: SidebarMenuTitle | null
  /** Menu registry keys whose tile opens this route. */
  menuKeys?: string[]
  /**
   * Drawn without the group/nav column, as the design draws the group
   * management screens: they are about *which* group, not inside one.
   */
  fullWidth?: boolean
}

export const HOME_PATH = '/'
export const COMING_SOON_PATH = '/service/:key'

export const routeDefinitions: RouteDefinition[] = [
  { path: HOME_PATH, menu: 'HOME', menuKeys: ['HOME', 'DASHBOARD'] },
  { path: '/messages', menu: 'MESSAGE', menuKeys: ['MESSAGE', 'TRANSACTION'] },
  { path: '/messages/:id', menu: 'MESSAGE' },
  { path: '/authorization', menu: 'AUTHORIZATION', menuKeys: ['AUTHORIZATION'] },
  { path: '/authorization/history', menu: 'AUTHORIZATION' },
  { path: '/role', menu: 'ROLE', menuKeys: ['ROLE'] },
  { path: '/account', menu: 'ACCOUNT', menuKeys: ['ACCOUNT', 'ADDACCOUNT', 'OPENNEWACCOUNT'] },
  { path: '/member', menu: 'MEMBER', menuKeys: ['MEMBER'] },
  { path: '/group', menu: 'GROUP', menuKeys: ['GROUP', 'MODIFYOBPROFILE'] },
  { path: '/group/leave', menu: null, fullWidth: true },
  { path: '/group/join', menu: null, fullWidth: true },
  { path: '/register', menu: null, menuKeys: ['REGISTERONEBANK', 'GROUPMANAGEMENT'], fullWidth: true },
  { path: '/statement', menu: null, menuKeys: ['STATEMENT', 'ONEBANKSTATEMENT', 'HISTORY'] },
  { path: '/transfer', menu: null, menuKeys: ['TRANSFER', 'ONEBANKTRANSFER', 'MYACCOUNTTRANSFER'] },
  { path: '/transfer/interbank', menu: null, menuKeys: ['IBANKINTERNATIONALTRANSFER', 'SWIFTTRANSFER'] },
  { path: '/transfer/idcard', menu: null, menuKeys: ['IBANKTRANFERIDCARD'] },
  { path: '/salary', menu: null, menuKeys: ['IBANKSALARY'] },
  { path: '/echeque', menu: null, menuKeys: ['ECHEQUE'] },
  { path: '/bill/electricity', menu: null, menuKeys: ['ELECTRICITY', 'ONEBANKELECTRICITY'] },
  { path: '/bill/water', menu: null, menuKeys: ['WATER', 'ONEBANKWATER'] },
  { path: '/topup', menu: null, menuKeys: ['PHONE', 'ONEBANKPHONE', 'ONEBANKUTILITIES'] },
  { path: COMING_SOON_PATH, menu: null },
]

/** `/messages/:id` -> a regex that matches `/messages/M3`. */
function matcher(path: string): RegExp {
  const pattern = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\/:[^/]+/g, '/[^/]+')
  return new RegExp(`^${pattern}$`)
}

const compiled = routeDefinitions.map((definition) => ({ definition, regex: matcher(definition.path) }))

const byMenuKey = new Map<string, RouteDefinition>()
for (const definition of routeDefinitions) {
  for (const key of definition.menuKeys ?? []) byMenuKey.set(key, definition)
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

export function routeForMenu(menu: SidebarMenuTitle): RouteDefinition | undefined {
  return byMenu.get(menu)
}

/** Where a home tile for `menuKey` goes: its route, or the coming-soon page. */
export function pathForMenuKey(menuKey: string): string {
  return byMenuKey.get(menuKey)?.path ?? COMING_SOON_PATH.replace(':key', encodeURIComponent(menuKey))
}

/** True when `menuKey` has a real screen rather than the coming-soon page. */
export function hasScreen(menuKey: string): boolean {
  return byMenuKey.has(menuKey)
}
