/**
 * Moving between screens. Every screen is a hash route (`src/lib/routes.ts`).
 */

import { push } from 'svelte-spa-router'
import { get } from 'svelte/store'
import { HOME_PATH, pathForMenuKey, routeForMenu } from '../routes'
import type { SidebarMenuTitle } from '../../definition'
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

export function navigateToMenu(menu: SidebarMenuTitle, params?: Record<string, unknown> | string): boolean {
  const route = routeForMenu(menu)
  if (!route) return false
  navigateToPath(route.path, params)
  return true
}

/** Opens the screen behind a menu registry key; unknown ones get "coming soon". */
export function navigateToMenuKey(menuKey: string): void {
  navigateToPath(pathForMenuKey(menuKey))
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
