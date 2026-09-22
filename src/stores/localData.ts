import { writable } from 'svelte/store'

/**
 * True once the screen on show has had an answer from the local store rather
 * than the bank (`src/lib/api/local`). The shell shows a notice while it is
 * set, and clears it on every change of route.
 */
export const usingLocalData = writable(false)
