<script lang="ts">
    import type {Snippet} from "svelte";
    import {innerWidth} from "svelte/reactivity/window";
    import Sidebar from "./Sidebar.svelte";
    import AddMemberDialog from "./addmemberdialog/AddMemberDialog.svelte";
    import {showAddMemberDialog} from "../stores/ui";

    interface Props {
        sidebarExpanded?: boolean;
        displaySidebar?: boolean;
        /** Asks the parent to widen or narrow the rail. */
        onToggleExpand?: () => void;
        children?: Snippet;
    }

    let {sidebarExpanded = true, displaySidebar = true, onToggleExpand, children}: Props = $props();

    // `innerWidth.current` is a reactive view of `window.innerWidth` maintained
    // by Svelte, which replaces the resize listener this component used to
    // register and tear down by hand. `undefined` on the server, hence the `??`.
    // 768px is the `tablet` breakpoint; see the theme block in `src/app.css`.
    const isMobile = $derived((innerWidth.current ?? 0) < 768);
</script>

<div class="flex h-full w-full relative">
    {#if $showAddMemberDialog}
        <AddMemberDialog/>
    {/if}
    <div
            class="fixed tablet:absolute top-0 left-0 z-[2]"
            class:!w-0={!displaySidebar}
            class:w-[300px]={sidebarExpanded && displaySidebar}
            class:w-[80px]={!sidebarExpanded && displaySidebar}
    >
        <Sidebar expand={sidebarExpanded} {displaySidebar} {onToggleExpand}/>
    </div>
    {#if sidebarExpanded && isMobile}
        <!-- The scrim dismisses the sidebar, so it is a control: a real button
             gets keyboard access and a name for free, which the <div> it
             replaced had neither of. -->
        <button
                type="button"
                aria-label="Close sidebar"
                class="fixed inset-0 bg-black/50 z-10 tablet:hidden transition-opacity duration-200"
                onclick={() => onToggleExpand?.()}
        ></button>
    {/if}
    <!-- A landmark, not a div: this is the page's main content, and it gives
         screen readers something to skip to. -->
    <main
            class="flex-1 overflow-y-auto h-full w-full transition-all duration-200 p-4"
            class:ml-0={!displaySidebar}
            class:ml-[300px]={sidebarExpanded && displaySidebar}
            class:ml-[80px]={!sidebarExpanded && displaySidebar}
    >
        {@render children?.()}
    </main>
</div>
