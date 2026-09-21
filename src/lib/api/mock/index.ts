/**
 * The default transport: an in-process mock of the OneBank core.
 *
 * `../client.ts` sends every command here unless a test injects its own. The
 * short artificial delay is deliberate — it keeps loading states honest, so a
 * screen that forgets its spinner looks broken in the demo too, not only
 * against a real network. Tune with `VITE_MOCK_DELAY_MS` (0 turns it off).
 */

import { env } from '../../env'
import type { Transport } from '../client'
import { handle } from './handlers'

export const mockTransport: Transport = async (service, data) => {
  if (env.mockDelayMs > 0) await new Promise((resolve) => setTimeout(resolve, env.mockDelayMs))
  return handle(service, data)
}

export { resetMockDb } from './db'
export { loginPayload, resolveApproval } from './handlers'
