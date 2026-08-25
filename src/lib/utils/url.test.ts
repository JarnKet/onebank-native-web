/**
 * Menu pages are launched entirely through their querystring, so how a value is
 * serialised decides whether the page renders at all.
 *
 * Every page opened from the menu grid is handed an `accounts` array. This
 * builder used to pass it through `encodeURIComponent(value)`, which coerces
 * with `String()` — so the receiving page got the literal text
 * `[object Object]`, failed to parse its own parameters, and rendered a blank
 * iframe with nothing in the console. onebank-ui's version JSON-encodes objects;
 * the harvest dropped that branch.
 */

import { describe, expect, it } from 'vitest'
import { buildUrlParam, loadUrlParams } from './url'

describe('buildUrlParam', () => {
  it('JSON-encodes an array of objects rather than stringifying it', () => {
    const query = buildUrlParam({ accounts: [{ accountid: 'a1', ccy: 'LAK' }] })

    expect(query, 'the receiving page cannot parse "[object Object]"').not.toContain('object%20Object')
    expect(decodeURIComponent(query)).toBe('accounts=[{"accountid":"a1","ccy":"LAK"}]')
  })

  it('JSON-encodes a plain object', () => {
    expect(decodeURIComponent(buildUrlParam({ detail: { name: 'Ops' } }))).toBe('detail={"name":"Ops"}')
  })

  it('round-trips an accounts array through the querystring', () => {
    const accounts = [
      { accountid: 'a1', account: '0101234567890', ccy: 'LAK', maskedAccount: '010-12xxxxx-890' },
      { accountid: 'a2', account: '0109876543210', ccy: 'USD', maskedAccount: '010-98xxxxx-210' },
    ]
    const parsed = loadUrlParams('?' + buildUrlParam({ accounts }))

    expect(JSON.parse(parsed.accounts as string)).toEqual(accounts)
  })

  it('leaves strings and numbers alone', () => {
    expect(decodeURIComponent(buildUrlParam({ onebankid: 'G-42', versioncode: 320 }))).toBe(
      'onebankid=G-42&versioncode=320',
    )
  })

  it('escapes characters that would otherwise break the querystring', () => {
    const query = buildUrlParam({ name: 'a b&c=d' })

    expect(query).toBe('name=a%20b%26c%3Dd')
    expect(loadUrlParams('?' + query).name).toBe('a b&c=d')
  })

  it('survives an empty or absent bundle', () => {
    expect(buildUrlParam({})).toBe('')
    expect(buildUrlParam(undefined as never)).toBe('')
  })
})
