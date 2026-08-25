/**
 * The authenticated shell renders.
 *
 * `MainContent` -> `Layout` -> `Sidebar` + the routed page is what replaces the
 * login screen, and nothing covered it: the route tests mount `Router` on its
 * own and the overlay tests mount `FrameContainer` on its own, so a shell that
 * mounted to a blank page would have passed every existing test.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import MainContent from './MainContent.svelte'
import { setTransport } from '../lib/api/client'
import { currentGroup, onebankGroups } from '../stores/onebankGroups'
import { groups, groupsLoading, idVerified } from '../stores/groups'
import { displaySidebar } from '../stores/ui'

let host: HTMLElement
let app: Record<string, any> | null = null

class SizedResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}
  observe(target: Element) {
    this.callback([{ target, contentRect: { width: 1200, height: 800 } } as any], this as any)
  }
  unobserve() {}
  disconnect() {}
}

let realResizeObserver: typeof ResizeObserver

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 40))
  await tick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await tick()
}

beforeEach(async () => {
  setTransport(async () => ({ result: 0 }))
  currentGroup.set('G-42')
  idVerified.set(true)
  groupsLoading.set(false)
  groups.set([{ onebankid: 'G-42' } as any])
  displaySidebar.set(true)
  onebankGroups.set({
    'G-42': {
      isFinishLoad: true,
      loadHomeResult: {
        result: 0,
        detail: { onebankid: 'G-42', name: 'Ops' },
        accounts: [],
        homemenus: [],
        usablemenus: ['*'],
        allmenus: [],
        users: [],
      } as any,
    },
  } as any)

  window.location.hash = ''
  realResizeObserver = globalThis.ResizeObserver
  globalThis.ResizeObserver = SizedResizeObserver as unknown as typeof ResizeObserver
  host = document.createElement('div')
  document.body.appendChild(host)
  app = mount(MainContent, { target: host })
  await settle()
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  host.remove()
  globalThis.ResizeObserver = realResizeObserver
})

describe('the authenticated shell', () => {
  it('puts something on the page at all', () => {
    expect(host.innerHTML.trim(), 'the shell mounted to an empty page').not.toBe('')
  })

  it('renders the sidebar rail', () => {
    // The sidebar's cards are the rail; a blank shell has none of them.
    expect(host.querySelectorAll('.onebank-card').length).toBeGreaterThan(0)
  })

  it('renders the sidebar rail with a menu, skeleton or otherwise', () => {
    expect(host.querySelector('nav'), 'the sidebar nav did not render').not.toBeNull()
    expect(host.querySelectorAll('nav > *').length).toBeGreaterThan(0)
  })

  it('renders the routed page beside the sidebar', () => {
    // The home route owns this scroller. Which state it shows depends on the
    // seeded group data; that it rendered at all is what matters here.
    const content = host.querySelector('main')
    expect(content, 'no content column').not.toBeNull()
    expect(content?.textContent?.trim(), 'the routed page rendered nothing').not.toBe('')
  })

  it('offsets the content column for the sidebar', () => {
    const content = host.querySelector('main') as HTMLElement
    expect(content.className).toMatch(/ml-\[(300|80)px\]|ml-0/)
  })
})
