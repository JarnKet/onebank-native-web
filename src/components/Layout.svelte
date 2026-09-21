<script lang="ts">
    /**
     * The authenticated shell: top bar across, the group/nav column on the
     * left, the routed page on the right.
     *
     * At `laptop` and up the left column is always there (304px, or an 88px
     * icon rail when collapsed). Below that it becomes a drawer the top bar's
     * menu button opens, with a scrim that closes it.
     */
    import type {Snippet} from 'svelte';
    import TopBar from './TopBar.svelte';
    import Sidebar from './Sidebar.svelte';
    import AddMemberDialog from './addmemberdialog/AddMemberDialog.svelte';
    import {showAddMemberDialog} from '../stores/ui';
    import {t} from '../lib/utils/helper';
    import {routeForPath} from '../lib/routes';
    import {routeLocation} from '../stores/route';

    interface Props {
        sidebarExpanded?: boolean;
        /** Asks the parent to widen or narrow the column. */
        onToggleExpand?: () => void;
        children?: Snippet;
    }

    let {sidebarExpanded = true, onToggleExpand, children}: Props = $props();

    let drawerOpen = $state(false);

    /** Group management screens take the whole width, as in the design. */
    const fullWidth = $derived(routeForPath($routeLocation.path)?.fullWidth ?? false);
</script>

{#if $showAddMemberDialog}
    <AddMemberDialog/>
{/if}

<div class="flex h-full w-full flex-col overflow-hidden bg-onebank-page">
    <TopBar onMenu={() => (drawerOpen = true)}/>

    <div class="flex min-h-0 flex-1 gap-9 px-4 tablet:px-[27px]">
        <!-- Fixed column at laptop+ -->
        {#if !fullWidth}
            <aside class="hidden shrink-0 overflow-y-auto pb-6 pr-5 transition-[width] duration-200 laptop:block"
                   class:w-81={sidebarExpanded} class:w-27={!sidebarExpanded}>
                <Sidebar expand={sidebarExpanded} {onToggleExpand}/>
            </aside>
        {/if}

        <main class="min-w-0 flex-1 overflow-y-auto pb-8">
            {@render children?.()}
        </main>
    </div>
</div>

<!-- Drawer below laptop -->
{#if drawerOpen}
    <button type="button" class="fixed inset-0 z-40 bg-black/50 laptop:hidden"
            aria-label={t('Close menu', 'ປິດເມນູ')} onclick={() => (drawerOpen = false)}></button>
    <aside class="fixed inset-y-0 left-0 z-50 w-[320px] max-w-[85vw] overflow-y-auto bg-onebank-page p-4 laptop:hidden">
        <Sidebar expand={true} onNavigate={() => (drawerOpen = false)}/>
    </aside>
{/if}
