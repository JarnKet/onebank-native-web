/**
 * Transport for the OneBank services.
 *
 * Everything goes through `Connector`, which owns the RSA/AES session. The
 * transport is injectable so tests never have to build a 2048-bit device key.
 */

import Connector from '../utils/connector'
import { RESULT_OK, RESULT_SESSION_EXPIRED, type ApiEnvelope } from './types'

export type Transport = (service: string, data: Record<string, unknown>) => Promise<any>

let injected: Transport | null = null
let connector: Connector | null = null

/** Replaces the transport. Tests only. */
export function setTransport(transport: Transport | null): void {
  injected = transport
}

function defaultTransport(): Transport {
  // Built lazily: constructing a Connector generates an RSA keypair on first run.
  if (!connector) connector = new Connector()
  return (service, data) => connector!.sendMessage(service, data)
}

export async function call<T extends ApiEnvelope>(service: string, data: Record<string, unknown>): Promise<T> {
  const transport = injected ?? defaultTransport()
  return (await transport(service, data)) as T
}

export function isOk(response: ApiEnvelope | null | undefined): boolean {
  return response?.result === RESULT_OK
}

export function isSessionExpired(response: ApiEnvelope | null | undefined): boolean {
  return response?.result === RESULT_SESSION_EXPIRED
}

/** Thrown by `unwrap`. Carries the core's own message so callers can surface it. */
export class ApiError extends Error {
  readonly result: number
  readonly sessionExpired: boolean

  constructor(response: ApiEnvelope | null | undefined, service: string, command: string) {
    const result = response?.result ?? -1
    super(response?.message || `${service}/${command} failed with result ${result}`)
    this.name = 'ApiError'
    this.result = result
    this.sessionExpired = result === RESULT_SESSION_EXPIRED
  }
}

/**
 * Returns the response when it succeeded, throws `ApiError` otherwise.
 *
 * Commands return the raw envelope so that components harvested from onebank-ui
 * — which all branch on `res.result !== 0` — port over unchanged. New code that
 * would rather use exceptions wraps the call in this.
 */
export function unwrap<T extends ApiEnvelope>(response: T, service = 'ONEBANK', command = 'call'): T {
  if (!isOk(response)) throw new ApiError(response, service, command)
  return response
}
