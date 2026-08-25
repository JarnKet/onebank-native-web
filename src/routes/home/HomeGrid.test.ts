/**
 * Mounts the real dashboard and checks the parts that are easy to break:
 * every widget is present, edit mode arms the drag handles, and the layout the
 * user arranges is the one that comes back.
 *
 * jsdom lays nothing out, so the grid never learns a width and renders no cells
 * at all. The `ResizeObserver` below reports one, which is the whole difference
 * between an empty grid and a populated one. Dragging is covered separately in
 * `HomeGrid.drag.test.ts`.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import HomeGrid from './HomeGrid.svelte'
import { COLS, STORAGE_KEY, WIDGET_IDS, defaultLayout } from './gridLayout'
import { setTransport } from '../../lib/api/client'
import { currentGroup, onebankGroups } from '../../stores/onebankGroups'

let host: HTMLElement
let app: Record<string, any> | null = null
let realResizeObserver: typeof ResizeObserver

/** Viewport wide enough for the six-column breakpoint. */
const WIDTH = 1200

/**
 * A `ResizeObserver` that reports `WIDTH` as soon as something is observed.
 *
 * The grid derives its column count and cell size from the observed width and
 * renders nothing until it has one; the global stub in `setupTests.ts` never
 * fires, which is right for tests that only mount a route.
 */
class SizedResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}

  observe(target: Element) {
    this.callback([{ target, contentRect: { width: WIDTH, height: 800 } } as any], this as any)
  }

  unobserve() {}

  disconnect() {}
}

/**
 * Lets the observer callback's `requestAnimationFrame` run — jsdom schedules
 * one a frame away, so a microtask flush is not enough.
 */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 40))
  await tick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await tick()
}

/** The Customize / Done button, which is the last one in the toolbar. */
function toggle(): HTMLButtonElement {
  const buttons = [...host.querySelectorAll('.grid-toolbar button')] as HTMLButtonElement[]
  return buttons[buttons.length - 1]
}

/** The toolbar's own text, without whatever the widgets are rendering. */
function toolbarText(): string {
  return host.querySelector('.grid-toolbar')?.textContent ?? ''
}

function text(): string {
  return host.textContent ?? ''
}

beforeEach(async () => {
  // Widgets fetch on mount; without a stub the api client builds a real
  // Connector, and that generates a 2048-bit RSA keypair.
  setTransport(async () => ({ result: 0 }))
  onebankGroups.set({
    G1: {
      isFinishLoad: true,
      loadHomeResult: {
        result: 0,
        detail: { onebankid: 'G1', name: 'Ops' },
        accounts: [],
        homemenus: [{ name: 'TRANSACTION', rank: 1, count: 3 }],
        usablemenus: ['*'],
        allmenus: ['TRANSACTION', 'MEMBER'],
        users: [],
      } as any,
    },
  })
  currentGroup.set('G1')
  host = document.createElement('div')
  document.body.appendChild(host)
  realResizeObserver = globalThis.ResizeObserver
  globalThis.ResizeObserver = SizedResizeObserver as unknown as typeof ResizeObserver
  app = mount(HomeGrid, { target: host, props: { onCustomizeMenus: () => {} } })
  await settle()
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  host.remove()
  globalThis.ResizeObserver = realResizeObserver
  localStorage.clear()
})

describe('the dashboard', () => {
  it('renders a cell per widget', () => {
    expect(host.querySelectorAll('.widget-content').length).toBe(WIDGET_IDS.length)
  })

  it('renders the shortcut and function widgets, not just the charts', () => {
    // Both come from the seeded payload, so their presence proves the grid
    // reaches the menu widgets and hands them the store.
    expect(text()).toContain('Add shortcut')
    expect(host.querySelector('input[type="search"]')?.getAttribute('placeholder')).toBe('Search menu')
  })

  it('starts out of edit mode, with no drag handles', async () => {
    expect(toolbarText()).toContain('Customize')
    expect(host.querySelectorAll('.resize-handle').length).toBe(0)
  })
})

describe('edit mode', () => {
  it('shows a drag and a resize handle per widget once armed', async () => {
    toggle().click()
    await settle()

    expect(toolbarText()).toContain('Done')
    expect(host.querySelectorAll('.resize-handle').length).toBe(WIDGET_IDS.length)
    expect(host.querySelectorAll('.with-handle').length).toBe(WIDGET_IDS.length)
  })

  it('marks every item draggable and resizable, and disarms them again', async () => {
    toggle().click()
    await settle()
    const armed = JSON.parse(localStorage.getItem(STORAGE_KEY) as string)
    expect(armed.every((item: any) => item[COLS].draggable && item[COLS].resizable)).toBe(true)

    toggle().click()
    await settle()
    const disarmed = JSON.parse(localStorage.getItem(STORAGE_KEY) as string)
    expect(disarmed.some((item: any) => item[COLS].draggable || item[COLS].resizable)).toBe(false)
  })
})

describe('persistence', () => {
  it('writes the layout out on mount so a first visit is remembered', () => {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) as string)
    expect(saved.map((item: any) => item.id)).toEqual(WIDGET_IDS)
  })

  it('restores a stored arrangement rather than the default', async () => {
    if (app) unmount(app)
    const moved = defaultLayout()
    moved[0][COLS] = { ...moved[0][COLS], x: 2, y: 6 }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(moved))

    app = mount(HomeGrid, { target: host, props: { onCustomizeMenus: () => {} } })
    await settle()

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) as string)
    expect(saved[0][COLS]).toMatchObject({ x: 2, y: 6 })
  })
})
