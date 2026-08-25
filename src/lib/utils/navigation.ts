/**
 * Where a page opens: a route we own, or an iframe overlay.
 *
 * Everything that used to call `showPopup` now goes through here. The decision
 * is one lookup — `isRoutedPage` — and it is the seam the migration moves: as a
 * page becomes ours, it stops being an overlay and starts being a URL.
 *
 * b1hybrid pages never become routes. See CLAUDE.md.
 */

import { push } from 'svelte-spa-router'
import { get } from 'svelte/store'
import { HOME_PATH, routeForMenu, routeForPage } from '../routes'
import type { SidebarMenuTitle } from '../../definition'
import { popups } from '../../stores/popup'
import { routeLocation } from '../../stores/route'
import { buildUrlParam } from './url'

/** Serialises route params into a hash querystring, so links survive a refresh. */
function toQueryString(params?: Record<string, unknown> | string): string {
  if (!params) return ''
  return typeof params === 'string' ? params : buildUrlParam(params)
}

export function navigateToPath(path: string, params?: Record<string, unknown> | string): void {
  const query = toQueryString(params)
  push(query ? `${path}?${query}` : path)
}

/** Navigates to the route that owns `pagename`. Returns false if we do not own it. */
export function navigateToPage(pagename: string, params?: Record<string, unknown> | string): boolean {
  const route = routeForPage(pagename)
  if (!route) return false
  navigateToPath(route.path, params)
  return true
}

export function navigateToMenu(menu: SidebarMenuTitle, params?: Record<string, unknown> | string): boolean {
  const route = routeForMenu(menu)
  if (!route) return false
  navigateToPath(route.path, params)
  return true
}

export function goHome(): void {
  push(HOME_PATH)
}

export function isAtHome(): boolean {
  return currentPath() === HOME_PATH
}

/** The active route path, without its querystring. */
export function currentPath(): string {
  return get(routeLocation).path || HOME_PATH
}

/** True when b1hybrid overlays are stacked above the routed page. */
export function hasOverlays(): boolean {
  return get(popups).length > 0
}
