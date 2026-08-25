/**
 * Mounts the native ACCOUNT page and checks the four things it can do to an
 * account — lock, remove, rename, add — reach the wire in the shape the core
 * expects, and that destructive ones ask first.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import Account from './Account.svelte'
import { setTransport } from '../lib/api/client'
import { loginData } from '../stores/session'
import { currentGroup, onebankGroups } from '../stores/onebankGroups'
import type { LoginData } from '../definition'

let host: HTMLElement
let app: Record<string, any> | null = null
let sent: Array<{ service: string; data: Record<string, unknown> }>
let respond: (service: string, data: Record<string, unknown>) => any

const SAVING = {
  accountid: 'A1',
  account: '010120000123456789',
  ccy: 'LAK',
  name: 'Ops savings',
  alias: '',
  type: 'SAVING',
  status: 'ACTIVE',
  availablebalance: 1500,
}

const SHADOW = {
  accountid: 'A2',
  account: 'SHA000987',
  ccy: 'USD',
  name: 'Shadow one',
  alias: 'petty cash',
  type: 'SHADOW',
  status: 'LOCKED',
  availablebalance: 20,
}

function home(accounts: unknown[] = [SAVING, SHADOW]) {
  return { result: 0, detail: { onebankid: 'G1', name: 'Ops' }, accounts, users: [] }
}

function callsTo(command: string) {
  return sent.filter((call) => call.data.command === command)
}

function buttonsLabelled(label: string): HTMLButtonElement[] {
  return [...host.querySelectorAll('button')].filter((button) =>
    (button.getAttribute('aria-label') ?? button.textContent ?? '').includes(label),
  ) as HTMLButtonElement[]
}

function text(): string {
  return host.textContent ?? ''
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await tick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await tick()
}

/** Opens the kebab menu on the nth account card. */
async function openMenu(index: number): Promise<void> {
  buttonsLabelled('More actions')[index].click()
  await flush()
}

beforeEach(async () => {
  sent = []
  respond = (_service, data) => {
    if (data.command === 'loadhome') return home()
    if (data.command === 'getavailableaccounts') return { result: 0, accounts: ['A9'] }
    return { result: 0 }
  }
  setTransport(async (service, data) => {
    sent.push({ service, data })
    return respond(service, data)
  })
  loginData.set({
    USER: {
      cards: [
        {
          cardid: 'C1',
          cardtype: 'BCEL One',
          cardname: 'Main',
          cardnumber: '1234',
          filename: 'card.png',
          accounts: [{ accountid: 'A9', account: '010120000999999999', ccy: 'LAK', name: 'Personal', type: 'SAVING' }],
        },
      ],
    },
  } as unknown as LoginData)
  onebankGroups.set({ G1: { isFinishLoad: true, loadHomeResult: home() as any } })
  currentGroup.set('G1')
  host = document.createElement('div')
  document.body.appendChild(host)
  app = mount(Account, { target: host, props: {} })
  await flush()
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  host.remove()
  setTransport(null)
})

describe('the list', () => {
  it('renders a card per account in the group', () => {
    expect(text()).toContain('Ops savings')
    expect(text()).toContain('Shadow one')
  })

  it('masks the account number until it is revealed', async () => {
    expect(text()).not.toContain('010120000123456789')

    buttonsLabelled('Show account number')[0].click()
    await flush()

    expect(text()).toContain('010120000123456789')
  })

  it('reads the group from the store rather than refetching', () => {
    expect(callsTo('loadhome')).toHaveLength(0)
  })

  it('asks which of the user’s accounts are still addable', () => {
    expect(callsTo('getavailableaccounts')).toHaveLength(1)
  })

  it('offers an alias only on shadow and virtual accounts', () => {
    // The saving account has no alias row; the shadow one shows its alias.
    expect(text()).toContain('petty cash')
    expect(host.querySelectorAll('[aria-label="Edit alias"]')).toHaveLength(1)
  })
})

describe('locking', () => {
  it('confirms before it changes anything', async () => {
    await openMenu(0)
    buttonsLabelled('Lock account')[0].click()
    await flush()

    expect(text()).toContain('Do you want to lock this account?')
    expect(callsTo('changeaccountstatus')).toHaveLength(0)
  })

  it('sends the opposite status once confirmed', async () => {
    await openMenu(0)
    buttonsLabelled('Lock account')[0].click()
    await flush()
    buttonsLabelled('Confirm')[0].click()
    await flush()

    const calls = callsTo('changeaccountstatus')
    expect(calls).toHaveLength(1)
    expect(calls[0].service).toBe('ONEBANKGROUP')
    expect(calls[0].data.accounts).toEqual([{ accountid: 'A1', status: 'LOCKED' }])
  })

  it('unlocks an account that is locked', async () => {
    await openMenu(1)
    buttonsLabelled('Unlock account')[0].click()
    await flush()
    buttonsLabelled('Confirm')[0].click()
    await flush()

    expect(callsTo('changeaccountstatus')[0].data.accounts).toEqual([{ accountid: 'A2', status: 'ACTIVE' }])
  })

  it('reloads the list afterwards, rather than closing the page', async () => {
    await openMenu(0)
    buttonsLabelled('Lock account')[0].click()
    await flush()
    buttonsLabelled('Confirm')[0].click()
    await flush()

    expect(callsTo('loadhome')).toHaveLength(1)
    expect(text()).toContain('Account status changed')
  })
})

describe('removing', () => {
  it('warns that closing a shadow account is permanent', async () => {
    await openMenu(1)
    buttonsLabelled('Remove account')[0].click()
    await flush()

    expect(text()).toContain('permanently')
  })

  it('does not warn about permanence for an ordinary account', async () => {
    await openMenu(0)
    buttonsLabelled('Remove account')[0].click()
    await flush()

    expect(text()).toContain('Do you want to remove the account?')
    expect(text()).not.toContain('permanently')
  })

  it('sends one remove instruction once confirmed', async () => {
    await openMenu(0)
    buttonsLabelled('Remove account')[0].click()
    await flush()
    buttonsLabelled('Confirm')[0].click()
    await flush()

    expect(callsTo('changeaccounts')[0].data.accounts).toEqual([{ accountid: 'A1', action: 'remove' }])
  })

  it('changes nothing when the dialog is cancelled', async () => {
    await openMenu(0)
    buttonsLabelled('Remove account')[0].click()
    await flush()
    buttonsLabelled('Cancel')[0].click()
    await flush()

    expect(callsTo('changeaccounts')).toHaveLength(0)
  })
})

describe('the alias', () => {
  it('saves the edited value against the account', async () => {
    ;(host.querySelector('[aria-label="Edit alias"]') as HTMLButtonElement).click()
    await flush()

    const input = host.querySelector('input[type="text"]') as HTMLInputElement
    input.value = '  new name  '
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await tick()

    buttonsLabelled('Save')[0].click()
    await flush()

    const calls = callsTo('changeaccountalias')
    expect(calls).toHaveLength(1)
    expect(calls[0].data).toMatchObject({ accountid: 'A2', alias: 'new name' })
  })

  it('sends null for an emptied alias, which is how the core drops it', async () => {
    ;(host.querySelector('[aria-label="Edit alias"]') as HTMLButtonElement).click()
    await flush()

    const input = host.querySelector('input[type="text"]') as HTMLInputElement
    input.value = ''
    input.dispatchEvent(new Event('input', { bubbles: true }))
    await tick()

    buttonsLabelled('Save')[0].click()
    await flush()

    expect(callsTo('changeaccountalias')[0].data.alias).toBeNull()
  })
})

describe('adding from a personal account', () => {
  it('offers only the accounts the core says are still available', async () => {
    buttonsLabelled('Add from personal account')[0].click()
    await flush()

    expect(text()).toContain('Personal')
    expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(1)
  })

  it('adds the checked accounts in one batch', async () => {
    buttonsLabelled('Add from personal account')[0].click()
    await flush()

    const checkbox = host.querySelector('input[type="checkbox"]') as HTMLInputElement
    checkbox.click()
    await flush()

    buttonsLabelled('Save')[0].click()
    await flush()

    expect(callsTo('changeaccounts')[0].data.accounts).toEqual([{ accountid: 'A9', action: 'add' }])
    expect(text()).toContain('Accounts added')
  })
})

describe('opening a new account', () => {
  it('sends the type, the source account and the alias', async () => {
    buttonsLabelled('Add Shadow Account')[0].click()
    await flush()

    const radio = host.querySelector('input[type="radio"]') as HTMLInputElement
    radio.click()
    await flush()

    const alias = host.querySelector('#newAccountAlias') as HTMLInputElement
    alias.value = 'petty'
    alias.dispatchEvent(new Event('input', { bubbles: true }))
    await tick()

    buttonsLabelled('Open account')[0].click()
    await flush()

    const calls = callsTo('opennewaccount')
    expect(calls).toHaveLength(1)
    // The only command on the ONEBANK service; the core takes the group from
    // the session, so no onebankid rides along.
    expect(calls[0].service).toBe('ONEBANK')
    expect(calls[0].data).toMatchObject({ accountType: 'SHADOW', accountid: 'A9', alias: 'petty' })
  })
})
