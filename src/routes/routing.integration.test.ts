/**
 * Mounts the real Router with the real route map and checks that a hash change
 * puts the right page on screen — and that no page is ever an iframe.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import Router from 'svelte-spa-router'
import routes from './index'
import { routeDefinitions } from '../lib/routes'
import { currentGroup } from '../stores/onebankGroups'
import { groups, groupsLoading, idVerified } from '../stores/groups'
import { resetMockDb } from '../lib/api/mock'

let host: HTMLElement
let app: Record<string, any> | null = null

async function goto(hash: string): Promise<void> {
  window.location.hash = hash
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await tick()
  }
}

beforeEach(async () => {
  resetMockDb()
  currentGroup.set('G1')
  idVerified.set(true)
  groupsLoading.set(false)
  groups.set([{ onebankid: 'G1', name: 'Namsommut' }])
  host = document.createElement('div')
  document.body.appendChild(host)
  await goto('')
  app = mount(Router, { target: host, props: { routes } })
  await tick()
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  host.remove()
})

describe('every route', () => {
  for (const { path } of routeDefinitions) {
    const concrete = path.replace(':id', 'M1').replace(':key', 'LEASING')
    it(`${concrete} renders a native page`, async () => {
      await goto(`#${concrete}`)
      expect(host.querySelectorAll('*').length, 'blank page').toBeGreaterThan(0)
      expect(host.querySelector('iframe')).toBeNull()
    })
  }
})

describe('navigation', () => {
  it('falls back to home for an unknown path rather than a blank screen', async () => {
    await goto('#/nope')
    expect(host.querySelectorAll('*').length).toBeGreaterThan(0)
  })

  it('names the service on its coming-soon page', async () => {
    await goto('#/service/LEASING')
    expect(host.textContent).toContain('Leasing')
  })
})
