/**
 * The order of the user's quick-access menus.
 *
 * Was inline in `QuickAccessMenu.svelte`, which the grid's `Shortcuts` widget
 * replaced; kept as a module because `Shortcuts` and any future launcher must
 * agree on the order the user arranged in `CustomizeMenus`.
 */

import type { Menu } from '../../definition'

/**
 * Ranked menus first in rank order, then the rest by descending use count.
 * Copied before sorting — the array belongs to the cached loadhome payload.
 */
export function sortSelected(selected: Menu[]): Menu[] {
  return [...selected].sort((a, b) => {
    if (a.rank !== undefined && b.rank !== undefined) return a.rank - b.rank
    if (a.rank !== undefined) return -1
    if (b.rank !== undefined) return 1
    return b.count - a.count
  })
}
