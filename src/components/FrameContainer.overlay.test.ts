/**
 * The overlay stack, now that the main frame is gone.
 *
 * The Phase 1 version of this file guarded a specific regression: an
 * absolutely-positioned wrapper around the router outlet stayed in the DOM on
 * routes that rendered nothing, invisibly covering `MAIN.html` and swallowing
 * every click. Phase 2 deleted that frame, so the same hazard now applies to the
 * native home — an empty overlay container painted over it would be just as
 * invisible and just as broken.
 *
 * Mounts the real FrameContainer with the crypto session stubbed out; building
 * a real Connector generates an RSA keypair.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, tick, unmount } from 'svelte'
import { get } from 'svelte/store'

vi.mock('../lib/utils/connector', () => ({
  default: class {
    async sendMessage() {
      return { result: 0 }
    }
  },
}))

import FrameContainer from './FrameContainer.svelte'
import { setTransport } from '../lib/api/client'
import { popups } from '../stores/popup'
import { currentGroup } from '../stores/onebankGroups'
import { groups, groupsLoading, idVerified } from '../stores/groups'
import { loginData } from '../stores/session'

let host: HTMLElement
let app: Record<string, any> | null = null

async function goto(hash: string): Promise<void> {
  window.location.hash = hash
  await new Promise((resolve) => setTimeout(resolve, 0))
  await tick()
}

/** Overlay iframes are the only iframes left in this component. */
function overlays(): Element[] {
  return [...host.querySelectorAll('.popup-container')]
}

/**
 * Full-width absolutely-positioned elements — the ones that would intercept a
 * click on whatever is beneath them.
 */
function covering(): Element[] {
  return [...host.querySelectorAll('.absolute.w-full, .popup-container, .route-frame')]
}

beforeEach(async () => {
  setTransport(async () => ({ result: 0 }))
  loginData.set({ USER: { idverified: 'Y' }, ONEBANK: { groups: [] } } as any)
  idVerified.set(true)
  groupsLoading.set(false)
  groups.set([{ onebankid: 'G-1', name: 'Acme' }])
  currentGroup.set('G-1')
  popups.set([])

  await goto('#/')
  host = document.createElement('div')
  document.body.appendChild(host)
  app = mount(FrameContainer, { target: host })
  await tick()
})

afterEach(() => {
  if (app) unmount(app)
  app = null
  popups.set([])
  host.remove()
})

describe('the main frame is gone', () => {
  it('mounts no MAIN.html iframe', () => {
    const frames = [...host.querySelectorAll('iframe')]
    expect(frames.some((f) => (f.getAttribute('src') ?? '').includes('MAIN.html'))).toBe(false)
  })

  it('renders the native home instead', () => {
    expect(host.querySelectorAll('*').length).toBeGreaterThan(0)
  })
})

describe('at home with nothing stacked', () => {
  it('leaves nothing covering the page, so it stays clickable', () => {
    expect(covering().map((el) => el.className)).toEqual([])
  })

  it('renders no overlay container at all', () => {
    expect(overlays()).toEqual([])
  })
})

describe('with a b1hybrid overlay open', () => {
  beforeEach(async () => {
    popups.set([
      { id: '1', src: 'http://10.0.19.65/b1hybrid/STATEMENT.html', isVisible: true, callbackid: null, isBcelOne: true } as any,
    ])
    await tick()
  })

  it('covers the page — that is the point', () => {
    expect(covering().length).toBeGreaterThan(0)
  })

  it('renders the overlay iframe with the page it was given', () => {
    const frame = host.querySelector('.popup-container iframe')
    expect(frame?.getAttribute('src')).toContain('STATEMENT.html')
  })

  it('uncovers the page again once the stack empties', async () => {
    popups.set([])
    await tick()
    expect(covering()).toEqual([])
  })
})

describe('a routed page', () => {
  it('covers home, and uncovers it on the way back', async () => {
    await goto('#/group-management')
    expect(covering().length).toBeGreaterThan(0)
    await goto('#/')
    expect(covering()).toEqual([])
  })
})

describe('stacked overlays', () => {
  it('shows only the top one', async () => {
    popups.set([
      { id: '1', src: 'http://10.0.19.65/b1hybrid/STATEMENT.html', isVisible: false, callbackid: null, isBcelOne: true } as any,
      { id: '2', src: 'http://10.0.19.65/b1hybrid/TWOFACTOR.html', isVisible: true, callbackid: null, isBcelOne: true } as any,
    ])
    await tick()
    const shown = [...host.querySelectorAll('.popup-container iframe')].filter(
      (f) => !(f.getAttribute('style') ?? '').includes('display: none'),
    )
    expect(shown).toHaveLength(1)
    expect(shown[0].getAttribute('src')).toContain('TWOFACTOR.html')
    expect(get(popups)).toHaveLength(2)
  })
})

describe('leaving an overlay by navigating', () => {
  // A b1hybrid page that fails to load (a 404) has no script to call
  // closePopup, so navigation is the only way out of it without a reload.
  const deadOverlay = { id: 'x', src: 'http://core.test/b1hybrid/MISSING.html', isVisible: true } as any

  it('closes on a route change', async () => {
    popups.set([deadOverlay])
    await tick()
    expect(overlays()).toHaveLength(1)

    await goto('#/account')
    expect(get(popups)).toHaveLength(0)
    expect(overlays()).toHaveLength(0)
  })

  it('closes on back / forward, which the app did not start', async () => {
    await goto('#/account')
    popups.set([deadOverlay])
    await tick()

    await goto('#/')
    expect(overlays()).toHaveLength(0)
  })

  it('closes when navigating to the route already shown', async () => {
    const { navigateToPath } = await import('../lib/utils/navigation')
    popups.set([deadOverlay])
    await tick()

    navigateToPath('/')
    await tick()
    expect(overlays()).toHaveLength(0)
  })
})

describe('an open overlay', () => {
  const overlay = { id: 'y', src: 'http://core.test/b1hybrid/PAGE.html', isVisible: true } as any

  it('hides the routed page, so a tall page cannot show beneath it', async () => {
    const page = () => host.querySelector('[hidden]')
    expect(page()).toBeNull()

    popups.set([overlay])
    await tick()
    expect(page()).not.toBeNull()

    popups.set([])
    await tick()
    expect(page()).toBeNull()
  })

  it('leaves the page shown while every overlay is hidden', async () => {
    popups.set([{ ...overlay, isVisible: false }])
    await tick()
    expect(host.querySelector('[hidden]')).toBeNull()
  })
})

describe('the offline-data notice', () => {
  it('shows while the screen was answered locally, and clears on the next route', async () => {
    const { usingLocalData } = await import('../stores/localData')
    const notice = () => host.querySelector('[role="status"]')
    expect(notice()).toBeNull()

    usingLocalData.set(true)
    await tick()
    expect(notice()?.textContent).toContain('Nothing here was sent to the bank')

    await goto('#/account')
    expect(notice()).toBeNull()
  })
})
