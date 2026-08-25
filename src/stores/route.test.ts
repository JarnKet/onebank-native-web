import { describe, expect, it } from 'vitest'
import { get } from 'svelte/store'
import { readRouteLocation, routeLocation } from './route'

describe('readRouteLocation', () => {
  it('reads the path out of a hash URL', () => {
    expect(readRouteLocation('http://x/#/role')).toEqual({ path: '/role', query: '' })
  })

  it('splits the querystring off', () => {
    expect(readRouteLocation('http://x/#/role?page=addpermission&id=7')).toEqual({
      path: '/role',
      query: 'page=addpermission&id=7',
    })
  })

  it('treats a bare URL as home', () => {
    expect(readRouteLocation('http://x/')).toEqual({ path: '/', query: '' })
  })

  it('treats an empty hash as home', () => {
    expect(readRouteLocation('http://x/#')).toEqual({ path: '/', query: '' })
  })

  it('handles an explicit root hash', () => {
    expect(readRouteLocation('http://x/#/')).toEqual({ path: '/', query: '' })
  })

  it('is not confused by a # inside the querystring value', () => {
    expect(readRouteLocation('http://x/#/group?color=%23ff0000').query).toBe('color=%23ff0000')
  })
})

describe('routeLocation store', () => {
  async function setHash(hash: string): Promise<void> {
    window.location.hash = hash
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  it('tracks hash changes, which is what the sidebar highlight needs', async () => {
    const seen: string[] = []
    const stop = routeLocation.subscribe((value) => seen.push(value.path))

    await setHash('#/role')
    await setHash('#/member')
    await setHash('#/')

    stop()
    expect(seen).toContain('/role')
    expect(seen).toContain('/member')
    expect(seen[seen.length - 1]).toBe('/')
  })

  it('reports the current location on subscribe', async () => {
    await setHash('#/account')
    expect(get(routeLocation).path).toBe('/account')
  })
})
