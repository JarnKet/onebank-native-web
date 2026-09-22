/**
 * Mounts the iBank screens against a core that refuses their commands (it has
 * none of them yet), and checks each one renders from the local answers, says
 * so, and sends what it changes in the shape the local store keeps.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, tick, unmount, type Component } from 'svelte'
import { get } from 'svelte/store'
import { setTransport } from '../../lib/api/client'
import { resetLocalData } from '../../lib/api/local'
import { usingLocalData } from '../../stores/localData'
import { loginData } from '../../stores/session'
import { currentGroup, onebankGroups } from '../../stores/onebankGroups'
import AccountDetail from './AccountDetail.svelte'
import Beneficiaries from './Beneficiaries.svelte'
import ExchangeRates from './ExchangeRates.svelte'
import Loans from './Loans.svelte'
import NotificationSettings from './NotificationSettings.svelte'
import { isSlip } from './slips'

const G = 'G1'

const HOME = {
  result: 0,
  detail: { onebankid: G, name: 'Ops' },
  me: { userid: 'U1', name: 'ME' },
  accounts: [
    { accountid: 'A1', account: '010120000123456789', ccy: 'LAK', name: 'Ops savings', alias: '', type: 'SAVING', status: 'ACTIVE', availablebalance: 1500, currentbalance: 1600 },
    { accountid: 'A2', account: '010120000123450000', ccy: 'LAK', name: 'Payroll', alias: '', type: 'CURRENT', status: 'ACTIVE', availablebalance: 500 },
    { accountid: 'A3', account: 'SHA000987', ccy: 'USD', name: 'Shadow one', alias: 'petty cash', type: 'SHADOW', status: 'LOCKED', availablebalance: 20 },
  ],
}

let host: HTMLElement
let app: Record<string, any> | null = null
let sent: Array<{ service: string; data: Record<string, unknown> }>

async function flush(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await tick()
  }
}

async function show(component: Component<any>): Promise<void> {
  app = mount(component, { target: host, props: {} })
  await flush()
}

const text = () => host.textContent ?? ''
const button = (label: string) =>
  [...host.ownerDocument.querySelectorAll('button')].find((candidate) => (candidate.getAttribute('aria-label') ?? candidate.textContent ?? '').trim().includes(label)) as HTMLButtonElement | undefined

function type(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  resetLocalData()
  sent = []
  // The core has no iBank command yet: refuse everything it does not know.
  setTransport(async (service, data) => {
    sent.push({ service, data })
    if (data.command === 'loadhome') return HOME
    if (data.command === 'viewtransactions') return { result: 0, items: [] }
    return { result: 99, message: 'Unknown command' }
  })
  loginData.set({ USER: { userid: 'U1', name: 'ME' } } as any)
  onebankGroups.set({ [G]: { isFinishLoad: true, loadHomeResult: HOME as any } })
  currentGroup.set(G)
  host = document.createElement('div')
  document.body.appendChild(host)
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  host.remove()
  setTransport(null)
})

describe('account detail', () => {
  it('lists the group accounts by kind with a total per currency, from loadhome alone', async () => {
    await show(AccountDetail)
    expect(text()).toContain('Ops savings')
    expect(text()).toContain('petty cash')
    expect(text()).toContain('Bank accounts')
    expect(text()).toContain('Shadow accounts')
    // LAK: 1,500 + 500 available across two accounts.
    expect(text()).toContain('2 accounts · LAK')
    expect(text()).toContain('2,000.00')
    expect(sent).toHaveLength(0)
  })

  it('links each account to its statement', async () => {
    await show(AccountDetail)
    const link = host.querySelector('a[href="#/statement?account=A1"]')
    expect(link?.textContent).toContain('Ops savings')
  })
})

describe('exchange rates', () => {
  it('renders the local rates and raises the offline notice', async () => {
    await show(ExchangeRates)
    expect(sent.map((call) => `${call.service}/${call.data.command}`)).toContain('IBANKEXCHANGERATES/loadRates')
    expect(text()).toContain('THB')
    expect(text()).toContain('Published 09/04/2018')
    expect(get(usingLocalData)).toBe(true)
  })
})

describe('loans', () => {
  it('opens a loan and shows its schedule, paid instalments marked', async () => {
    await show(Loans)
    button('Business working capital')?.click()
    await flush()
    const tab = [...host.querySelectorAll('[role="tab"]')].find((candidate) => candidate.textContent?.includes('Schedule')) as HTMLButtonElement
    tab.click()
    await flush()
    expect(host.querySelectorAll('tbody tr')).toHaveLength(24)
    expect(text()).toContain('Paid')
  })
})

describe('destination accounts', () => {
  it('adds an account through the dialog and removes it after asking', async () => {
    await show(Beneficiaries)
    button('Add account')?.click()
    await flush()
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement
    const [account, name] = [...dialog.querySelectorAll('input:not([type="radio"])')] as HTMLInputElement[]
    type(account, '010120009999')
    type(name, 'Supplier')
    await tick()
    ;(document.querySelector('button[form="add-recipient"]') as HTMLButtonElement).click()
    await flush()

    expect(sent.find((call) => call.data.command === 'addrecipient')?.data).toMatchObject({ account: '010120009999', name: 'Supplier', ccy: 'LAK', bank: 'BCEL' })
    expect(text()).toContain('Supplier')

    button('Remove Supplier')?.click()
    await flush()
    expect(document.body.textContent).toContain('Remove this account?')
    ;[...document.querySelectorAll('[role="dialog"] button')].find((candidate) => candidate.textContent?.trim() === 'Remove')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await flush()
    expect(sent.some((call) => call.data.command === 'removerecipient')).toBe(true)
    expect(text()).not.toContain('Supplier')
  })
})

describe('notification settings', () => {
  it('saves only once something changed, and sends the choices by id', async () => {
    await show(NotificationSettings)
    const save = button('Save') as HTMLButtonElement
    expect(save.disabled).toBe(true)

    const payroll = [...host.querySelectorAll('[role="switch"]')].find((candidate) => candidate.textContent?.includes('Payroll')) as HTMLButtonElement
    expect(payroll.getAttribute('aria-checked')).toBe('false')
    payroll.click()
    await flush()
    expect(payroll.getAttribute('aria-checked')).toBe('true')
    expect(save.disabled).toBe(false)

    save.click()
    await flush()
    const saved = sent.find((call) => call.data.command === 'saveSettings')?.data.settings as Record<string, boolean>
    expect(saved.payroll_alert).toBe(true)
    expect(text()).toContain('Alert settings saved')
    expect(save.disabled).toBe(true)
  })
})

describe('slips', () => {
  it('counts an outgoing transfer as a slip and a received payment as not', () => {
    expect(isSlip({ service: 'TRANSFER', status: 'SUCCESS', amount: -100 })).toBe(true)
    expect(isSlip({ service: 'RECEIVE', status: 'SUCCESS', amount: 100 })).toBe(false)
  })
})
