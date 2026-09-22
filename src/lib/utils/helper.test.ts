import { afterEach, describe, expect, it, vi } from 'vitest'
import { encryptPassword, getProfileImageUrl, setLanguage } from './helper'

describe('encryptPassword', () => {
  it('is deterministic for the same input', () => {
    expect(encryptPassword('hunter2')).toBe(encryptPassword('hunter2'))
  })

  it('produces base64 of a SHA-1 digest (28 chars)', () => {
    const hash = encryptPassword('hunter2')
    expect(hash).toMatch(/^[A-Za-z0-9+/]+=*$/)
    expect(hash).toHaveLength(28)
  })

  it('separates different passwords', () => {
    expect(encryptPassword('a')).not.toBe(encryptPassword('b'))
  })
})

describe('getProfileImageUrl', () => {
  it('routes type 1 to the upload host with the profile id', () => {
    expect(getProfileImageUrl(1, 'abc', 'face', '')).toBe('https://public2.bcel.one/upload/abc')
  })

  it('applies the size prefix', () => {
    expect(getProfileImageUrl(1, 'abc', 'face', 't.')).toBe('https://public2.bcel.one/upload/t.abc')
  })

  it('routes type 2 to the faceid host', () => {
    expect(getProfileImageUrl(2, 'abc', 'face', 'm.')).toBe('https://bcel.la:8083/uploadfaceid/m.face')
  })

  it('falls back to the local placeholder for unknown types', () => {
    expect(getProfileImageUrl(0, 'abc', 'face', '')).toBe('img/ic_no_face.svg')
  })
})

describe('setLanguage', () => {
  function fakeLocation(href: string) {
    return { href, replace: vi.fn(), reload: vi.fn() }
  }

  afterEach(() => localStorage.setItem('lang', '0'))

  it('stores the choice and reloads, even when only the #route would differ', () => {
    const location = fakeLocation('http://localhost:7001/#/')
    setLanguage(1, location)
    expect(localStorage.getItem('lang')).toBe('1')
    expect(location.reload).toHaveBeenCalledOnce()
    expect(location.replace).not.toHaveBeenCalled()
  })

  it('drops a ?lang= that would outrank the stored choice', () => {
    const location = fakeLocation('http://localhost:7001/?lang=0#/role')
    setLanguage(2, location)
    expect(location.replace).toHaveBeenCalledWith('http://localhost:7001/#/role')
    expect(location.reload).not.toHaveBeenCalled()
  })
})
