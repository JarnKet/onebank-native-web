/**
 * The login form's dev overrides, resolved into the URLs the app talks to.
 *
 * With `VITE_ENABLE_DEV_OVERRIDES=1` the login form offers "Core IP",
 * "Use production" and "Onebank UI". They used to be written to localStorage
 * and never read back, so every request still went to `VITE_SERVICE_URL`
 * whatever the field said. This is the one place that reads them:
 *
 * - **Core IP** repoints the core (`service3.php`) *and* the b1hybrid pages —
 *   both are served by the same Apache host. Accepts `10.0.19.159`,
 *   `10.0.19.159:8080`, or a full URL (`http://host/path/service3.php`).
 * - **Use production** ignores Core IP and uses the build's own URLs.
 * - **Onebank UI** repoints the onebank-ui pages.
 *
 * With overrides disabled (every production build) the `env` values are
 * returned untouched, so none of this can repoint a real deployment.
 */

import { env } from './env'

export interface DevOverrides {
  coreip: string
  onebankui: string
  useproduction: boolean
}

function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage
  } catch {
    return undefined
  }
}

/** The saved overrides, or null when the build does not allow them. */
export function readOverrides(): DevOverrides | null {
  if (!env.enableDevOverrides) return null
  const store = storage()
  return {
    coreip: (store?.getItem('coreip') ?? '').trim(),
    onebankui: (store?.getItem('onebankui') ?? '').trim(),
    useproduction: store?.getItem('useproduction') === 'true',
  }
}

/** `10.0.19.159` → `http://10.0.19.159`; a value with a scheme is kept as given. */
function withScheme(value: string): string {
  return /^https?:\/\//i.test(value) ? value : `http://${value}`
}

function withTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : value + '/'
}

/** The host part of a Core IP value, e.g. `http://10.0.19.159:8080`. */
function coreOrigin(coreip: string): string | null {
  try {
    return new URL(withScheme(coreip)).origin
  } catch {
    return null
  }
}

/** Where `service3.php` is, honouring Core IP. */
export function serviceUrl(overrides: DevOverrides | null = readOverrides()): string {
  if (!overrides || overrides.useproduction || !overrides.coreip) return env.serviceUrl
  const value = withScheme(overrides.coreip)
  // A full URL to a script is used as is; a bare host gets the build's path.
  if (/\.php(\?|$)/i.test(value)) return value
  const origin = coreOrigin(overrides.coreip)
  if (!origin) return env.serviceUrl
  return origin + new URL(env.serviceUrl).pathname
}

/** Where the b1hybrid pages are: the same Apache host as the core. */
export function payloadPath(overrides: DevOverrides | null = readOverrides()): string {
  if (!overrides || overrides.useproduction || !overrides.coreip) return env.payloadPath
  const origin = coreOrigin(overrides.coreip)
  if (!origin) return env.payloadPath
  return withTrailingSlash(origin + new URL(env.payloadPath).pathname)
}

/** Where the onebank-ui pages are. */
export function onebankPath(overrides: DevOverrides | null = readOverrides()): string {
  if (!overrides || !overrides.onebankui) return env.onebankPath
  try {
    return withTrailingSlash(new URL(withScheme(overrides.onebankui)).href)
  } catch {
    return env.onebankPath
  }
}
