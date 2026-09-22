import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createFrameMessageHandler, type BridgeHandlers } from './frameBridge'
import { allowedOrigins, isAllowedOrigin } from './origin'
import { env } from '../env'

const B1HYBRID = new URL(env.payloadPath).origin
const ONEBANK_UI = new URL(env.onebankPath).origin

function makeEvent(data: unknown, origin: string) {
  const source = { postMessage: vi.fn() }
  return { data, origin, source } as unknown as MessageEvent & { source: { postMessage: ReturnType<typeof vi.fn> } }
}

let handlers: BridgeHandlers & Record<string, ReturnType<typeof vi.fn>>
let connector: { sendMessage: ReturnType<typeof vi.fn> }
let rejected: Array<string>
let handle: (e: MessageEvent) => Promise<void>

beforeEach(() => {
  handlers = {
    showPopup: vi.fn(),
    showPopupExternal: vi.fn(),
    closePopup: vi.fn(),
    logout: vi.fn(),
    loadData: vi.fn(() => ({ userid: 'U1' })),
    saveData: vi.fn(),
    onLoadHome: vi.fn(),
    updateTab: vi.fn(),
    openAddMemberDialog: vi.fn(),
    groupManagement: vi.fn(),
  } as any
  connector = { sendMessage: vi.fn(async () => ({ result: 0 })) }
  rejected = []
  handle = createFrameMessageHandler({
    connector: connector as any,
    handlers,
    sessionKey: () => 'SK-1',
    onRejectedOrigin: (origin) => rejected.push(origin),
  })
})

describe('origin allowlist', () => {
  it('admits the two origins we deliberately embed', () => {
    expect(isAllowedOrigin(B1HYBRID)).toBe(true)
    expect(isAllowedOrigin(ONEBANK_UI)).toBe(true)
  })

  it('admits our own origin', () => {
    expect(isAllowedOrigin(window.location.origin)).toBe(true)
  })

  it('rejects anything else', () => {
    expect(isAllowedOrigin('https://evil.example')).toBe(false)
    expect(isAllowedOrigin('null')).toBe(false)
    expect(isAllowedOrigin('')).toBe(false)
    expect(isAllowedOrigin(undefined)).toBe(false)
  })

  it('lists each origin once', () => {
    const list = allowedOrigins()
    expect(new Set(list).size).toBe(list.length)
  })
})

describe('messages from a foreign origin', () => {
  it('never reach the backend', async () => {
    await handle(makeEvent({ type: 'sendMessage', service: 'ONEBANKHOME', data: {} }, 'https://evil.example'))
    expect(connector.sendMessage).not.toHaveBeenCalled()
    expect(rejected).toEqual(['https://evil.example'])
  })

  it('cannot read localStorage', async () => {
    localStorage.setItem('authToken', 'secret')
    const event = makeEvent({ type: 'loadAuthToken', key: 'authToken', callbackid: 1 }, 'https://evil.example')
    await handle(event)
    expect(event.source.postMessage).not.toHaveBeenCalled()
  })

  it('cannot write localStorage', async () => {
    await handle(makeEvent({ type: 'saveAuthToken', key: 'x', value: 'y' }, 'https://evil.example'))
    expect(localStorage.getItem('x')).toBeNull()
  })

  it('cannot inject an overlay', async () => {
    await handle(makeEvent({ type: 'showPopupExternal', url: 'https://evil.example/x' }, 'https://evil.example'))
    expect(handlers.showPopupExternal).not.toHaveBeenCalled()
  })
})

describe('backend proxying', () => {
  it('forwards the call and replies on the callback id', async () => {
    connector.sendMessage.mockResolvedValueOnce({ result: 0, items: [] })
    const event = makeEvent(
      { type: 'sendMessage', service: 'ONEBANKTRANSACTION', data: { command: 'viewtransactions' }, callbackid: 7, from: 'onebank' },
      ONEBANK_UI,
    )
    await handle(event)
    expect(connector.sendMessage).toHaveBeenCalledWith('ONEBANKTRANSACTION', { command: 'viewtransactions' })
    expect(event.source.postMessage).toHaveBeenCalledWith(
      { type: 'browserCallback', callbackid: 7, from: 'onebank', result: { result: 0, items: [] } },
      ONEBANK_UI,
    )
  })

  it('caches a successful loadhome', async () => {
    const response = { result: 0, detail: { onebankid: 'G1' } }
    connector.sendMessage.mockResolvedValueOnce(response)
    await handle(
      makeEvent({ type: 'sendMessage', service: 'ONEBANKHOME', data: { command: 'loadhome' }, callbackid: 1 }, ONEBANK_UI),
    )
    expect(handlers.onLoadHome).toHaveBeenCalledWith(response)
  })

  it('does not cache a failed loadhome', async () => {
    connector.sendMessage.mockResolvedValueOnce({ result: 9 })
    await handle(
      makeEvent({ type: 'sendMessage', service: 'ONEBANKHOME', data: { command: 'loadhome' }, callbackid: 1 }, ONEBANK_UI),
    )
    expect(handlers.onLoadHome).not.toHaveBeenCalled()
  })
})

describe('client data', () => {
  it('reports the live session key rather than a null placeholder', async () => {
    const event = makeEvent({ type: 'getClientData', callbackid: 3 }, B1HYBRID)
    await handle(event)
    const payload = event.source.postMessage.mock.calls[0][0]
    expect(payload.result.sessionkey).toBe('SK-1')
    expect(payload.result.devicetype).toBe('B')
  })
})

describe('popup routing', () => {
  it('treats landscape as an ordinary popup on the web', async () => {
    await handle(makeEvent({ type: 'showPopupLandscape', pagename: 'TRANSFER.html' }, B1HYBRID))
    expect(handlers.showPopup).toHaveBeenCalledWith('TRANSFER.html', undefined, undefined)
  })

  it('threads the client callback id through showPopupForResult', async () => {
    await handle(
      makeEvent({ type: 'showPopupForResult', pagename: 'TWOFACTOR.html', clientcallbackid: 'CB9', from: 'onebank' }, ONEBANK_UI),
    )
    expect(handlers.showPopup).toHaveBeenCalledWith('TWOFACTOR.html', undefined, 'onebank', 'CB9')
  })

  it('passes the result back on close', async () => {
    await handle(makeEvent({ type: 'closePopupWithResult', result: { ok: 1 } }, ONEBANK_UI))
    expect(handlers.closePopup).toHaveBeenCalledWith({ ok: 1 })
  })
})

describe('auth token proxy', () => {
  it('reads from our localStorage for an allowed frame', async () => {
    localStorage.setItem('tok', 'abc')
    const event = makeEvent({ type: 'loadAuthToken', key: 'tok', callbackid: 2 }, ONEBANK_UI)
    await handle(event)
    expect(event.source.postMessage).toHaveBeenCalledWith(
      { type: 'browserCallback', callbackid: 2, result: 'abc' },
      ONEBANK_UI,
    )
  })

  it('writes and acknowledges', async () => {
    const event = makeEvent({ type: 'saveAuthToken', key: 'tok', value: 'xyz', callbackid: 4 }, ONEBANK_UI)
    await handle(event)
    expect(localStorage.getItem('tok')).toBe('xyz')
    expect(event.source.postMessage).toHaveBeenCalledWith(
      { type: 'browserCallback', callbackid: 4, result: 0 },
      ONEBANK_UI,
    )
  })
})

describe('unauthenticated container', () => {
  it('ignores handlers it does not supply instead of throwing', async () => {
    const narrow = createFrameMessageHandler({
      connector: connector as any,
      sessionKey: () => null,
      handlers: {
        showPopup: vi.fn(),
        showPopupExternal: vi.fn(),
        closePopup: vi.fn(),
        logout: vi.fn(),
      },
      onRejectedOrigin: () => {},
    })
    await expect(narrow(makeEvent({ type: 'updateTab', onebankid: 'G1' }, ONEBANK_UI))).resolves.toBeUndefined()
    await expect(narrow(makeEvent({ type: 'openAddMemberDialog' }, ONEBANK_UI))).resolves.toBeUndefined()
  })
})

describe('malformed input', () => {
  it('ignores messages with no type', async () => {
    await handle(makeEvent({ foo: 1 }, ONEBANK_UI))
    await handle(makeEvent(null, ONEBANK_UI))
    expect(connector.sendMessage).not.toHaveBeenCalled()
  })

  it('ignores an unknown type', async () => {
    await handle(makeEvent({ type: 'somethingNew' }, ONEBANK_UI))
    expect(handlers.showPopup).not.toHaveBeenCalled()
  })
})
