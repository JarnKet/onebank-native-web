import type { Attachment } from 'svelte/attachments'

/**
 * Calls `onOutside` when a pointer goes down anywhere outside the attached element.
 *
 * An attachment rather than an action: `{@attach}` re-runs when the state it
 * closes over changes and can be passed through a component boundary, neither
 * of which `use:` can do. See https://svelte.dev/docs/svelte/@attach.
 *
 * **Why `pointerdown` and not `click`.** Svelte flushes effects *synchronously*
 * inside a trusted event handler, so an element mounted by a click handler is in
 * the DOM — and this listener registered — while that same click is still
 * bubbling. A `click` listener therefore receives the very click that opened the
 * popup, decides it landed outside, and closes it again; the popup never appears.
 * `pointerdown` for the opening interaction has already fired by then, so it
 * cannot be seen here. A keyboard-activated trigger dispatches `click` with no
 * `pointerdown` at all, so that path is unaffected either way.
 *
 * This replaced a `closest('.language-popup')` / `closest('.language-button')`
 * test, which made two CSS class names load-bearing logic.
 */
export function clickOutside(onOutside: () => void): Attachment<HTMLElement> {
  return (node) => {
    const handle = (event: Event): void => {
      if (!node.contains(event.target as Node)) onOutside()
    }
    document.addEventListener('pointerdown', handle)
    return () => document.removeEventListener('pointerdown', handle)
  }
}
