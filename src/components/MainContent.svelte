<script lang="ts">
    import {untrack} from "svelte";
    import {innerWidth} from "svelte/reactivity/window";
    import Layout from "./Layout.svelte";
    import FrameContainer from "./FrameContainer.svelte";
    import {displaySidebar} from "../stores/ui";
    import {refreshGroups, seedFromLogin} from "../stores/groups";

    let sidebarExpand = $state(true);

    // The group list comes from the login payload first — MAIN.html read the
    // same cached value rather than calling the core — then a live loadgroups
    // picks up anything created elsewhere since. A one-shot boot task, so
    // nothing it reads may become a dependency.
    $effect(() => {
        untrack(() => {
            seedFromLogin();
            void refreshGroups();
        });
    });

    // Narrow viewports start collapsed, and collapse again if the window is
    // resized down. Widening deliberately does *not* re-expand: once the user
    // has toggled the rail, that choice stands.
    $effect(() => {
        if ((innerWidth.current ?? 0) < 768 && untrack(() => sidebarExpand)) {
            sidebarExpand = false;
        }
    });
</script>

<Layout
        sidebarExpanded={sidebarExpand}
        displaySidebar={$displaySidebar}
        onToggleExpand={() => (sidebarExpand = !sidebarExpand)}
>
    <FrameContainer/>
</Layout>
