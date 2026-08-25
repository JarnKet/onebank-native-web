import { beforeEach, describe, expect, it } from 'vitest'
import { get } from 'svelte/store'
import { adoptLoadHomeResult, currentGroup, onebankGroups, registerGroup } from './onebankGroups'

/** What the sidebar checks before it stops showing skeletons. */
function sidebarIsLoading(): boolean {
  const groups = get(onebankGroups)
  const active = get(currentGroup)
  return !groups[active] || !groups[active]?.isFinishLoad
}

const loadHome = (onebankid: string) => ({ result: 0, detail: { onebankid, name: 'Ops' } }) as any

beforeEach(() => {
  onebankGroups.set({})
  currentGroup.set('')
})

describe('adoptLoadHomeResult', () => {
  it('makes the loaded group active', () => {
    adoptLoadHomeResult(loadHome('G1'))
    expect(get(currentGroup)).toBe('G1')
  })

  it('marks the group finished so the sidebar can render', () => {
    expect(sidebarIsLoading()).toBe(true)
    adoptLoadHomeResult(loadHome('G1'))
    expect(sidebarIsLoading()).toBe(false)
  })

  it('keeps the payload for the sidebar to read', () => {
    adoptLoadHomeResult(loadHome('G1'))
    expect(get(onebankGroups)['G1'].loadHomeResult.detail.name).toBe('Ops')
  })

  it('follows the most recently loaded group', () => {
    adoptLoadHomeResult(loadHome('G1'))
    adoptLoadHomeResult(loadHome('G2'))
    expect(get(currentGroup)).toBe('G2')
    // the first group stays cached rather than being dropped
    expect(get(onebankGroups)['G1'].isFinishLoad).toBe(true)
  })

  it('preserves other fields when the same group reloads', () => {
    registerGroup('G1')
    adoptLoadHomeResult(loadHome('G1'))
    expect(Object.keys(get(onebankGroups))).toEqual(['G1'])
  })

  it('ignores a response with no group id rather than keying on undefined', () => {
    expect(adoptLoadHomeResult({ result: 0 } as any)).toBe(false)
    expect(adoptLoadHomeResult(undefined)).toBe(false)
    expect(adoptLoadHomeResult(null)).toBe(false)
    expect(get(onebankGroups)).toEqual({})
    expect(get(currentGroup)).toBe('')
  })
})

describe('registerGroup', () => {
  it('adds a known-but-unloaded group', () => {
    registerGroup('G1')
    expect(get(onebankGroups)['G1'].isFinishLoad).toBe(false)
  })

  it('does not clobber a group that already loaded', () => {
    adoptLoadHomeResult(loadHome('G1'))
    registerGroup('G1')
    expect(get(onebankGroups)['G1'].isFinishLoad).toBe(true)
  })

  it('ignores an empty id', () => {
    registerGroup('')
    expect(get(onebankGroups)).toEqual({})
  })
})

describe('the regression this fixes', () => {
  it('sidebar stays loading while no group is active', () => {
    // Before: currentGroup was only ever set by an `updateTab` message that
    // nothing sends, so this was the permanent state.
    onebankGroups.set({ G1: { isFinishLoad: true, loadHomeResult: loadHome('G1') } })
    currentGroup.set('')
    expect(sidebarIsLoading()).toBe(true)
  })

  it('and resolves once loadhome adopts the group', () => {
    adoptLoadHomeResult(loadHome('G1'))
    expect(sidebarIsLoading()).toBe(false)
  })
})
