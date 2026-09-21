import { writable } from 'svelte/store'

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
export const language = writable<string>(getStoredValue('lang', '1'))
