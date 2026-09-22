import { writable } from 'svelte/store'
import { onebankPath as resolveOnebankPath, payloadPath as resolvePayloadPath } from '../lib/overrides'

const getStoredValue = (key: string, defaultValue: string): string => {
  try {
    if (typeof localStorage !== 'undefined') return localStorage.getItem(key) || defaultValue
  } catch {
    // Storage disabled: fall through to the default.
  }
  return defaultValue
}

/**
 * The language the login screen is shown in: 0 English, 1 Lao, 2 Vietnamese,
 * 3 Chinese. Lao is the default, as it is in the design. Not the same thing as
 * the `lang` URL parameter `t()` in `lib/utils/helper.ts` reads — see CLAUDE.md.
 */
/** Origin serving the legacy b1hybrid pages. Iframe-only; see CLAUDE.md. */
export const payloadPath = writable(resolvePayloadPath())

/** Origin serving the onebank-ui pages still loaded as iframes. */
export const onebankPath = writable(resolveOnebankPath())

export const language = writable<string>(getStoredValue('lang', '1'))
