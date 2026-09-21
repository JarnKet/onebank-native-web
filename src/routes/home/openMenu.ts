/**
 * Opening a screen from the server-driven menu grid.
 *
 * `loadhome` returns menu *keys* (`homemenus`/`usablemenus`/`allmenus`); the
 * route table in `src/lib/routes.ts` says which screen each key opens. A key
 * with no screen of its own opens the "coming soon" page rather than nothing.
 */

import { menus } from '../../lib/menus'
import { navigateToMenuKey } from '../../lib/utils/navigation'

/** Opens the screen behind a menu key. Returns false for a key the registry does not know. */
export function openMenu(menuKey: string): boolean {
  if (!menus[menuKey]) return false
  navigateToMenuKey(menuKey)
  return true
}

/**
 * Whether the group's permissions allow this menu.
 *
 * `usablemenus` containing `*` means everything is allowed; that wildcard is
 * why this cannot be a plain `Set.has`.
 */
export function isUsable(usablemenus: string[] | undefined, menuKey: string): boolean {
  if (!usablemenus) return false
  return usablemenus.includes('*') || usablemenus.includes(menuKey)
}
