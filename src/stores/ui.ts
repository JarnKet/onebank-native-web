import {writable} from "svelte/store";

export const showAddMemberDialog = writable(false)
export const displaySidebar = writable(true)

export const hideSidebar = () => {
    displaySidebar.set(false)
}

export const showSidebar = () => {
    displaySidebar.set(true)
}

export const closeAddMemberDialog = () => {
    showAddMemberDialog.set(false)
}

export const openAddMemberDialog = () => {
    showAddMemberDialog.set(true)
}

export const setAddMemberDialog = (value: boolean) => {
    showAddMemberDialog.set(value)
}