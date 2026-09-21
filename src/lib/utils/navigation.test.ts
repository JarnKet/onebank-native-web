import { beforeEach, describe, expect, it } from 'vitest'
import { tick } from 'svelte'
import { currentPath, goHome, isAtHome, navigateToMenu, navigateToMenuKey, navigateToPath } from './navigation'

/**
 * `push` is async in svelte-spa-router 5, and jsdom dispatches `hashchange` a
 * task *after* assigning the hash. Two macrotasks, not one: see CLAUDE.md.
 */
async function settle(): Promise<string> {
  await tick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await new Promise((resolve) => setTimeout(resolve, 0))
  return window.location.hash
}

beforeEach(async () => {
  window.location.hash = ''
  await settle()
})

describe('navigateToPath', () => {
  it('carries object params into the hash querystring', async () => {
    navigateToPath('/role', { page: 'add', user: 'U7' })
    expect(await settle()).toBe('#/role?page=add&user=U7')
  })

  it('carries an already-encoded string through unchanged', async () => {
    navigateToPath('/role', 'a=1&b=2')
    expect(await settle()).toBe('#/role?a=1&b=2')
  })
})

describe('navigateToMenu', () => {
  it('opens the route behind a sidebar entry', async () => {
    expect(navigateToMenu('MESSAGE')).toBe(true)
    expect(await settle()).toBe('#/messages')
  })
})

describe('navigateToMenuKey', () => {
  it('opens a service screen, or coming-soon for one without', async () => {
    navigateToMenuKey('WATER')
    expect(await settle()).toBe('#/bill/water')
    navigateToMenuKey('INSURANCE_PRU')
    expect(await settle()).toBe('#/service/INSURANCE_PRU')
  })
})

describe('home', () => {
  it('knows when it is there', async () => {
    navigateToPath('/account')
    await settle()
    expect(isAtHome()).toBe(false)
    expect(currentPath()).toBe('/account')
    goHome()
    await settle()
    expect(isAtHome()).toBe(true)
  })
})
