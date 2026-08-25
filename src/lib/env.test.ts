import { describe, expect, it, vi } from 'vitest'
import { env } from './env'

describe('env', () => {
  it('normalises origins to a single trailing slash', () => {
    // Path joining elsewhere is `origin + 'PAGE.html'`, so the slash must be there
    // exactly once regardless of how the variable was written.
    expect(env.payloadPath.endsWith('/')).toBe(true)
    expect(env.onebankPath.endsWith('/')).toBe(true)
    expect(env.payloadPath.endsWith('//')).toBe(false)
    expect(env.onebankPath.endsWith('//')).toBe(false)
  })

  it('exposes the core endpoint as a full URL, not a bare host', () => {
    expect(env.serviceUrl).toMatch(/^https?:\/\/.+/)
  })

  it('parses the socket port as a number', () => {
    expect(Number.isInteger(env.socketPort)).toBe(true)
    expect(env.socketPort).toBeGreaterThan(0)
  })

  it('treats dev overrides as opt-in', () => {
    expect(typeof env.enableDevOverrides).toBe('boolean')
  })
})

describe('assertDistinctOrigins', () => {
  it('complains when onebank-ui points at our own origin', async () => {
    const { assertDistinctOrigins } = await import('./env')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(env, 'onebankPath', 'get').mockReturnValue(window.location.origin + '/')
    assertDistinctOrigins()
    expect(spy).toHaveBeenCalledOnce()
    expect(spy.mock.calls[0][0]).toContain('VITE_ONEBANK_PATH')
    vi.restoreAllMocks()
  })

  it('stays quiet when the origins differ', async () => {
    const { assertDistinctOrigins } = await import('./env')
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(env, 'onebankPath', 'get').mockReturnValue('http://elsewhere.invalid:7000/')
    assertDistinctOrigins()
    expect(spy).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
