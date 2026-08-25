/**
 * Positions, sizes, collision resolution and persistence for the home dashboard.
 *
 * Ported from onebank-ui `pages/HOME/components/desktop/DesktopHome.svelte`,
 * which keeps this logic inside the component. It lives here so the arithmetic
 * and the storage round trip can be tested without a layout engine — jsdom
 * measures nothing, so anything depending on real geometry is untestable.
 *
 * A layout item carries one entry per breakpoint — `[6]` above 960px and `[2]`
 * below — so the current column count indexes straight into the item. That was
 * `svelte-grid`'s shape and it is kept deliberately: every layout already in a
 * user's `localStorage` is written that way.
 */

/** Columns at the wide breakpoint. */
export const COLS = 6
/** Columns below 960px. */
export const COLS_SM = 2
export const ROW_HEIGHT = 148
export const GAP = 12
export const BREAKPOINT = 960
export const STORAGE_KEY = 'onebank-home-grid-v1'

/** The column counts this grid supports, widest first. */
export const COLS_CONFIG: [number, number][] = [
  [BREAKPOINT, COLS],
  [0, COLS_SM],
]

/** How many columns a container of `width` gets. */
export function columnsFor(width: number): number {
  return width >= BREAKPOINT ? COLS : COLS_SM
}

export type WidgetId = 'barchart' | 'piechart' | 'balance' | 'shortcuts' | 'functions' | 'calendar'

/** One widget's geometry at one breakpoint. */
export interface Placement {
  x: number
  y: number
  w: number
  h: number
  min: { w: number; h: number }
  max?: { w?: number; h?: number }
  fixed: boolean
  draggable: boolean
  resizable: boolean
}

export interface LayoutItem {
  id: WidgetId
  [breakpoint: number]: any
}

/**
 * Fills a partial placement out with its defaults.
 *
 * Replaces `svelte-grid`'s `gridHelp.item`, reproducing the same defaults so a
 * layout saved by the previous implementation still loads unchanged. Its
 * `customDragger` / `customResizer` flags are gone with the library: this grid
 * always uses its own handles, so there was never anything for them to switch.
 */
export function makeItem(
  placement: Partial<Placement> & { x: number; y: number; w: number; h: number }
): Placement {
  const { min = { w: 1, h: 1 }, max } = placement
  return {
    fixed: false,
    resizable: placement.resizable ?? !placement.fixed,
    draggable: placement.draggable ?? !placement.fixed,
    ...placement,
    min: { w: Math.max(1, min.w), h: Math.max(1, min.h) },
    max: max ? { ...max } : undefined,
  }
}

/** The out-of-the-box arrangement, copied from onebank-ui. */
const DEFAULT_POSITIONS: {
  id: WidgetId
  wide: { x: number; y: number; w: number; h: number; min: { w: number; h: number } }
  narrow: { x: number; y: number; w: number; h: number; min: { w: number; h: number } }
}[] = [
  {
    id: 'barchart',
    wide: { x: 0, y: 0, w: 4, h: 3, min: { w: 2, h: 2 } },
    narrow: { x: 0, y: 0, w: 2, h: 3, min: { w: 2, h: 2 } },
  },
  {
    id: 'piechart',
    wide: { x: 4, y: 0, w: 2, h: 2, min: { w: 2, h: 2 } },
    narrow: { x: 0, y: 3, w: 2, h: 2, min: { w: 2, h: 2 } },
  },
  {
    id: 'balance',
    wide: { x: 4, y: 2, w: 2, h: 2, min: { w: 2, h: 1 } },
    narrow: { x: 0, y: 5, w: 2, h: 2, min: { w: 2, h: 1 } },
  },
  {
    id: 'shortcuts',
    wide: { x: 0, y: 3, w: 4, h: 2, min: { w: 2, h: 1 } },
    narrow: { x: 0, y: 7, w: 2, h: 2, min: { w: 2, h: 1 } },
  },
  {
    id: 'functions',
    wide: { x: 0, y: 5, w: 4, h: 3, min: { w: 2, h: 2 } },
    narrow: { x: 0, y: 9, w: 2, h: 3, min: { w: 2, h: 2 } },
  },
  {
    id: 'calendar',
    wide: { x: 4, y: 4, w: 2, h: 4, min: { w: 2, h: 2 } },
    narrow: { x: 0, y: 12, w: 2, h: 4, min: { w: 2, h: 2 } },
  },
]

/** Every widget the grid knows how to render. */
export const WIDGET_IDS: WidgetId[] = DEFAULT_POSITIONS.map((position) => position.id)

/** A fresh copy of the default layout; never hand out the module's own objects. */
export function defaultLayout(): LayoutItem[] {
  return DEFAULT_POSITIONS.map((position) => ({
    id: position.id,
    [COLS]: makeItem({ ...position.wide }),
    [COLS_SM]: makeItem({ ...position.narrow }),
  }))
}

/**
 * Whether a parsed layout still describes the widgets this build renders.
 *
 * onebank-ui only compares lengths, so renaming or swapping a widget restores a
 * layout with slots for widgets that no longer exist — visible as a blank cell
 * that cannot be recovered without clearing storage. Comparing the id set makes
 * a changed widget list fall back to the default instead.
 */
function describesCurrentWidgets(parsed: unknown): parsed is LayoutItem[] {
  if (!Array.isArray(parsed) || parsed.length !== WIDGET_IDS.length) return false
  const ids = new Set(parsed.map((item) => item?.id))
  return WIDGET_IDS.every((id) => ids.has(id))
}

/**
 * The saved layout, or the default when there is none or it is unusable.
 *
 * Storage is passed in so tests can supply their own, and every access is
 * guarded: a browser in private mode throws on `localStorage` rather than
 * returning null.
 */
export function loadLayout(storage: Storage | undefined = safeStorage()): LayoutItem[] {
  try {
    const saved = storage?.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (describesCurrentWidgets(parsed)) {
        // Re-run through `makeItem` so an item saved before a field existed
        // still gets its default rather than an `undefined`.
        return parsed.map((item: any) => ({
          id: item.id,
          [COLS]: makeItem({ ...item[COLS] }),
          [COLS_SM]: makeItem({ ...item[COLS_SM] }),
        }))
      }
    }
  } catch {
    // Corrupt JSON or a storage that throws: fall through to the default.
  }
  return defaultLayout()
}

/** Persists the layout, silently when storage refuses. */
export function saveLayout(items: LayoutItem[], storage: Storage | undefined = safeStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // A full or unavailable storage costs the user their arrangement, not the page.
  }
}

/**
 * Turns dragging and resizing on or off for every item.
 *
 * Both are off outside edit mode, so an ordinary click inside a widget can
 * never move it.
 */
export function applyEditMode(items: LayoutItem[], enabled: boolean): LayoutItem[] {
  return items.map((item) => ({
    ...item,
    [COLS]: { ...item[COLS], draggable: enabled, resizable: enabled },
    [COLS_SM]: { ...item[COLS_SM], draggable: enabled, resizable: enabled },
  }))
}

function overlaps(a: Placement, b: Placement): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/**
 * Pulls every item as far up as it will go without overlapping.
 *
 * Applied after each move so the grid closes the hole an item left behind,
 * which is what stops repeated drags from walking the layout downwards.
 * Processed top-to-bottom: an item can only settle once everything that could
 * block it already has.
 */
export function compact(items: LayoutItem[], cols: number): LayoutItem[] {
  const ordered = [...items].sort((a, b) => a[cols].y - b[cols].y || a[cols].x - b[cols].x)
  const settled: LayoutItem[] = []

  for (const item of ordered) {
    const placement: Placement = { ...item[cols] }
    while (placement.y > 0) {
      const lifted = { ...placement, y: placement.y - 1 }
      if (settled.some((other) => overlaps(lifted, other[cols]))) break
      placement.y -= 1
    }
    settled.push({ ...item, [cols]: placement })
  }

  // Back into the caller's order, so each-block keys and storage stay stable.
  return items.map((item) => settled.find((candidate) => candidate.id === item.id) as LayoutItem)
}

/**
 * Moves anything overlapping a settled item below it, until nothing overlaps.
 *
 * The anchor never moves — it is where the user just put it. Items settle one
 * at a time and only ever yield to something already settled, so two loose
 * items cannot shove each other back and forth.
 */
function pushOverlapsDown(items: LayoutItem[], anchor: WidgetId, cols: number): LayoutItem[] {
  const next = items.map((item) => ({ ...item }))
  const settled = new Set<WidgetId>([anchor])

  // Nearest first, so an item is displaced by the thing actually on top of it.
  const order = [...next]
    .filter((item) => item.id !== anchor)
    .sort((a, b) => a[cols].y - b[cols].y || a[cols].x - b[cols].x)

  for (const item of order) {
    for (const other of next) {
      if (!settled.has(other.id)) continue
      if (!overlaps(item[cols], other[cols])) continue
      item[cols] = { ...item[cols], y: other[cols].y + other[cols].h }
    }
    settled.add(item.id)
  }
  return next
}

/**
 * Places `id` at `x`/`y`, pushing whatever it lands on downwards.
 *
 * `compact` then closes any gaps left behind. This is the same "push down, then
 * float up" behaviour `svelte-grid` had; it is reimplemented rather than reused
 * because that library was last published in August 2023 and its slot-prop API
 * is what kept this component in Svelte 4 legacy mode.
 */
export function moveItem(items: LayoutItem[], id: WidgetId, cols: number, x: number, y: number): LayoutItem[] {
  const moving = items.find((item) => item.id === id)
  if (!moving) return items

  const placed: Placement = {
    ...moving[cols],
    x: clamp(x, 0, Math.max(0, cols - moving[cols].w)),
    y: Math.max(0, y),
  }

  const next = items.map((item) => (item.id === id ? { ...item, [cols]: placed } : { ...item }))
  return compact(pushOverlapsDown(next, id, cols), cols)
}

/** Resizes `id` within its own min/max, then resolves and compacts as a move does. */
export function resizeItem(items: LayoutItem[], id: WidgetId, cols: number, w: number, h: number): LayoutItem[] {
  const resizing = items.find((item) => item.id === id)
  if (!resizing) return items

  const current: Placement = resizing[cols]
  const resized: Placement = {
    ...current,
    w: clamp(w, current.min.w, Math.min(current.max?.w ?? cols, cols - current.x)),
    h: Math.max(current.min.h, Math.min(h, current.max?.h ?? Infinity)),
  }

  const next = items.map((item) => (item.id === id ? { ...item, [cols]: resized } : { ...item }))
  return compact(pushOverlapsDown(next, id, cols), cols)
}

/** The row count the grid needs to show everything. */
export function rowCount(items: LayoutItem[], cols: number): number {
  return items.reduce((rows, item) => Math.max(rows, item[cols].y + item[cols].h), 0)
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), high)
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}
