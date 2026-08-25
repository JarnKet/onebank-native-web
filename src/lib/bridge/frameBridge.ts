/**
 * The parent half of the iframe bridge.
 *
 * b1hybrid and the not-yet-migrated onebank-ui pages talk to this app over
 * `postMessage` — see `onebank-ui/src/libs/utils/native.ts` and b1hybrid's
 * `script.js`. Their protocol is fixed: neither repo is edited from here, so
 * this handler must keep answering exactly what it answers today.
 *
 * Previously duplicated across FrameContainer and UnauthenticatedFrameContainer,
 * which had drifted. One implementation, with the authenticated-only handlers
 * supplied by the caller.
 *
 * `updateTab` is gone as of Phase 2. `MAIN.html:988` was its only sender, fired
 * from that file's `loadFrame`, and this app no longer loads MAIN.html — it owns
 * the group list itself (`src/stores/groups.ts`). Note that the migration plan's
 * §1.9 claimed nothing ever sent it; that was wrong, and read against a stale
 * checkout. The message is dead now because its sender is, not because it never
 * fired.
 */

import Connector from '../utils/connector'
import { describeAllowedOrigins, isAllowedOrigin } from './origin'

/** A message from an embedded page. `type` selects the handler. */
export interface FrameMessage {
  type: string
  callbackid?: string | number
  from?: string
  [key: string]: unknown
}

export interface BridgeHandlers {
  /** Opens a page — routed to a native route or an iframe overlay by the caller. */
  showPopup(pagename: string, param?: unknown, from?: string, callbackid?: string): void
  /** Opens an arbitrary external URL in an overlay. */
  showPopupExternal(url: string): void
  closePopup(result?: unknown): void
  /** Ends the session. Today a page reload, since login state is in memory. */
  logout(): void

  /** Authenticated only. Reads the cached login payload for a service key. */
  loadData?(service: string): unknown
  /** Authenticated only. Writes the cached login payload for a service key. */
  saveData?(service: string, data: unknown): void
  /** Authenticated only. Invoked after a successful ONEBANKHOME/loadhome. */
  onLoadHome?(response: any): void
  /** Authenticated only. */
  openAddMemberDialog?(): void
  /** Authenticated only. Group create/join/leave requested by an embedded page. */
  groupManagement?(param: string): void
}

export interface BridgeOptions {
  connector: Connector
  handlers: BridgeHandlers
  /** Reported to embedded pages via `getClientData`. */
  sessionKey: () => string | null
  /** Overridable so tests can assert rejection without touching the console. */
  onRejectedOrigin?(origin: string, message: FrameMessage): void
}

/** Static client facts the embedded pages ask for on startup. */
const CLIENT_VERSION = 2
const CLIENT_DEVICE_TYPE = 'B'
const CLIENT_COORDINATE = '17.963138, 102.607018, 10'

export function createFrameMessageHandler(options: BridgeOptions) {
  const { connector, handlers, sessionKey } = options

  // Warn once per origin: a rejected frame retries constantly and would otherwise
  // bury the console.
  const warned = new Set<string>()
  const onRejectedOrigin =
    options.onRejectedOrigin ??
    ((origin: string, message: FrameMessage) => {
      if (warned.has(origin)) return
      warned.add(origin)
      console.warn(
        `[bridge] dropped "${message.type}" from ${origin}: not an allowed frame origin.\n` +
          `Allowed: ${describeAllowedOrigins()}\n` +
          'Point VITE_PAYLOAD_PATH / VITE_ONEBANK_PATH at the host you are actually ' +
          'browsing, or add the origin to VITE_EXTRA_FRAME_ORIGINS.',
      )
    })

  function reply(event: MessageEvent, payload: Record<string, unknown>): void {
    const source = event.source as WindowProxy | null
    source?.postMessage({ type: 'browserCallback', ...payload }, event.origin)
  }

  return async function handleFrameMessage(event: MessageEvent): Promise<void> {
    const message = event.data as FrameMessage
    if (!message || !message.type) return

    if (!isAllowedOrigin(event.origin)) {
      onRejectedOrigin(event.origin, message)
      return
    }

    switch (message.type) {
      case 'sendMessage': {
        const response = await connector.sendMessage(message.service as string, message.data as any)
        if (
          response?.result === 0 &&
          message.service === 'ONEBANKHOME' &&
          (message.data as any)?.command === 'loadhome'
        ) {
          handlers.onLoadHome?.(response)
        }
        reply(event, { callbackid: message.callbackid, from: message.from, result: response })
        break
      }

      case 'loadData':
        reply(event, {
          callbackid: message.callbackid,
          from: message.from,
          result: handlers.loadData?.(message.service as string),
        })
        break

      case 'saveData':
        handlers.saveData?.(message.service as string, message.data)
        break

      // Landscape is the same overlay on the web; the distinction is native-only.
      case 'showPopup':
      case 'showPopupLandscape':
        handlers.showPopup(message.pagename as string, message.param, message.from)
        break

      case 'showPopupForResult':
        handlers.showPopup(
          message.pagename as string,
          message.param,
          message.from,
          message.clientcallbackid as string,
        )
        break

      case 'showPopupExternal':
        handlers.showPopupExternal(message.url as string)
        break

      case 'closePopup':
        handlers.closePopup()
        break

      case 'closePopupWithResult':
        handlers.closePopup(message.result)
        break

      case 'logout':
      case 'logoutAndExitApp':
        handlers.logout()
        break

      // No biometric hardware in a browser; the pages fall back to a password.
      case 'isBiometricSupported':
        reply(event, { callbackid: message.callbackid, result: 0 })
        break

      case 'getClientData':
        reply(event, {
          callbackid: message.callbackid,
          result: {
            version: CLIENT_VERSION,
            devicetype: CLIENT_DEVICE_TYPE,
            useragent: navigator.userAgent,
            sessionkey: sessionKey(),
            coordinate: CLIENT_COORDINATE,
          },
        })
        break

      case 'loadAuthToken':
        reply(event, { callbackid: message.callbackid, result: localStorage.getItem(message.key as string) })
        break

      case 'saveAuthToken':
        localStorage.setItem(message.key as string, message.value as string)
        reply(event, { callbackid: message.callbackid, result: 0 })
        break

      case 'openAddMemberDialog':
        handlers.openAddMemberDialog?.()
        break

      case 'groupmanagement':
        handlers.groupManagement?.(message.param as string)
        break
    }
  }
}
