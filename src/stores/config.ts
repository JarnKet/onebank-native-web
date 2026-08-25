import { writable } from 'svelte/store'
import { env } from '../lib/env'

const getStoredValue = (key: string, defaultValue: string): string => {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key) || defaultValue
  }
  return defaultValue
}

/** Origin serving the legacy b1hybrid pages. Iframe-only; see CLAUDE.md. */
export const payloadPath = writable(env.payloadPath)

/** Origin serving the onebank-ui pages still loaded as iframes. */
export const onebankPath = writable(env.onebankPath)

export const language = writable<string>(getStoredValue('lang', '0'))
