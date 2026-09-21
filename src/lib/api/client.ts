/**
 * Transport for the OneBank services.
 *
 * Every command in `commands.ts` goes through `call`, and `call` goes through
 * one `Transport`. By default that is the in-process mock backend in `./mock`;
 * tests inject their own with `setTransport`. A real backend would be one more
 * `Transport` and nothing else would change.
 */

import { mockTransport } from './mock'
import { RESULT_OK, type ApiEnvelope } from './types'

export type Transport = (service: string, data: Record<string, unknown>) => Promise<any>

let injected: Transport | null = null

/** Replaces the transport. Tests only; `null` restores the mock backend. */
export function setTransport(transport: Transport | null): void {
  injected = transport
}

export async function call<T extends ApiEnvelope>(service: string, data: Record<string, unknown>): Promise<T> {
  const transport = injected ?? mockTransport
  return (await transport(service, data)) as T
}

export function isOk(response: ApiEnvelope | null | undefined): boolean {
  return response?.result === RESULT_OK
}
