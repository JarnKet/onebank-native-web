import { type Writable, writable } from 'svelte/store'
import type { LoginData } from '../definition'

export const loggedIn = writable(false)
export const loginData: Writable<LoginData> = writable()
