/**
 * Mounts the real Sidebar and checks the highlight follows the URL.
 *
 * This is the regression that motivated src/stores/route.ts: the highlight was
 * derived from svelte-spa-router's runes state inside a legacy `$:` block, which
 * Svelte 5 resolves statically, so it never updated after first render.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import Sidebar from './Sidebar.svelte'
import { currentGroup, onebankGroups } from '../stores/onebankGroups'

let host: HTMLElement
let app: Record<string, any> | null = null

async function goto(hash: string): Promise<void> {
  window.location.hash = hash
  await new Promise((resolve) => setTimeout(resolve, 0))
  await tick()
}

/**
 * The label of whichever entry is currently highlighted.
 *
 * Read from `aria-current`, not from a style class. This used to filter on
 * `bg-onebank-red`, which made a colour token load-bearing logic — applying the
 * dev branch's brand gradient to the active entry broke all eight of these
 * tests without changing a single behaviour.
 */
function highlighted(): string[] {
  return [...host.querySelectorAll('nav button[aria-current="page"]')].map(
    (el) => el.getAttribute('aria-label') as string,
  )
}

beforeEach(async () => {
  onebankGroups.set({
    G1: { isFinishLoad: true, loadHomeResult: { result: 0, detail: { onebankid: 'G1', name: 'Ops' }, users: [] } as any },
  })
  currentGroup.set('G1')
  host = document.createElement('div')
  document.body.appendChild(host)
  await goto('#/')
  app = mount(Sidebar, { target: host, props: { expand: true, displaySidebar: true } })
  await tick()
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  host.remove()
})

describe('sidebar highlight', () => {
  it('starts on Home', () => {
    expect(highlighted()).toEqual(['Home'])
  })

  it('follows a navigation to another page', async () => {
    await goto('#/role')
    expect(highlighted()).toEqual(['Role'])
  })

  it('keeps following across several navigations', async () => {
    await goto('#/role')
    expect(highlighted()).toEqual(['Role'])
    await goto('#/member')
    expect(highlighted()).toEqual(['Member'])
    await goto('#/transaction')
    expect(highlighted()).toEqual(['Transaction'])
  })

  it('returns to Home when navigating back to the root', async () => {
    await goto('#/account')
    expect(highlighted()).toEqual(['Account'])
    await goto('#/')
    expect(highlighted()).toEqual(['Home'])
  })

  it('highlights exactly one entry at a time', async () => {
    await goto('#/authorization')
    expect(highlighted()).toHaveLength(1)
  })

  it('ignores the querystring when matching', async () => {
    await goto('#/role?page=addpermission&newuserid=U7')
    expect(highlighted()).toEqual(['Role'])
  })

  it('maps group-management onto the Group entry', async () => {
    await goto('#/group-management')
    expect(highlighted()).toEqual(['Group'])
  })

  it('falls back to Home for an unknown path', async () => {
    await goto('#/nope')
    expect(highlighted()).toEqual(['Home'])
  })
})
