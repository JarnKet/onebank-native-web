import { describe, expect, it } from 'vitest'
import { formatMoney, getProfileImageUrl, initials, maskAccount } from './helper'

describe('maskAccount', () => {
  it('hides the middle of an 18-digit account', () => {
    expect(maskAccount('010120000123456789')).toBe('010-12-00xxxxx-456-789')
  })

  it('masks a shadow account by its tail', () => {
    expect(maskAccount('SHA000000000000123')).toBe('SHA-xx00-123')
  })

  it('has a placeholder for no account', () => {
    expect(maskAccount(undefined)).toBe('xxxxx-xxxxx-xxxxx')
  })
})

describe('formatMoney', () => {
  it('groups thousands and keeps two decimals', () => {
    expect(formatMoney(162840960.5)).toBe('162,840,960.50')
  })

  it('treats nonsense as zero rather than printing NaN', () => {
    expect(formatMoney('abc')).toBe('0.00')
  })
})

describe('initials', () => {
  it('takes the first letter of the first two words', () => {
    expect(initials('manilitphone thephavanh')).toBe('MT')
  })

  it('has a placeholder for no name', () => {
    expect(initials('')).toBe('?')
  })
})

describe('getProfileImageUrl', () => {
  it('uses a picked picture', () => {
    expect(getProfileImageUrl(1, 'data:image/png;base64,AAA')).toBe('data:image/png;base64,AAA')
  })

  it('falls back to the placeholder', () => {
    expect(getProfileImageUrl(1, 'abc')).toBe('img/ic_no_face.svg')
    expect(getProfileImageUrl(undefined, undefined as any)).toBe('img/ic_no_face.svg')
  })
})
