/**
 * Which origins may drive the bridge.
 *
 * The message handler proxies authenticated backend calls and localStorage
 * reads and writes, so an unvalidated sender is a real hole. Only the origins we
 * deliberately embed — b1hybrid and onebank-ui — plus our own are allowed.
 *
 * In development the same server is reachable under several names (`localhost`,
 * `127.0.0.1`, the LAN IP), and a frame will report whichever one its URL used.
 * Treating those as distinct origins rejects our own iframes, so on a dev build
 * loopback aliases of an allowed port are accepted. That relaxation is compiled
 * out of production.
 */

import { onebankPath, payloadPath } from '../overrides'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0'])

function originOf(url: string): string | null {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

/** Origins configured explicitly, for deployments that split hosts. */
function extraOrigins(): string[] {
  const raw = import.meta.env.VITE_EXTRA_FRAME_ORIGINS
  if (!raw) return []
  return raw
    .split(',')
    .map((value) => originOf(value.trim()))
    .filter((value): value is string => value !== null)
}

export function allowedOrigins(): string[] {
  // Resolved, not read from `env`: a frame served from the login form's Core IP
  // or Onebank UI override must be trusted like the configured ones.
  const origins = [originOf(payloadPath()), originOf(onebankPath()), ...extraOrigins()]
  if (typeof window !== 'undefined') origins.push(window.location.origin)
  return [...new Set(origins.filter((o): o is string => o !== null))]
}

/**
 * True when two origins differ only by a host alias for the same machine —
 * `http://localhost:7000` vs `http://10.0.19.65:7000`. Dev only.
 */
function isHostAlias(a: string, b: string): boolean {
  let left: URL
  let right: URL
  try {
    left = new URL(a)
    right = new URL(b)
  } catch {
    return false
  }
  if (left.protocol !== right.protocol || left.port !== right.port) return false
  // One side must be a loopback name for this to be an alias rather than a
  // genuinely different host.
  return LOOPBACK_HOSTS.has(left.hostname) || LOOPBACK_HOSTS.has(right.hostname)
}

/**
 * `postMessage` from a sandboxed or `file:` document reports origin "null".
 * We never embed one, so it is rejected along with everything else unknown.
 */
export function isAllowedOrigin(origin: string | undefined | null): boolean {
  if (!origin || origin === 'null') return false
  const allowed = allowedOrigins()
  if (allowed.includes(origin)) return true
  if (import.meta.env.DEV) return allowed.some((candidate) => isHostAlias(origin, candidate))
  return false
}

/** Human-readable allowlist, for the rejection warning. */
export function describeAllowedOrigins(): string {
  return allowedOrigins().join(', ')
}
