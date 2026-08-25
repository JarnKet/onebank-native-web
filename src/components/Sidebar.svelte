<script lang="ts">
    import Icon from '@iconify/svelte'
    import Member from "./Member.svelte";
    import GroupSwitcher from "./GroupSwitcher.svelte";
    import {currentGroup, onebankGroups, currentSidebarMenu} from "../stores/onebankGroups";
    import {popups} from "../stores/popup";
    import {goHome, navigateToMenu} from "../lib/utils/navigation";
    import {routeForPath} from "../lib/routes";
    import {routeLocation} from "../stores/route";
    import type {SidebarMenuTitle} from "../definition";
    import {sidebarMenuItems} from "../lib/constant";
    import {logout} from "../lib/session";
    import {openAddMemberDialog} from "../stores/ui";

    interface Props {
        expand?: boolean
        displaySidebar?: boolean
        /** Asks the parent to widen or narrow the rail. */
        onToggleExpand?: () => void
    }

    let {expand = false, displaySidebar = true, onToggleExpand}: Props = $props()

    function handleMenuClick(title: SidebarMenuTitle) {
        // Branch on the id, not the English label.
        if (title === 'LOGOUT') {
            // Forgets the stored session before reloading, or the reload would
            // restore the login it is meant to end.
            logout()
            return
        }

        // Leaving a page closes any b1hybrid overlay stacked on top of it.
        $popups = []

        // No early return when the menu is already active: /group and
        // /group-management share the GROUP entry, so an "already there" guard
        // would make one of them unreachable. Re-pushing a route is harmless.
        if (title === 'HOME') {
            goHome()
        } else {
            // onebankid is not passed here — IframeRoute fills it from the active
            // group, and sending an empty one would suppress that fallback.
            navigateToMenu(title)
        }
    }

    // The URL is the source of truth for which entry is highlighted, so a deep
    // link or a back-button press lands with the right item selected. Read via
    // the store, not svelte-spa-router's runes state, which legacy `$:` cannot
    // track — see src/stores/route.ts.
    const activeMenu = $derived(routeForPath($routeLocation.path)?.menu ?? 'HOME')

    // Publishing the highlight is a genuine side effect — the store is shared
    // with the rest of the shell — so it stays an effect rather than a derived.
    $effect(() => {
        $currentSidebarMenu = activeMenu
    })

    const isGroupDataLoading = $derived(
        !$onebankGroups[$currentGroup] || !$onebankGroups[$currentGroup]?.isFinishLoad
    )

    const groupName = $derived($onebankGroups[$currentGroup]?.loadHomeResult?.detail?.name ?? 'Onebank')
    const groupLogo = $derived($onebankGroups[$currentGroup]?.loadHomeResult?.detail?.logoname ?? 'img/ic_onebank.svg')

    /**
     * Where the collapse toggle sits, in pixels from the top of the rail.
     *
     * The rail scrolls now, so the toggle lives on the fixed wrapper rather than
     * inside the group card and has to be told where that card is. dev measured
     * this on a `setTimeout(210)` timed to the CSS transition; a ResizeObserver
     * is the same idea without the magic number, and it also survives the card
     * changing height when a group loads.
     */
    let toggleTop = $state(56)

    function trackGroupCard(node: HTMLElement): () => void {
        const measure = () => {
            toggleTop = node.offsetTop + node.offsetHeight / 2
        }
        const observer = new ResizeObserver(measure)
        observer.observe(node)
        measure()
        return () => observer.disconnect()
    }

</script>


{#if displaySidebar}
    <!-- `h-screen`, not `h-full`: Layout positions this rail with `fixed`, so its
         parent has no height to inherit and `h-full` collapses to the content's
         own height — the rail then overflows the viewport instead of scrolling
         inside it. dev used `calc(100vh-48px)` to clear MAIN.html's tab bar;
         that frame is gone, so the rail gets the whole viewport. -->
    <div class="relative h-screen transition-all duration-200" class:w-[300px]={expand} class:w-[80px]={!expand}>
        <!-- On the fixed wrapper, not inside the card: the rail scrolls, and a
             toggle that scrolled away with it would be unreachable. -->
        <button
                disabled={isGroupDataLoading}
                class="absolute -right-3 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full ob-gradient shadow-md transition-all hover:brightness-110 disabled:bg-gray-200 disabled:bg-none"
                style:top="{toggleTop}px"
                onclick={() => onToggleExpand?.()}
                aria-label={expand ? 'Collapse sidebar' : 'Expand sidebar'}
        >
            <Icon icon={expand ? 'mdi:chevron-left' : 'mdi:chevron-right'} class="text-lg text-white"/>
        </button>

        <div class="h-full overflow-y-auto">
        <div class="w-full min-w-16 space-y-4 p-4">
            {#if expand}
                <img src="img/onebank-vertical.png" alt="OneBank" class="mx-auto h-16 object-contain"/>
            {:else}
                <img src="img/ic_onebank.svg" alt="OneBank" class="ml-auto h-8 w-8 object-contain"/>
            {/if}

            <div class="onebank-card min-w-16 p-4" {@attach trackGroupCard}>
                <div class="flex w-full {expand ? 'flex-row' : 'flex-col'} items-center gap-3 py-2">
                    {#if isGroupDataLoading}
                        <div class="flex-shrink-0 {expand ? 'w-16 h-16' : 'w-12 h-12'} rounded-full border-2 border-white drop-shadow-md bg-gray-200 animate-pulse"></div>
                        {#if expand}
                            <div class="flex flex-1 flex-col gap-2">
                                <div class="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                                <div class="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                                <div class="h-8 w-full bg-gray-200 rounded-xl mt-1 animate-pulse"></div>
                            </div>
                        {:else}
                            <div class="mt-2 h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                        {/if}
                    {:else}
                        <div class="flex-shrink-0 {expand ? 'w-16 h-16' : 'w-12 h-12'} rounded-full border-2 border-white drop-shadow-md">
                            <img src={groupLogo} alt="OneBank Logo" class="h-full w-full rounded-full object-cover"/>
                        </div>
                        {#if expand}
                            <div class="flex flex-1 flex-col gap-2">
                                <div class="font-medium">{groupName}</div>
                                <Member/>
                                <button
                                        type="button"
                                        class="mt-2 w-full rounded-ob-md bg-onebank-red py-2 text-sm font-semibold text-white transition-all hover:brightness-110 active:brightness-90"
                                        onclick={() => openAddMemberDialog()}
                                >ເພີ່ມສະມາຊິກ</button>
                            </div>
                        {/if}
                    {/if}
                </div>
                {#if expand}
                    <!-- Outside the loading branch on purpose: if this group's
                         loadhome fails the skeleton never clears, and a switcher
                         hidden behind it would leave no way off the broken group. -->
                    <GroupSwitcher {expand}/>
                {/if}
            </div>
            <div class="onebank-card min-w-16 p-2">
                <nav class="flex flex-col gap-1">
                    {#if isGroupDataLoading}
                        {#each sidebarMenuItems as skeleton (skeleton.id)}
                            <div class="flex w-full items-center gap-3 rounded-xl p-2.5 {!expand && 'justify-center'} opacity-50">
                                <div class="h-5 w-5 rounded-full bg-gray-200 animate-pulse"></div>
                                {#if expand}
                                    <div class="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                                {/if}
                            </div>
                        {/each}
                    {:else}
                        {#each sidebarMenuItems as sidebarMenu (sidebarMenu.id)}
                            <button
                                    class="flex w-full items-center gap-3 rounded-xl p-2.5
                {$currentSidebarMenu === sidebarMenu.id ? 'ob-gradient text-white' : 'text-gray-700 hover:bg-gray-100'}
                {!expand && 'justify-center'}"
                                    onclick={() => handleMenuClick(sidebarMenu.id)}
                                    aria-label={sidebarMenu.label}
                                    aria-current={$currentSidebarMenu === sidebarMenu.id ? 'page' : undefined}
                            >
                                <div class="relative">
                                    <Icon icon={sidebarMenu.icon}
                                          class="{!expand && ' text-xl'} {$currentSidebarMenu === sidebarMenu.id ? 'text-white' : ''}"/>
                                    {#if sidebarMenu.notifications > 0 && !expand}
                                        <div class="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-onebank-red"></div>
                                    {/if}
                                </div>
                                {#if expand}
                                    <span class="whitespace-nowrap">{sidebarMenu.label}</span>
                                    <!--{#if sidebarMenu.notifications > 0}-->
                                    <!--    <div class="ml-auto flex h-5 w-5 items-center justify-center rounded-full {$currentSidebarMenu === sidebarMenu.id ? 'bg-gray-100' : 'bg-onebank-red'}">-->
                                    <!--        <span class="text-xs {$currentSidebarMenu === sidebarMenu.id ? 'text-gray-700' : 'text-white'}">{sidebarMenu.notifications}</span>-->
                                    <!--    </div>-->
                                    <!--{/if}-->
                                {/if}
                            </button>
                        {/each}
                    {/if}
                </nav>
            </div>
        </div>
        </div>
    </div>
{/if}
