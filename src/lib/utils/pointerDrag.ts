export interface DragDelta {
  /** Pixels moved since the gesture started. */
  dx: number
  dy: number
}

export interface DragHandlers {
  /** Fired on every move, with the offset from where the gesture started. */
  onMove: (delta: DragDelta) => void
  /** Fired once the pointer is released or the gesture is cancelled. */
  onEnd?: () => void
}

/**
 * Starts a drag gesture from a `pointerdown`, reporting pixel offsets from the
 * origin until the pointer is released.
 *
 * Replaces `svelte-grid`'s `movePointerDown` / `resizePointerDown` slot props,
 * which arrived through `let:` bindings that runes mode forbids — the reason
 * the dashboard was the last Svelte 4 component in the app.
 *
 * **Deliberately a plain function, not an attachment.** `{@attach}` is reactive:
 * it re-runs whenever state read in its expression changes. A drag handler
 * rewrites the layout on every move, so an attachment bound to the item being
 * dragged is torn down and rebuilt mid-gesture, and its listeners go with it —
 * the drag stops tracking after the first move. Called from an `onpointerdown`
 * attribute instead, the gesture lives in this closure, where re-rendering
 * cannot reach it. `HomeGrid.drag.test.ts` pins the multi-move case.
 *
 * The move and up listeners go on `window`, not the handle, so a fast drag that
 * outruns the pointer does not drop the gesture. `setPointerCapture` would do
 * the same, but it retargets subsequent events at the handle and jsdom does not
 * implement it, which would leave the drag untestable.
 */
export function beginPointerDrag(event: PointerEvent | MouseEvent, handlers: DragHandlers): void {
  // Primary button only: a right-click should open a menu, not drag.
  if (event.button !== 0) return

  const origin = { x: event.clientX, y: event.clientY }
  // Stops the browser turning the gesture into a text selection or a scroll.
  event.preventDefault()

  const move = (moved: PointerEvent): void => {
    handlers.onMove({ dx: moved.clientX - origin.x, dy: moved.clientY - origin.y })
  }

  const end = (): void => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', end)
    window.removeEventListener('pointercancel', end)
    handlers.onEnd?.()
  }

  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', end)
  window.addEventListener('pointercancel', end)
}
