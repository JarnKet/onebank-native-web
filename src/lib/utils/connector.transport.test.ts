/**
 * The encrypted response round trip.
 *
 * The core answers `service3.php` with base64 of `iv || ciphertext`, AES-CBC
 * under the negotiated session password. These tests play the server: they
 * encrypt a known payload exactly the way it does, hand it to `sendMessage`,
 * and check what comes back out.
 *
 * They exist because the hardening pass rewrote the decrypt call — an object
 * literal carrying seven `undefined` properties became
 * `CipherParams.create({ciphertext, iv})` — and "did that change the bytes?"
 * deserves an answer that is not an argument.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import CryptoJS from 'crypto-js'

const post = vi.fn()

vi.mock('axios', () => {
  const isAxiosError = (value: unknown): boolean => Boolean(value && (value as { isAxiosError?: boolean }).isAxiosError)
  return { default: { post, isAxiosError }, isAxiosError }
})

/** 16 bytes of session password, hex, as `exportSession` would have stored it. */
const SESSION_PASSWORD_HEX = '0f1e2d3c4b5a69788796a5b4c3d2e1f0'
const SESSION_KEY = 'test-session-key'

function seedDeviceKey(): void {
  const modulus =
    'c5f0a1d3b7e94c2a8f6b0d5e3a97c14b2e8d6f0a4c7b9e1d3f5a8c0b2d4e6f81' +
    'a3c5e7092b4d6f8103254769abcdef0123456789abcdef0123456789abcdef01'
  localStorage.devicekey = '1'
  localStorage['devicekey-n'] = modulus
  localStorage['devicekey-e'] = '10001'
  localStorage['devicekey-d'] = modulus
  localStorage['devicekey-p'] = 'd3b7e94c2a8f6b0d5e3a97c14b2e8d6f'
  localStorage['devicekey-q'] = 'e7092b4d6f8103254769abcdef012345'
  localStorage['devicekey-dmp1'] = '4c2a8f6b0d5e3a97'
  localStorage['devicekey-dmq1'] = '6f8103254769abcd'
  localStorage['devicekey-coeff'] = '2a8f6b0d5e3a97c1'
}

/**
 * Encrypts like the core does: a random IV, AES-CBC, and the IV prepended to
 * the ciphertext before base64. `concat` mutates its receiver, hence the clone.
 */
function encryptAsServer(payload: unknown): string {
  const key = CryptoJS.enc.Hex.parse(SESSION_PASSWORD_HEX)
  const iv = CryptoJS.lib.WordArray.random(16)
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(payload), key, { iv })
  return iv.clone().concat(encrypted.ciphertext).toString(CryptoJS.enc.Base64)
}

async function connectorWithSession() {
  vi.resetModules()
  const module = await import('./connector')
  module.default.adoptSession(SESSION_KEY, SESSION_PASSWORD_HEX)
  return new module.default()
}

beforeEach(() => {
  post.mockReset()
  seedDeviceKey()
})

describe('an encrypted response', () => {
  it('decrypts back to the object the core sent', async () => {
    const payload = { result: 0, message: 'OK', data: { name: 'Somchai', accounts: [1, 2, 3] } }
    post.mockResolvedValue({ data: encryptAsServer(payload) })

    const connector = await connectorWithSession()

    await expect(connector.sendMessage('USER', { command: 'login' })).resolves.toEqual(payload)
  })

  it('passes a rejection through untouched, message and all', async () => {
    // The exact shape behind "the UI says email or password incorrect": the
    // response decrypts fine, and the core is the thing saying no.
    const payload = { result: 1, message: 'ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ' }
    post.mockResolvedValue({ data: encryptAsServer(payload) })

    const connector = await connectorWithSession()
    const response = await connector.sendMessage('USER', { command: 'login' })

    expect(response.result).toBe(1)
    expect(response.message).toBe('ອີເມວ ຫຼື ລະຫັດຜ່ານບໍ່ຖືກຕ້ອງ')
  })

  it('survives the line breaks the core wraps long base64 with', async () => {
    const payload = { result: 0, message: 'wrapped' }
    const raw = encryptAsServer(payload)
    const wrapped = raw.replace(/(.{40})/g, '$1\r\n')
    post.mockResolvedValue({ data: wrapped })

    const connector = await connectorWithSession()

    await expect(connector.sendMessage('USER', { command: 'login' })).resolves.toEqual(payload)
  })

  it('round-trips a payload with multi-byte characters', async () => {
    const payload = { result: 0, message: 'ສຳເລັດ', data: { name: 'ບໍລິສັດ ການຄ້າ' } }
    post.mockResolvedValue({ data: encryptAsServer(payload) })

    const connector = await connectorWithSession()

    await expect(connector.sendMessage('USER', { command: 'login' })).resolves.toEqual(payload)
  })

  it('takes a plaintext JSON body as-is, without trying to decrypt it', async () => {
    post.mockResolvedValue({ data: '{"result":0,"message":"plain"}' })

    const connector = await connectorWithSession()

    await expect(connector.sendMessage('USER', { command: 'login' })).resolves.toEqual({
      result: 0,
      message: 'plain',
    })
  })

  it('returns an already-parsed body untouched', async () => {
    // axios parses JSON responses itself, so `data` is often not a string.
    post.mockResolvedValue({ data: { result: 0, message: 'parsed by axios' } })

    const connector = await connectorWithSession()

    await expect(connector.sendMessage('USER', { command: 'login' })).resolves.toEqual({
      result: 0,
      message: 'parsed by axios',
    })
  })
})

describe('the encrypted request', () => {
  it('sends the session key, and a body the core can decrypt with it', async () => {
    post.mockResolvedValue({ data: encryptAsServer({ result: 0 }) })

    const connector = await connectorWithSession()
    await connector.sendMessage('USER', { command: 'login', email: 'somchai' })

    const body = post.mock.calls[0][1]
    expect(body.service).toBe('USER')
    expect(body.sessionkey).toBe(SESSION_KEY)

    // Decrypt the request the way the core would, and check it survived.
    const key = CryptoJS.enc.Hex.parse(SESSION_PASSWORD_HEX)
    const iv = CryptoJS.enc.Base64.parse(body.iv)
    const decrypted = CryptoJS.AES.decrypt(
      CryptoJS.lib.CipherParams.create({ ciphertext: CryptoJS.enc.Base64.parse(body.data) }),
      key,
      { iv },
    ).toString(CryptoJS.enc.Utf8)

    expect(JSON.parse(decrypted)).toEqual({ command: 'login', email: 'somchai' })
  })
})
