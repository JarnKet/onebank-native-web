import { describe, expect, it } from 'vitest'
import { env } from './env'
import { onebankPath, payloadPath, serviceUrl, type DevOverrides } from './overrides'

const none: DevOverrides = { coreip: '', onebankui: '', useproduction: false }
const scriptPath = new URL(env.serviceUrl).pathname
const payloadDir = new URL(env.payloadPath).pathname

describe('serviceUrl', () => {
  it('uses the build URL when overrides are off', () => {
    expect(serviceUrl(null)).toBe(env.serviceUrl)
  })

  it('uses the build URL when Core IP is empty', () => {
    expect(serviceUrl(none)).toBe(env.serviceUrl)
  })

  it('repoints a bare IP, keeping the build path', () => {
    expect(serviceUrl({ ...none, coreip: '10.0.19.159' })).toBe(`http://10.0.19.159${scriptPath}`)
  })

  it('keeps a port', () => {
    expect(serviceUrl({ ...none, coreip: '10.0.19.159:8080' })).toBe(`http://10.0.19.159:8080${scriptPath}`)
  })

  it('takes a full script URL as given', () => {
    expect(serviceUrl({ ...none, coreip: 'https://core.test/api/service3.php' })).toBe('https://core.test/api/service3.php')
  })

  it('ignores Core IP when "use production" is ticked', () => {
    expect(serviceUrl({ ...none, coreip: '10.0.19.159', useproduction: true })).toBe(env.serviceUrl)
  })
})

describe('payloadPath', () => {
  it('follows Core IP, since Apache serves b1hybrid next to the core', () => {
    expect(payloadPath({ ...none, coreip: '10.0.19.159' })).toBe(`http://10.0.19.159${payloadDir}`)
  })

  it('stays on the build path otherwise', () => {
    expect(payloadPath(none)).toBe(env.payloadPath)
  })
})

describe('onebankPath', () => {
  it('uses the Onebank UI field, with a trailing slash', () => {
    expect(onebankPath({ ...none, onebankui: 'http://10.0.19.159:7000' })).toBe('http://10.0.19.159:7000/')
  })

  it('falls back to the build path', () => {
    expect(onebankPath(none)).toBe(env.onebankPath)
  })
})
