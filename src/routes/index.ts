/**
 * Route map for svelte-spa-router.
 *
 * A route with `native: true` mounts its own component; the rest wrap
 * `IframeRoute` with their legacy page name. Migrating a page means adding it
 * to `nativeComponents` and flipping its flag in `src/lib/routes.ts` — the path
 * stays, so deep links and the sidebar do not move.
 */

import wrap from 'svelte-spa-router/wrap'
import Home from './Home.svelte'
import Account from './Account.svelte'
import Group from './Group.svelte'
import IframeRoute from './IframeRoute.svelte'
import { HOME_PATH, routeDefinitions } from '../lib/routes'

/** The native component for each migrated route, keyed by path. */
const nativeComponents: Record<string, any> = {
  [HOME_PATH]: Home,
  '/account': Account,
  '/group': Group,
}

const routes: Record<string, any> = {}

for (const definition of routeDefinitions) {
  const native = definition.native ? nativeComponents[definition.path] : undefined
  if (definition.native && !native) {
    // A route flagged native with no component would render a blank page, which
    // looks like a routing bug rather than a missing import.
    throw new Error(`Route ${definition.path} is marked native but has no component`)
  }
  routes[definition.path] = native ? native : wrap({ component: IframeRoute as any, props: { page: definition.page } })
}

// Anything unrecognised falls back to home rather than a blank screen.
routes['*'] = Home

export default routes
