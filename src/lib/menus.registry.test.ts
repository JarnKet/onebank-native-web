/**
 * The menu registry has to stay a superset of what the core can send.
 *
 * `Functions.svelte` renders `allmenus.filter((key) => menus[key])`, so a key
 * the core sends that is missing from the registry is *silently dropped* — no
 * error, no blank tile, just a shorter grid. Eighteen entries went missing that
 * way in the first harvest from onebank-ui, eleven of them the `IBANK*` family,
 * and the only symptom was "the mobile app shows more menus than this".
 */

import { describe, expect, it } from 'vitest'
import { menus } from './menus'

/**
 * The keys onebank-ui's own Functions widget appends unconditionally.
 * Mirrored in `src/routes/home/Functions.svelte`; if that list grows, this one
 * has to grow with it, and every key in it needs a registry entry.
 */
const ALWAYS_OFFERED = [
  'ONEBANKSTATEMENT',
  'ONEBANKTRANSFER',
  'ONEBANKUTILITIES',
  'IBANKSALARY',
  'IBANKACCOUNTDETAIL',
  'IBANKNOTIFICATIONSETTING',
  'IBANKEXCHANGERATES',
  'IBANKINTERESTRATES',
  'IBANKSLIP',
  'IBANKDESTINATIONACCOUNT',
  'IBANKTERMDEPOSITACCOUNT',
  'IBANKLOANACCOUNT',
  'IBANKINTERNATIONALTRANSFER',
  'IBANKTRANFERIDCARD',
]

/** The iBanking family, which the first harvest dropped wholesale. */
const IBANK_MENUS = [
  'IBANKACCOUNTDETAIL',
  'IBANKDESTINATIONACCOUNT',
  'IBANKEXCHANGERATES',
  'IBANKINTERESTRATES',
  'IBANKINTERNATIONALTRANSFER',
  'IBANKLOANACCOUNT',
  'IBANKNOTIFICATIONSETTING',
  'IBANKSALARY',
  'IBANKSLIP',
  'IBANKTERMDEPOSITACCOUNT',
  'IBANKTRANFERIDCARD',
]

/** OneBank-branded utility pages, also absent from the first harvest. */
const ONEBANK_UTILITIES = ['ONEBANKUTILITIES', 'ONEBANKPHONE', 'ONEBANKWATER', 'ONEBANKELECTRICITY']

describe('the menu registry', () => {
  it('knows every menu the Functions grid offers unprompted', () => {
    const unknown = ALWAYS_OFFERED.filter((key) => !menus[key])
    expect(unknown, 'these would be filtered out of the grid without a trace').toEqual([])
  })

  it('covers the whole iBanking family', () => {
    const missing = IBANK_MENUS.filter((key) => !menus[key])
    expect(missing).toEqual([])
  })

  it('covers the OneBank utility pages', () => {
    const missing = ONEBANK_UTILITIES.filter((key) => !menus[key])
    expect(missing).toEqual([])
  })

  it('gives every entry a name and an icon', () => {
    const broken = Object.entries(menus)
      .filter(([, menu]) => !menu?.name || !menu?.filename)
      .map(([key]) => key)
    expect(broken, 'a menu with no name or icon renders as an empty tile').toEqual([])
  })

  it('is large enough to be the full catalogue, not a subset of it', () => {
    // onebank-ui ships 133; a regression that halves this would otherwise only
    // show up as a visibly shorter grid.
    expect(Object.keys(menus).length).toBeGreaterThanOrEqual(128)
  })
})
