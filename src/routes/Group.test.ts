/**
 * Mounts the native GROUP page and checks what it sends and what it leaves
 * behind: the trimmed name goes to `changegroupdetail`, the cached group detail
 * is patched on the way out, and a failed save keeps the user on the form.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import { get } from 'svelte/store'
import Group from './Group.svelte'
import { setTransport } from '../lib/api/client'
import { currentGroup, loadHomeResult, onebankGroups } from '../stores/onebankGroups'

let host: HTMLElement
let app: Record<string, any> | null = null
let sent: Array<{ service: string; data: Record<string, unknown> }>
let respond: (service: string, data: Record<string, unknown>) => any

function field(id: string): HTMLInputElement | HTMLTextAreaElement {
  return host.querySelector(`#${id}`) as HTMLInputElement
}

function saveButton(): HTMLButtonElement {
  return host.querySelector('button[type="submit"]') as HTMLButtonElement
}

/**
 * Calls for one command. Saving also kicks off a `loadgroups` refresh — that is
 * `closePopup`'s doing, not this page's — so assertions name what they want.
 */
function callsTo(command: string): Array<{ service: string; data: Record<string, unknown> }> {
  return sent.filter((call) => call.data.command === command)
}

/** Types into a bound field the way Svelte 5 expects: set, then dispatch. */
async function type(id: string, value: string): Promise<void> {
  const element = field(id)
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  await tick()
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await tick()
}

beforeEach(async () => {
  sent = []
  respond = () => ({ result: 0 })
  setTransport(async (service, data) => {
    sent.push({ service, data })
    return respond(service, data)
  })
  onebankGroups.set({
    G1: {
      isFinishLoad: true,
      loadHomeResult: {
        result: 0,
        detail: { onebankid: 'G1', name: 'Ops', detail: 'the ops group', color: '#33FFF5', logoname: 'https://cdn/logo.png' },
        accounts: [],
        users: [],
      } as any,
    },
  })
  currentGroup.set('G1')
  window.location.hash = '#/group'
  host = document.createElement('div')
  document.body.appendChild(host)
  app = mount(Group, { target: host, props: {} })
  await flush()
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  host.remove()
  setTransport(null)
})

describe('seeding', () => {
  it('fills the form from the cached group rather than refetching', () => {
    expect(field('groupName').value).toBe('Ops')
    expect(field('groupDetail').value).toBe('the ops group')
    // onebank-ui calls loadhome here purely to fill these two fields.
    expect(sent).toHaveLength(0)
  })

  it('shows the group logo', () => {
    expect(host.querySelector('img')?.getAttribute('src')).toBe('https://cdn/logo.png')
  })

  it('fetches when nothing is cached, as on a deep link', async () => {
    if (app) unmount(app)
    onebankGroups.set({})
    respond = () => ({ result: 0, detail: { onebankid: 'G1', name: 'Fetched' }, accounts: [], users: [] })

    app = mount(Group, { target: host, props: {} })
    await flush()

    expect(callsTo('loadhome')).toHaveLength(1)
    expect(callsTo('loadhome')[0].service).toBe('ONEBANKHOME')
    expect(field('groupName').value).toBe('Fetched')
  })
})

describe('saving', () => {
  it('sends the trimmed name, the description and the untouched colour', async () => {
    await type('groupName', '  Ops Team  ')
    await type('groupDetail', 'now with a description')
    saveButton().click()
    await flush()

    const saves = callsTo('changegroupdetail')
    expect(saves).toHaveLength(1)
    expect(saves[0].service).toBe('ONEBANKGROUP')
    expect(saves[0].data).toMatchObject({
      command: 'changegroupdetail',
      name: 'Ops Team',
      detail: 'now with a description',
      color: '#33FFF5',
      logoname: 'https://cdn/logo.png',
      onebankid: 'G1',
    })
  })

  it('patches the cached group detail so home shows the new name', async () => {
    await type('groupName', 'Ops Team')
    saveButton().click()
    await flush()

    expect(get(loadHomeResult)?.detail?.name).toBe('Ops Team')
  })

  it('returns home', async () => {
    await type('groupName', 'Ops Team')
    saveButton().click()
    await flush()

    expect(window.location.hash).toBe('#/')
  })

  it('keeps the user on the form and shows why when the core refuses', async () => {
    respond = () => ({ result: 1, message: 'name already taken' })
    await type('groupName', 'Ops Team')
    saveButton().click()
    await flush()

    expect(host.textContent).toContain('name already taken')
    expect(get(loadHomeResult)?.detail?.name).toBe('Ops')
    expect(host.querySelector('#groupName')).not.toBeNull()
  })

  it('will not save an empty name', async () => {
    await type('groupName', '   ')
    expect(saveButton().disabled).toBe(true)
    saveButton().click()
    await flush()
    expect(callsTo('changegroupdetail')).toHaveLength(0)
  })

  it('clears the logo back to the default with an empty logoname', async () => {
    onebankGroups.set({
      G2: {
        isFinishLoad: true,
        loadHomeResult: { result: 0, detail: { onebankid: 'G2', name: 'No logo' }, accounts: [], users: [] } as any,
      },
    })
    currentGroup.set('G2')
    await flush()

    saveButton().click()
    await flush()

    expect(callsTo('changegroupdetail')[0].data).toMatchObject({ logoname: '' })
  })
})
