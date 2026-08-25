/**
 * A dragged widget stays where it was dropped, across a reload.
 *
 * `HomeGrid.test.ts` covers the layout module and edit mode; this drives the
 * whole chain instead — pointer events on the drag handle, the `pointerDrag`
 * attachment, `moveItem`'s collision pass, the write-through save, and a fresh
 * mount reading it back.
 * jsdom lays nothing out, so the grid is given a width through a
 * `ResizeObserver` stub; without one it renders no cells and there is nothing
 * to drag.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import HomeGrid from './HomeGrid.svelte'
import { COLS, STORAGE_KEY } from './gridLayout'
import { setTransport } from '../../lib/api/client'
import { currentGroup, onebankGroups } from '../../stores/onebankGroups'

/** Viewport wide enough for the six-column breakpoint. */
const WIDTH = 1200

class SizedResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}

  observe(target: Element) {
    this.callback([{ target, contentRect: { width: WIDTH, height: 800 } } as any], this as any)
  }

  unobserve() {}

  disconnect() {}
}

let host: HTMLElement
let app: Record<string, any> | null = null
let realResizeObserver: typeof ResizeObserver

/** Lets the observer's `requestAnimationFrame` and the grid's throttles run. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 40))
  await tick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await tick()
}

/** `pointerDrag` reads clientX/clientY off the event, so a MouseEvent will do. */
function pointer(type: string, x: number, y: number, target: EventTarget): void {
  target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }))
}

function positions(): Record<string, string> {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) as string)
  return Object.fromEntries(saved.map((item: any) => [item.id, `${item[COLS].x},${item[COLS].y}`]))
}

function open(): void {
  app = mount(HomeGrid, { target: host, props: { onCustomizeMenus: () => {} } })
}

beforeEach(async () => {
  setTransport(async () => ({ result: 0 }))
  onebankGroups.set({
    G1: {
      isFinishLoad: true,
      loadHomeResult: {
        result: 0,
        detail: { onebankid: 'G1' },
        accounts: [],
        homemenus: [],
        usablemenus: ['*'],
        allmenus: [],
        users: [],
      } as any,
    },
  })
  currentGroup.set('G1')
  host = document.createElement('div')
  document.body.appendChild(host)
  realResizeObserver = globalThis.ResizeObserver
  globalThis.ResizeObserver = SizedResizeObserver as unknown as typeof ResizeObserver
  open()
  await settle()
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  host.remove()
  globalThis.ResizeObserver = realResizeObserver
  localStorage.clear()
})

describe('dragging a widget', () => {
  it('moves it, and the move survives a remount', async () => {
    const before = positions()
    expect(before.barchart).toBe('0,0')

    // Edit mode is what arms the handles; it is the last toolbar button.
    const buttons = [...host.querySelectorAll('.grid-toolbar button')] as HTMLButtonElement[]
    buttons[buttons.length - 1].click()
    await settle()

    const handle = host.querySelector('.cursor-grab') as HTMLElement
    expect(handle, 'no drag handle in edit mode').not.toBeNull()

    pointer('pointerdown', 100, 100, handle)
    await settle()
    pointer('pointermove', 900, 400, window)
    await settle()
    pointer('pointerup', 900, 400, window)
    await settle()

    const after = positions()
    expect(after.barchart, 'the dragged widget did not move').not.toBe(before.barchart)

    // The reload: a fresh component against the storage the drag left behind.
    if (app) unmount(app)
    open()
    await settle()

    expect(positions()).toEqual(after)
  })
})

describe('a drag that keeps going', () => {
  /**
   * `{@attach}` is reactive: the expression re-runs whenever state it reads
   * changes. The move handler rewrites `items` on every pointermove, so if the
   * attachment reads the item it is attached to, it is torn down and rebuilt
   * mid-gesture — and the window listeners go with it. A single-move test
   * cannot see that; the second move is where it shows.
   */
  it('keeps tracking the pointer across several moves', async () => {
    const buttons = [...host.querySelectorAll('.grid-toolbar button')] as HTMLButtonElement[]
    buttons[buttons.length - 1].click()
    await settle()

    const handle = host.querySelector('.cursor-grab') as HTMLElement
    pointer('pointerdown', 100, 100, handle)
    await settle()

    pointer('pointermove', 300, 100, window)
    await settle()
    const afterFirst = positions()

    // Same gesture, further right. Without a stable attachment this move is
    // never delivered and the position is unchanged from the first.
    pointer('pointermove', 700, 100, window)
    await settle()
    const afterSecond = positions()

    pointer('pointerup', 700, 100, window)
    await settle()

    expect(afterSecond.barchart, 'the second move of the gesture was lost').not.toBe(afterFirst.barchart)
  })
})
