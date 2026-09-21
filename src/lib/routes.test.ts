import { describe, expect, it } from 'vitest'
import { sidebarMenuItems } from './constant'
import { menus } from './menus'
import { HOME_PATH, hasScreen, pathForMenuKey, routeDefinitions, routeForMenu, routeForPath } from './routes'

describe('route table', () => {
  it('has unique paths', () => {
    const paths = routeDefinitions.map((r) => r.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('starts at the home path', () => {
    expect(routeForPath(HOME_PATH)?.menu).toBe('HOME')
  })

  it('maps every sidebar entry to a route', () => {
    for (const menu of sidebarMenuItems) {
      if (menu.id === 'LOGOUT') continue
      expect(routeForMenu(menu.id), `no route for menu ${menu.id}`).toBeDefined()
    }
  })

  it('sends a sidebar entry to its main page, not a sub-page sharing its highlight', () => {
    expect(routeForMenu('MESSAGE')?.path).toBe('/messages')
    expect(routeForMenu('AUTHORIZATION')?.path).toBe('/authorization')
  })

  it('matches parameterised paths', () => {
    expect(routeForPath('/messages/M3')?.menu).toBe('MESSAGE')
    expect(routeForPath('/service/LEASING')?.path).toBe('/service/:key')
    expect(routeForPath('/nowhere')).toBeUndefined()
  })

  it('claims each menu key at most once', () => {
    const keys = routeDefinitions.flatMap((r) => r.menuKeys ?? [])
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('only claims keys the menu registry knows', () => {
    for (const key of routeDefinitions.flatMap((r) => r.menuKeys ?? [])) {
      expect(menus[key], `route claims unknown menu key ${key}`).toBeDefined()
    }
  })
})

describe('menu keys', () => {
  it('open their own screen when there is one', () => {
    expect(pathForMenuKey('TRANSFER')).toBe('/transfer')
    expect(pathForMenuKey('ELECTRICITY')).toBe('/bill/electricity')
    expect(hasScreen('ECHEQUE')).toBe(true)
  })

  it('open the coming-soon page otherwise, never nothing', () => {
    expect(pathForMenuKey('LEASING_KRS')).toBe('/service/LEASING_KRS')
    expect(hasScreen('LEASING_KRS')).toBe(false)
  })
})
