/**
 * The group list is what `MAIN.html` used to own. These pin the two discovery
 * paths and the verification gate, because getting either wrong is invisible
 * until a user with the wrong account state logs in.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { get } from 'svelte/store'
import { setTransport } from '../lib/api/client'
import { currentGroup, onebankGroups } from './onebankGroups'
import { loginData } from './session'
import { groups, groupsLoading, idVerified, isVerified, refreshGroups, seedFromLogin, selectGroup } from './groups'

let sent: Array<{ service: string; data: any }>
let reply: any

function login(idverified: string, groupList: any[] | undefined) {
  loginData.set({ USER: { idverified }, ONEBANK: { groups: groupList } } as any)
}

const G = (onebankid: string, extra: Record<string, unknown> = {}) => ({ onebankid, name: onebankid, ...extra })

beforeEach(() => {
  sent = []
  reply = { result: 0, groups: [] }
  setTransport(async (service, data) => {
    sent.push({ service, data })
    return reply
  })
  groups.set([])
  idVerified.set(false)
  groupsLoading.set(true)
  currentGroup.set('')
  onebankGroups.set({})
  loginData.set(undefined as any)
})

describe('the verification gate', () => {
  it('denies the four blocking statuses', () => {
    for (const status of ['N', 'P', 'V', 'F']) expect(isVerified(status)).toBe(false)
  })

  it('allows a verified account', () => {
    expect(isVerified('Y')).toBe(true)
  })

  // The gate is a denylist in MAIN.html, so an unrecognised or missing value
  // must not lock a legitimate user out.
  it('allows an unknown or absent value rather than failing closed', () => {
    expect(isVerified('X')).toBe(true)
    expect(isVerified(undefined)).toBe(true)
  })

  it('yields no groups at all for a blocked account', () => {
    login('P', [G('A'), G('B')])
    expect(seedFromLogin()).toBe('')
    expect(get(groups)).toEqual([])
    expect(get(idVerified)).toBe(false)
  })

  it('refuses to hit the network for a blocked account', async () => {
    login('N', [G('A')])
    seedFromLogin()
    await refreshGroups()
    expect(sent).toHaveLength(0)
  })
})

describe('seeding from the login payload', () => {
  it('reads the cached payload instead of calling the core', () => {
    login('Y', [G('A'), G('B')])
    seedFromLogin()
    expect(sent).toHaveLength(0)
  })

  it('selects the first group, as MAIN.html does on boot', () => {
    login('Y', [G('A'), G('B'), G('C')])
    expect(seedFromLogin()).toBe('A')
    expect(get(currentGroup)).toBe('A')
  })

  it('preserves server order', () => {
    login('Y', [G('C'), G('A'), G('B')])
    seedFromLogin()
    expect(get(groups).map((g) => g.onebankid)).toEqual(['C', 'A', 'B'])
  })

  it('filters KID groups out', () => {
    login('Y', [G('KID1', { type: 'KID' }), G('A')])
    expect(seedFromLogin()).toBe('A')
    expect(get(groups).map((g) => g.onebankid)).toEqual(['A'])
  })

  it('reports no group when the user has none', () => {
    login('Y', [])
    expect(seedFromLogin()).toBe('')
    expect(get(currentGroup)).toBe('')
  })

  // A missing ONEBANK key must not throw: the whole app renders behind this.
  it('survives an absent or malformed payload', () => {
    loginData.set(undefined as any)
    expect(() => seedFromLogin()).not.toThrow()
    expect(get(groups)).toEqual([])

    login('Y', undefined)
    expect(seedFromLogin()).toBe('')
  })

  it('clears the loading flag', () => {
    login('Y', [G('A')])
    seedFromLogin()
    expect(get(groupsLoading)).toBe(false)
  })

  it('registers each group so the sidebar can show a loading state', () => {
    login('Y', [G('A'), G('B')])
    seedFromLogin()
    expect(Object.keys(get(onebankGroups)).sort()).toEqual(['A', 'B'])
  })
})

describe('refreshing from the core', () => {
  beforeEach(() => {
    login('Y', [G('A')])
    seedFromLogin()
    sent = []
  })

  it('calls ONEBANKGROUP/loadgroups', async () => {
    reply = { result: 0, groups: [G('A')] }
    await refreshGroups()
    expect(sent).toHaveLength(1)
    expect(sent[0].service).toBe('ONEBANKGROUP')
    expect(sent[0].data.command).toBe('loadgroups')
  })

  it('honours the preferred group', async () => {
    reply = { result: 0, groups: [G('A'), G('B'), G('C')] }
    expect(await refreshGroups('B')).toBe('B')
    expect(get(currentGroup)).toBe('B')
  })

  it('keeps the active group when it survived and none was preferred', async () => {
    reply = { result: 0, groups: [G('A'), G('B')] }
    expect(await refreshGroups()).toBe('A')
  })

  // MAIN.html:1576 — a create or join lands the new group last, and that is how
  // it becomes active without anyone passing its id around.
  it('falls back to the last group, which is the newly created one', async () => {
    reply = { result: 0, groups: [G('A'), G('NEW')] }
    currentGroup.set('GONE')
    expect(await refreshGroups()).toBe('NEW')
  })

  it('ignores a preferred group that no longer exists', async () => {
    reply = { result: 0, groups: [G('A'), G('B')] }
    expect(await refreshGroups('DELETED')).toBe('A')
  })

  it('empties out when the last group is left', async () => {
    reply = { result: 0, groups: [] }
    expect(await refreshGroups()).toBe('')
    expect(get(groups)).toEqual([])
    expect(get(currentGroup)).toBe('')
  })

  it('filters KID groups here too', async () => {
    reply = { result: 0, groups: [G('A'), G('K', { type: 'KID' })] }
    await refreshGroups()
    expect(get(groups).map((g) => g.onebankid)).toEqual(['A'])
  })

  it('clears the loading flag even when the call fails', async () => {
    setTransport(async () => {
      throw new Error('offline')
    })
    await expect(refreshGroups()).rejects.toThrow('offline')
    expect(get(groupsLoading)).toBe(false)
  })
})

describe('selecting a group', () => {
  it('makes it active', () => {
    selectGroup('B')
    expect(get(currentGroup)).toBe('B')
  })
})
