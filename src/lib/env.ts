/**
 * Single typed accessor for build-time configuration.
 *
 * Every value comes from a VITE_* variable so that a deployment change never
 * requires a source edit. Defaults match the shared dev box so an unconfigured
 * checkout still runs.
 */

function str(value: string | undefined, fallback: string): string {
  return value !== undefined && value !== '' ? value : fallback
}

/** A positive integer, or the fallback when unset or nonsense. */
function ms(value: string | undefined, fallback: number): number {
  const parsed = parseInt(str(value, ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/** Guarantees a single trailing slash, so path joining is unambiguous. */
function origin(value: string | undefined, fallback: string): string {
  const raw = str(value, fallback)
  return raw.endsWith('/') ? raw : raw + '/'
}

export const env = {
  serviceUrl: str(import.meta.env.VITE_SERVICE_URL, 'http://10.0.19.65/service3.php'),
  payloadPath: origin(import.meta.env.VITE_PAYLOAD_PATH, 'http://10.0.19.65/b1hybrid/'),
  onebankPath: origin(import.meta.env.VITE_ONEBANK_PATH, 'http://10.0.19.65:7000/'),
  socketHost: str(import.meta.env.VITE_SOCKET_HOST, 'bcel.la'),
  socketPort: parseInt(str(import.meta.env.VITE_SOCKET_PORT, '8872'), 10),

  /**
   * How long a call to the core may take before it is abandoned.
   *
   * Axios defaults to no timeout at all, so a host that accepts the connection
   * and then never answers — a dropped route, a wedged PHP worker — leaves the
   * request pending forever and the UI stuck on its loading state. 20s is well
   * clear of a slow LAN round trip while still failing in human time.
   */
  requestTimeoutMs: ms(import.meta.env.VITE_REQUEST_TIMEOUT_MS, 20000),
  // How long an unmapped command waits for the core before the local store
  // answers instead (src/lib/api/local). Short: the core usually refuses them.
  unmappedTimeoutMs: ms(import.meta.env.VITE_UNMAPPED_TIMEOUT_MS, 5000),

  /**
   * Where an uploaded picture becomes readable. `getuploadurlr2` returns the
   * filename and a signed PUT URL, never the public one — onebank-ui hardcodes
   * this base next to the upload call.
   */
  uploadPublicPath: origin(import.meta.env.VITE_UPLOAD_PUBLIC_PATH, 'https://public2.bcel.one/upload/'),

  /**
   * The login form's Core IP / Onebank UI / production fields let a user
   * repoint the app at an arbitrary host at runtime. Dev affordance only —
   * off unless explicitly enabled.
   */
  enableDevOverrides: import.meta.env.VITE_ENABLE_DEV_OVERRIDES === '1',
} as const

export type Env = typeof env

/**
 * Guards against the shell being served from the address it expects onebank-ui
 * on — the dev-server ports collide by default (both want 7000).
 *
 * The failure is silent and very confusing: Vite answers any unknown path with
 * index.html, so `HOME.html` returns the shell, and the shell's own login
 * screen renders inside the content iframe. Fail loudly instead.
 */
export function assertDistinctOrigins(): void {
  if (typeof window === 'undefined') return
  let onebankOrigin: string
  try {
    onebankOrigin = new URL(env.onebankPath).origin
  } catch {
    return
  }
  if (onebankOrigin !== window.location.origin) return

  console.error(
    `[config] VITE_ONEBANK_PATH points at this app's own origin (${onebankOrigin}).\n` +
      'Embedded pages will load the shell instead of onebank-ui, which renders the\n' +
      'login screen inside the content frame. Serve onebank-ui there and move this\n' +
      'app to another port, or point VITE_ONEBANK_PATH at onebank-ui.',
  )
}
