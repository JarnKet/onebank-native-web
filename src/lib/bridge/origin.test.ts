import { describe, expect, it } from 'vitest'
import { allowedOrigins, describeAllowedOrigins, isAllowedOrigin } from './origin'
import { env } from '../env'

const B1HYBRID = new URL(env.payloadPath).origin
const ONEBANK_UI = new URL(env.onebankPath).origin

describe('the configured allowlist', () => {
  it('admits the two origins we deliberately embed', () => {
    expect(isAllowedOrigin(B1HYBRID)).toBe(true)
    expect(isAllowedOrigin(ONEBANK_UI)).toBe(true)
  })

  it('admits our own origin', () => {
    expect(isAllowedOrigin(window.location.origin)).toBe(true)
  })

  it('lists each origin once', () => {
    const list = allowedOrigins()
    expect(new Set(list).size).toBe(list.length)
  })

  it('describes itself for the rejection warning', () => {
    expect(describeAllowedOrigins()).toContain(ONEBANK_UI)
  })
})

describe('rejection', () => {
  it('rejects an unrelated host', () => {
    expect(isAllowedOrigin('https://evil.example')).toBe(false)
  })

  it('rejects a sandboxed or file document', () => {
    expect(isAllowedOrigin('null')).toBe(false)
    expect(isAllowedOrigin('')).toBe(false)
    expect(isAllowedOrigin(undefined)).toBe(false)
  })

  it('rejects the right host on the wrong port', () => {
    const wrongPort = ONEBANK_UI.replace(/:\d+$/, ':9999')
    expect(isAllowedOrigin(wrongPort)).toBe(false)
  })

  it('rejects the right host on the wrong protocol', () => {
    expect(isAllowedOrigin(ONEBANK_UI.replace('http:', 'https:'))).toBe(false)
  })
})

describe('dev host aliases', () => {
  // A dev server bound to 0.0.0.0 answers on localhost, 127.0.0.1 and the LAN
  // IP alike; a frame reports whichever name its URL used. Same port, same
  // protocol, one side loopback -> same server.
  const port = new URL(env.onebankPath).port

  it('accepts localhost for a configured LAN port', () => {
    expect(isAllowedOrigin(`http://localhost:${port}`)).toBe(true)
  })

  it('accepts 127.0.0.1 for a configured LAN port', () => {
    expect(isAllowedOrigin(`http://127.0.0.1:${port}`)).toBe(true)
  })

  it('does not accept a loopback alias on an unconfigured port', () => {
    expect(isAllowedOrigin('http://localhost:9999')).toBe(false)
  })

  it('does not treat two non-loopback hosts as aliases', () => {
    expect(isAllowedOrigin(`http://192.168.1.50:${port}`)).toBe(false)
  })

  it('does not alias across protocols', () => {
    expect(isAllowedOrigin(`https://localhost:${port}`)).toBe(false)
  })
})
