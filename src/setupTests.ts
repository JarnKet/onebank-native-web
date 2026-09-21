/**
 * Vitest setup. Runs before every test file.
 *
 * jsdom gives us localStorage and window, but not a clean slate between files —
 * clear the stores so a test never inherits another's device key or saved login.
 */
import { afterEach, beforeEach } from 'vitest'

/**
 * A note on `localStorage`, because the failure mode is baffling:
 *
 * Node 22+ ships its own `globalThis.localStorage`, and Vitest's jsdom
 * environment only copies a window key onto the global if the global does not
 * already have it. So Node's implementation wins, jsdom's `Storage` is never
 * installed, and `localStorage.clear()` below throws
 * `localStorage.clear is not a function` in *every* test file.
 *
 * The fix lives in `vitest.config.ts`, which runs the workers with
 * `--no-experimental-webstorage` so Node does not define the global at all.
 * If that option ever disappears, this is the symptom to search for.
 */

/**
 * jsdom has no `ResizeObserver`, and the home dashboard builds one on mount to
 * measure its container. Without this, every test that mounts a route throws
 * from inside that effect.
 *
 * It never fires: nothing in jsdom lays anything out, so the grid keeps the
 * zero width it starts with and renders no cells. That is enough for tests
 * that assert on routing rather than on layout; the ones that need a width
 * substitute their own observer.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

/**
 * jsdom has no `matchMedia`, and `svelte/reactivity/window` calls it at *import*
 * time: its `devicePixelRatio` export is an eagerly-constructed singleton whose
 * constructor subscribes to a media query. `Layout.svelte` imports that module
 * for `innerWidth`, so without this stub every test that reaches the shell fails
 * to even load the module graph.
 */
if (typeof globalThis.matchMedia === 'undefined') {
  globalThis.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof matchMedia
}

/**
 * jsdom has no Web Animations API, and Svelte transitions (`fade`, `scale` on
 * every dialog and menu) call `element.animate` the moment one opens. The stub
 * finishes at once, which is what a test wants from an animation anyway.
 */
if (typeof Element !== 'undefined' && typeof Element.prototype.animate !== 'function') {
  Element.prototype.animate = function () {
    const animation = {
      onfinish: null as null | (() => void),
      finished: Promise.resolve(),
      cancel() {},
      finish() {},
      play() {},
      pause() {},
      reverse() {},
      currentTime: 0,
      playState: 'finished',
    }
    queueMicrotask(() => animation.onfinish?.())
    return animation as unknown as Animation
  }
}

/**
 * Tests assert on English copy. The app defaults to Lao, and `t()` resolves the
 * language once at import time, so this has to be in place before any test
 * file imports the app — top level here, not in a `beforeEach`.
 */
localStorage.setItem('lang', '0')

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
