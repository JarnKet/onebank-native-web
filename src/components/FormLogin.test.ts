/**
 * The login form signs in against the mock backend and remembers only the
 * username — never the password.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import { get } from 'svelte/store'
import FormLogin from './FormLogin.svelte'
import { loggedIn, loginData } from '../stores/session'
import { resetMockDb } from '../lib/api/mock'

let host: HTMLElement
let app: Record<string, any> | null = null

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await tick()
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

function type(selector: string, value: string): void {
  const input = host.querySelector(selector) as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function submit(): Promise<void> {
  host.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  await settle()
}

beforeEach(async () => {
  localStorage.clear()
  sessionStorage.clear()
  resetMockDb()
  loggedIn.set(false)
  host = document.createElement('div')
  document.body.appendChild(host)
  app = mount(FormLogin, { target: host })
  await settle()
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  host.remove()
})

describe('signing in', () => {
  it('accepts any username and password and opens the app', async () => {
    type('#username', 'somchai')
    type('#password', 'anything')
    await submit()
    expect(get(loggedIn)).toBe(true)
    expect((get(loginData) as any).ONEBANK.groups.length).toBeGreaterThan(0)
  })

  it('refuses an empty password', async () => {
    type('#username', 'somchai')
    await submit()
    expect(get(loggedIn)).toBe(false)
  })

  it('remembers the username but never the password', async () => {
    type('#username', 'somchai')
    type('#password', 'hunter2')
    await submit()
    expect(localStorage.getItem('username')).toBe('somchai')
    const everything = JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage })
    expect(everything).not.toContain('hunter2')
  })
})
