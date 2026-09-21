import {derived, writable} from "svelte/store";
import type {GroupDetail, LoadHomeResult, SidebarMenuTitle} from "../definition";

interface GroupMetadata{
    isFinishLoad : boolean
    loadHomeResult : LoadHomeResult
}

interface KeyPair{
    [key : string] : GroupMetadata
}

export const currentGroup = writable<string>("")
export const onebankGroups = writable<KeyPair>({})
export const currentSidebarMenu = writable<SidebarMenuTitle>("HOME")

/**
 * The active group's `loadhome` payload, or null before it arrives.
 *
 * onebank-ui's HOME components all read a store of this exact name and shape
 * (`pages/HOME/store.ts`), so harvesting them needs no rewrite at the read
 * sites. Null is normal, not exceptional: `registerGroup` creates an entry as
 * soon as a group is known, well before its home has loaded.
 */
export const loadHomeResult = derived(
	[onebankGroups, currentGroup],
	([groups, active]) => groups[active]?.loadHomeResult ?? null,
)

/**
 * Records a successful ONEBANKHOME/loadhome and makes that group the active one.
 *
 * The group id on the loadhome response is the signal: whichever group most
 * recently loaded its home is the one on screen.
 */
export function adoptLoadHomeResult(response: LoadHomeResult | undefined | null): boolean {
	const onebankid = response?.detail?.onebankid
	if (!onebankid) return false

	onebankGroups.update(groups => ({
		...groups,
		[onebankid]: {
			...groups[onebankid],
			loadHomeResult: response as LoadHomeResult,
			isFinishLoad: true,
		},
	}))
	currentGroup.set(onebankid)
	return true
}

/** Registers a group we know exists but whose home has not loaded yet. */
export function registerGroup(onebankid: string): void {
	if (!onebankid) return
	onebankGroups.update(groups =>
		groups[onebankid] ? groups : {...groups, [onebankid]: {isFinishLoad: false, loadHomeResult: null as any}},
	)
}

/** Merges an edited name / description / logo into the cached home, so it shows at once. */
export function patchGroupDetail(onebankid: string, patch: Partial<GroupDetail>): void {
	onebankGroups.update(groups => {
		const group = groups[onebankid]
		if (!group?.loadHomeResult) return groups
		return {
			...groups,
			[onebankid]: {
				...group,
				loadHomeResult: {...group.loadHomeResult, detail: {...group.loadHomeResult.detail, ...patch}},
			},
		}
	})
}
