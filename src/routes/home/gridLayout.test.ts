/**
 * The dashboard layout survives a reload, and never restores an arrangement
 * that no longer describes the widgets this build renders.
 */

import { describe, expect, it } from 'vitest'
import {
  COLS,
  COLS_SM,
  STORAGE_KEY,
  WIDGET_IDS,
  applyEditMode,
  columnsFor,
  compact,
  defaultLayout,
  loadLayout,
  makeItem,
  moveItem,
  resizeItem,
  rowCount,
  saveLayout,
  type LayoutItem,
  type WidgetId,
} from './gridLayout'

/** A `Storage` backed by a plain object, so a test never touches the real one. */
function fakeStorage(seed: Record<string, string> = {}): Storage {
  const entries = new Map(Object.entries(seed))
  return {
    get length() {
      return entries.size
    },
    clear: () => entries.clear(),
    getItem: (key: string) => entries.get(key) ?? null,
    key: (index: number) => [...entries.keys()][index] ?? null,
    removeItem: (key: string) => void entries.delete(key),
    setItem: (key: string, value: string) => void entries.set(key, value),
  }
}

/** A `Storage` that throws on every access, as a private-mode browser does. */
function throwingStorage(): Storage {
  const boom = () => {
    throw new Error('storage disabled')
  }
  return {
    get length(): number {
      return boom()
    },
    clear: boom,
    getItem: boom,
    key: boom,
    removeItem: boom,
    setItem: boom,
  }
}

describe('defaultLayout', () => {
  it('places every widget at both breakpoints', () => {
    const layout = defaultLayout()
    expect(layout.map((item) => item.id)).toEqual(WIDGET_IDS)
    for (const item of layout) {
      expect(item[COLS]).toMatchObject({ w: expect.any(Number), h: expect.any(Number) })
      expect(item[COLS_SM]).toMatchObject({ w: expect.any(Number), h: expect.any(Number) })
    }
  })

  it('hands out a fresh copy each time', () => {
    const first = defaultLayout()
    first[0][COLS].x = 99
    expect(defaultLayout()[0][COLS].x).toBe(0)
  })

  it('never exceeds the column count it was laid out for', () => {
    for (const item of defaultLayout()) {
      expect(item[COLS].x + item[COLS].w).toBeLessThanOrEqual(COLS)
      expect(item[COLS_SM].x + item[COLS_SM].w).toBeLessThanOrEqual(COLS_SM)
    }
  })
})

describe('loadLayout', () => {
  it('round trips a saved arrangement', () => {
    const storage = fakeStorage()
    const moved = defaultLayout()
    moved[0][COLS] = { ...moved[0][COLS], x: 2, y: 4 }
    saveLayout(moved, storage)

    const restored = loadLayout(storage)
    expect(restored.map((item) => item.id)).toEqual(WIDGET_IDS)
    expect(restored[0][COLS]).toMatchObject({ x: 2, y: 4 })
  })

  it('falls back to the default when nothing is stored', () => {
    expect(loadLayout(fakeStorage())).toEqual(defaultLayout())
  })

  it('falls back when the saved widget ids are not the current ones', () => {
    // A layout from a build whose widget list has since changed: right length,
    // wrong contents. onebank-ui accepts this and renders a dead cell.
    const stale = defaultLayout().map((item, index) => (index === 0 ? { ...item, id: 'weather' } : item))
    const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify(stale) })
    expect(loadLayout(storage).map((item) => item.id)).toEqual(WIDGET_IDS)
  })

  it('falls back on corrupt JSON', () => {
    expect(loadLayout(fakeStorage({ [STORAGE_KEY]: 'not json' })).map((item) => item.id)).toEqual(WIDGET_IDS)
  })

  it('survives a storage that throws', () => {
    expect(loadLayout(throwingStorage()).map((item) => item.id)).toEqual(WIDGET_IDS)
    expect(() => saveLayout(defaultLayout(), throwingStorage())).not.toThrow()
  })
})

describe('applyEditMode', () => {
  it('turns dragging and resizing on and off at both breakpoints', () => {
    const on = applyEditMode(defaultLayout(), true)
    for (const item of on) {
      expect(item[COLS]).toMatchObject({ draggable: true, resizable: true })
      expect(item[COLS_SM]).toMatchObject({ draggable: true, resizable: true })
    }

    const off = applyEditMode(on, false)
    for (const item of off) {
      expect(item[COLS]).toMatchObject({ draggable: false, resizable: false })
      expect(item[COLS_SM]).toMatchObject({ draggable: false, resizable: false })
    }
  })

  it('keeps positions untouched', () => {
    const before = defaultLayout()
    const after = applyEditMode(before, true)
    after.forEach((item, index) => {
      expect(item[COLS].x).toBe(before[index][COLS].x)
      expect(item[COLS].y).toBe(before[index][COLS].y)
    })
  })
})

/**
 * The collision maths that replaced `svelte-grid`.
 *
 * These cover the behaviour the library used to provide — push what you land
 * on downwards, then float everything back up — which is exactly the part a
 * jsdom test of the component itself cannot reach, because nothing there has a
 * size.
 */

/** A one-breakpoint layout, so a case reads as a picture rather than a fixture. */
function grid(cells: [WidgetId, number, number, number, number][]): LayoutItem[] {
  return cells.map(([id, x, y, w, h]) => ({ id, [COLS]: makeItem({ x, y, w, h }) }))
}

function at(items: LayoutItem[], id: WidgetId): string {
  const cell = items.find((item) => item.id === id)?.[COLS]
  return `${cell.x},${cell.y} ${cell.w}x${cell.h}`
}

describe('columnsFor', () => {
  it('switches at the 960px breakpoint', () => {
    expect(columnsFor(1200)).toBe(COLS)
    expect(columnsFor(960)).toBe(COLS)
    expect(columnsFor(959)).toBe(COLS_SM)
    expect(columnsFor(0)).toBe(COLS_SM)
  })
})

describe('moveItem', () => {
  it('puts the item where it was dropped', () => {
    const moved = moveItem(grid([['barchart', 0, 0, 2, 2]]), 'barchart', COLS, 3, 0)
    expect(at(moved, 'barchart')).toBe('3,0 2x2')
  })

  it('clamps to the grid rather than letting an item leave it', () => {
    const items = grid([['barchart', 0, 0, 4, 2]])
    expect(at(moveItem(items, 'barchart', COLS, 99, 0), 'barchart')).toBe('2,0 4x2')
    expect(at(moveItem(items, 'barchart', COLS, -5, -5), 'barchart')).toBe('0,0 4x2')
  })

  it('pushes what it lands on downwards', () => {
    const items = grid([
      ['barchart', 0, 0, 2, 2],
      ['piechart', 2, 0, 2, 2],
    ])
    const moved = moveItem(items, 'barchart', COLS, 2, 0)
    expect(at(moved, 'barchart')).toBe('2,0 2x2')
    expect(at(moved, 'piechart')).toBe('2,2 2x2')
  })

  it('floats the rest back up into the hole a move left behind', () => {
    const items = grid([
      ['barchart', 0, 0, 2, 2],
      ['piechart', 0, 2, 2, 2],
    ])
    // Take the top item away to the right; the lower one should rise to y=0.
    const moved = moveItem(items, 'barchart', COLS, 4, 0)
    expect(at(moved, 'piechart')).toBe('0,0 2x2')
  })

  it('leaves a layout it cannot find an id in alone', () => {
    const items = grid([['barchart', 0, 0, 2, 2]])
    expect(moveItem(items, 'calendar', COLS, 3, 3)).toBe(items)
  })

  it('keeps the caller order, so each-block keys stay stable', () => {
    const items = grid([
      ['barchart', 0, 0, 2, 2],
      ['piechart', 0, 2, 2, 2],
      ['balance', 0, 4, 2, 2],
    ])
    const moved = moveItem(items, 'balance', COLS, 0, 0)
    expect(moved.map((item) => item.id)).toEqual(['barchart', 'piechart', 'balance'])
  })
})

describe('resizeItem', () => {
  it('grows an item', () => {
    const grown = resizeItem(grid([['barchart', 0, 0, 2, 2]]), 'barchart', COLS, 4, 3)
    expect(at(grown, 'barchart')).toBe('0,0 4x3')
  })

  it('refuses to shrink past the item minimum', () => {
    const items: LayoutItem[] = [
      { id: 'barchart', [COLS]: makeItem({ x: 0, y: 0, w: 4, h: 3, min: { w: 2, h: 2 } }) },
    ]
    expect(at(resizeItem(items, 'barchart', COLS, 1, 1), 'barchart')).toBe('0,0 2x2')
  })

  it('will not grow an item past the right-hand edge', () => {
    const items = grid([['barchart', 4, 0, 2, 2]])
    expect(at(resizeItem(items, 'barchart', COLS, 6, 2), 'barchart')).toBe('4,0 2x2')
  })

  it('pushes a neighbour down when it grows into it', () => {
    const items = grid([
      ['barchart', 0, 0, 2, 2],
      ['piechart', 0, 2, 2, 2],
    ])
    const grown = resizeItem(items, 'barchart', COLS, 2, 4)
    expect(at(grown, 'barchart')).toBe('0,0 2x4')
    expect(at(grown, 'piechart')).toBe('0,4 2x2')
  })
})

describe('compact', () => {
  it('closes vertical gaps without reordering columns', () => {
    const items = grid([
      ['barchart', 0, 5, 2, 2],
      ['piechart', 2, 9, 2, 2],
    ])
    const tidy = compact(items, COLS)
    expect(at(tidy, 'barchart')).toBe('0,0 2x2')
    expect(at(tidy, 'piechart')).toBe('2,0 2x2')
  })

  it('stops an item at the one above it', () => {
    const items = grid([
      ['barchart', 0, 0, 2, 2],
      ['piechart', 0, 7, 2, 2],
    ])
    expect(at(compact(items, COLS), 'piechart')).toBe('0,2 2x2')
  })

  it('leaves the default layout alone — it is already compact', () => {
    const before = defaultLayout()
    const after = compact(before, COLS)
    before.forEach((item, index) => {
      expect(after[index][COLS].y).toBe(item[COLS].y)
    })
  })
})

describe('rowCount', () => {
  it('measures to the bottom of the lowest item', () => {
    expect(rowCount(grid([['barchart', 0, 0, 2, 2], ['piechart', 2, 3, 2, 4]]), COLS)).toBe(7)
  })

  it('is zero for an empty layout', () => {
    expect(rowCount([], COLS)).toBe(0)
  })
})

describe('makeItem', () => {
  it('fills in the defaults svelte-grid used to supply', () => {
    expect(makeItem({ x: 1, y: 2, w: 3, h: 4 })).toMatchObject({
      x: 1,
      y: 2,
      w: 3,
      h: 4,
      fixed: false,
      draggable: true,
      resizable: true,
      min: { w: 1, h: 1 },
    })
  })

  it('never lets a minimum fall below one cell', () => {
    expect(makeItem({ x: 0, y: 0, w: 2, h: 2, min: { w: 0, h: -3 } }).min).toEqual({ w: 1, h: 1 })
  })

  it('keeps a saved arm state rather than resetting it on load', () => {
    const restored = makeItem({ x: 0, y: 0, w: 2, h: 2, draggable: false, resizable: false })
    expect(restored).toMatchObject({ draggable: false, resizable: false })
  })
})
