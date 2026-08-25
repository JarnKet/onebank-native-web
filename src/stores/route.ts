import { readable } from 'svelte/store'

/**
 * The active hash route, as a Svelte store.
 *
 * svelte-spa-router 5 exposes its location as runes state (`router.location`).
 * Svelte 5's legacy mode — which every existing component here still uses —
 * resolves `$:` dependencies statically from referenced identifiers, and an
 * imported binding is not one of them. So `$: x = router.location` runs once and
 * never again, and anything derived from it (the sidebar highlight) freezes.
 *
 * This store republishes the same information over the store contract, which
 * both legacy and runes components track correctly. `push()` always finishes by
 * assigning `window.location.hash`, so `hashchange` is a complete signal; it
 * also covers back/forward and a hand-edited URL.
 */

export interface RouteLocation {
  /** Path without the querystring, e.g. `/role`. Always starts with `/`. */
  path: string
  /** Raw querystring without the `?`, e.g. `page=addpermission`. */
  query: string
}

export function readRouteLocation(href: string = typeof window === 'undefined' ? '' : window.location.href): RouteLocation {
  const hashIndex = href.indexOf('#/')
  let path = hashIndex > -1 ? href.substring(hashIndex + 1) : '/'

  const queryIndex = path.indexOf('?')
  let query = ''
  if (queryIndex > -1) {
    query = path.substring(queryIndex + 1)
    path = path.substring(0, queryIndex)
  }
  return { path: path || '/', query }
}

export const routeLocation = readable<RouteLocation>(readRouteLocation(), (set) => {
  if (typeof window === 'undefined') return
  const update = () => set(readRouteLocation())
  window.addEventListener('hashchange', update)
  // A store with no subscribers stops listening, so re-read on (re)subscribe in
  // case the hash moved while nothing was watching.
  update()
  return () => window.removeEventListener('hashchange', update)
})
