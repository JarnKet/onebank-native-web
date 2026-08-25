/** URL param helpers shared by the popup builder and the route dispatcher. */

export function buildUrlParam(params: Record<string, any>): string {
  if (!params) return ''
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(serialise(value))}`)
    .join('&')
}

/**
 * Objects and arrays go over as JSON, everything else as a plain string.
 *
 * This mirrors onebank-ui's `buildUrlParam`, and the object branch is the whole
 * point of it: every page launched from the menu grid is handed an `accounts`
 * array, and `String([{...}])` is `[object Object]`. The receiving page then
 * fails to parse its own parameters and renders nothing — a blank iframe with
 * no error, which is what clicking any menu tile used to produce.
 */
function serialise(value: unknown): string {
  return typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)
}

export function loadUrlParams(search: string = window.location.search): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  for (const [key, value] of new URLSearchParams(search)) params[key] = value
  return params
}
