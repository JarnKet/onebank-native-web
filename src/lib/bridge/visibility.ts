/**
 * Relays document visibility into the embedded pages.
 *
 * `MAIN.html` did this (`:1469`, `:1528`), and onebank-ui's pages drive a
 * 30-minute idle auto-logout off the message (`script.js:1489-1526`). Nothing
 * else sends it, so dropping MAIN.html would have silently stopped arming that
 * timer — a security regression that would not show up in any test or in casual
 * use, only as sessions that never expire.
 *
 * The shape is fixed by the receiving pages; do not change it.
 */

/** Every embedded page currently on screen. */
function frames(): HTMLIFrameElement[] {
  return [...document.querySelectorAll('iframe')] as HTMLIFrameElement[]
}

/**
 * Targets the frame's own origin rather than `*`.
 *
 * The payload is innocuous, but a wildcard target would leak it to whatever
 * document happens to occupy the frame, and the bridge is origin-checked in the
 * other direction already.
 */
function originOf(frame: HTMLIFrameElement): string | null {
  try {
    return new URL(frame.src).origin
  } catch {
    return null
  }
}

export function broadcastVisibility(): void {
  const message = {
    from: 'visibilityChanged',
    visibilityState: document.visibilityState,
    hidden: document.hidden,
    type: 'visibilitychange',
  }
  for (const frame of frames()) {
    const origin = originOf(frame)
    if (origin) frame.contentWindow?.postMessage(message, origin)
  }
}

/** Starts relaying. Returns the teardown. */
export function startVisibilityRelay(): () => void {
  document.addEventListener('visibilitychange', broadcastVisibility)
  return () => document.removeEventListener('visibilitychange', broadcastVisibility)
}
