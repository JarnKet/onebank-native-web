/**
 * Opening a page from the server-driven menu grid.
 *
 * This is what HOME is for. `loadhome` returns menu *keys*
 * (`homemenus`/`usablemenus`/`allmenus`); the registry in `src/lib/menus.ts`
 * turns a key into a page name, and `showPopup` decides where that page opens —
 * a native route when this app owns it, a b1hybrid iframe overlay otherwise.
 * Neither this module nor its callers need to know which.
 *
 * onebank-ui builds the same parameter bundle at four separate call sites
 * (`DesktopQuickAccessMenu`, `DesktopBottomNav`, `Shortcuts`, `MenuGroup`) and
 * they have already drifted apart — two of them skip the LANDTAX/PHONE
 * rewrites. Built once here instead.
 */

import { get } from 'svelte/store'
import { menus } from '../../lib/menus'
import { showPopup } from '../../lib/utils/helper'
import { maskAccount } from '../../lib/utils/helper'
import { loadHomeResult } from '../../stores/onebankGroups'

/**
 * Menu keys whose page is named differently from the key, beyond what the
 * registry's `popupname` already covers. Carried over verbatim from
 * `DesktopQuickAccessMenu.svelte:47-48`.
 */
const PAGE_RENAMES: Record<string, string> = {
  LANDTAX: 'LANDTAXNEW',
  PHONE: 'NEWPHONE',
}

/** The page name a menu key opens, before `.html` is appended. */
export function pageNameFor(menuKey: string): string {
  const entry = menus[menuKey]
  const name = entry?.popupname || menuKey
  return PAGE_RENAMES[name] ?? name
}

/** Splits a registry `params` string (`providercode=0002`) onto the bundle. */
function withRegistryParams(params: string | undefined, base: Record<string, unknown>): Record<string, unknown> {
  for (const [key, value] of new URLSearchParams(params ?? '')) base[key] = value
  return base
}

/**
 * The parameter bundle every launched page expects.
 *
 * Only ACTIVE accounts are passed, each carrying its masked form, because the
 * receiving page renders `maskedAccount` directly and has no masker of its own.
 */
export function menuParams(extra?: string): Record<string, unknown> {
  const home = get(loadHomeResult)
  return withRegistryParams(extra, {
    accounts: (home?.accounts ?? [])
      .filter((account) => account.status === 'ACTIVE')
      .map((account) => ({ ...account, maskedAccount: maskAccount(account.account) })),
    onebankname: home?.detail?.name ?? 'OneBank',
    onebankdetail: home?.detail?.detail ?? 'OneBank',
    onebanklogoname: home?.detail?.logoname ?? '',
  })
}

/** Opens the page behind a menu key. Returns false for an unknown key. */
export function openMenu(menuKey: string): boolean {
  const entry = menus[menuKey]
  if (!entry) return false
  showPopup(`${pageNameFor(menuKey)}.html`, menuParams(entry.params))
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
