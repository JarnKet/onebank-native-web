import { type Writable, writable } from 'svelte/store';
import type { PopupMetadata } from '../definition';


export const unauthenticatedPopups : Writable<PopupMetadata[]> = writable([])
export const activeUnauthenticatedPopup : Writable<PopupMetadata | null> = writable(null)
export const popups : Writable<PopupMetadata[]> = writable([]);
export const activePopup : Writable<PopupMetadata | null> = writable(null)