/**
 * What the login form is allowed to remember.
 *
 * A rejected password used to be written to `localStorage` anyway. It then
 * auto-filled on the next load with `isPasswordSaved` set, so pressing Login
 * replayed the value the core had already refused — and the failure saved it
 * again. The form reported bad credentials for good ones, and the only way out
 * was focusing the password field, which happens to clear it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import FormLogin from './FormLogin.svelte'
import { loggedIn } from '../stores/session'

const sendMessage = vi.fn()

vi.mock('../lib/utils/connector', () => ({
  default: class {
    sendMessage = sendMessage
  },
}))

let host: HTMLElement
let app: Record<string, any> | null = null

/** The hash `encryptPassword` produces; the exact value does not matter here. */
const WRONG_HASH = 'wrong-hash-from-a-previous-attempt'

async function settle(): Promise<void> {
  await tick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await tick()
}

function field(selector: string): HTMLInputElement {
  return host.querySelector(selector) as HTMLInputElement
}

function type(selector: string, value: string): void {
  const input = field(selector)
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function submit(): Promise<void> {
  host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await settle()
}

function open(): void {
  app = mount(FormLogin, { target: host })
}

beforeEach(async () => {
  sendMessage.mockReset()
  loggedIn.set(false)
  host = document.createElement('div')
  document.body.appendChild(host)
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  host.remove()
  localStorage.clear()
})

describe('remembering a password', () => {
  it('does not store one the core rejected', async () => {
    sendMessage.mockResolvedValue({ result: 1, message: 'Incorrect username or password' })
    open()
    await settle()

    type('#username', 'somchai')
    type('input[type="password"]', 'not-my-password')
    await submit()

    expect(localStorage.getItem('password'), 'a rejected password was persisted').toBeNull()
  })

  it('stores one the core accepted', async () => {
    sendMessage.mockResolvedValue({ result: 0, message: 'OK', data: { name: 'Somchai' } })
    open()
    await settle()

    type('#username', 'somchai')
    type('input[type="password"]', 'my-password')
    await submit()

    expect(localStorage.getItem('password')).toBeTruthy()
  })

  it('forgets a stored hash the core refuses, so it is not replayed', async () => {
    localStorage.username = 'somchai'
    localStorage.password = WRONG_HASH
    sendMessage.mockResolvedValue({ result: 1, message: 'Incorrect username or password' })

    open()
    await settle()

    // The saved hash is what gets sent when the user does not touch the field.
    await submit()
    expect(sendMessage.mock.calls[0][1].password).toBe(WRONG_HASH)

    // ...and it must not survive to poison the next attempt.
    expect(localStorage.getItem('password'), 'the refused hash was kept').toBeNull()
    expect(field('input[type="password"]').value).toBe('')
  })

  it('sends a freshly typed password rather than the stored hash after one is refused', async () => {
    localStorage.username = 'somchai'
    localStorage.password = WRONG_HASH
    sendMessage.mockResolvedValue({ result: 1, message: 'Incorrect username or password' })

    open()
    await settle()
    await submit()

    sendMessage.mockResolvedValue({ result: 0, message: 'OK', data: { name: 'Somchai' } })
    type('input[type="password"]', 'the-right-one')
    await submit()

    const sent = sendMessage.mock.calls[1][1].password
    expect(sent).not.toBe(WRONG_HASH)
    expect(sent).toBeTruthy()
  })

  it('shows the core message, and something useful when it sends none', async () => {
    sendMessage.mockResolvedValue({ result: 1 })
    open()
    await settle()

    type('#username', 'somchai')
    type('input[type="password"]', 'nope')
    await submit()

    expect(host.textContent).toMatch(/Incorrect username or password/i)
  })
})
