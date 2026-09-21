/**
 * The menu grid is HOME's launcher: a tile opens its service's screen, or the
 * coming-soon page for a service this app has no screen for — never nothing.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { tick } from 'svelte'
import { isUsable, openMenu } from './openMenu'

async function settle(): Promise<string> {
  await tick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
  return window.location.hash
}

beforeEach(async () => {
  window.location.hash = '#/'
  await settle()
})

describe('dispatch', () => {
  it('opens a service that has a screen', async () => {
    expect(openMenu('STATEMENT')).toBe(true)
    expect(await settle()).toBe('#/statement')
  })

  it('opens coming-soon for a service without one', async () => {
    expect(openMenu('LEASING_KRS')).toBe(true)
    expect(await settle()).toBe('#/service/LEASING_KRS')
  })

  it('reports an unknown key rather than opening a broken page', async () => {
    expect(openMenu('NOT_A_MENU')).toBe(false)
    expect(await settle()).toBe('#/')
  })
})

describe('permission gating', () => {
  it('treats * as everything allowed', () => {
    expect(isUsable(['*'], 'TRANSFER')).toBe(true)
  })

  it('allows a named menu and denies an unnamed one', () => {
    expect(isUsable(['TRANSFER'], 'TRANSFER')).toBe(true)
    expect(isUsable(['TRANSFER'], 'WATER')).toBe(false)
  })

  it('denies everything when the group sent no list', () => {
    expect(isUsable(undefined, 'TRANSFER')).toBe(false)
  })
})
