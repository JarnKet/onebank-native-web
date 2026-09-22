<script lang="ts">
    import {untrack} from 'svelte';
    import Layout from './Layout.svelte';
    import FrameContainer from './FrameContainer.svelte';
    import {refreshGroups, seedFromLogin} from '../stores/groups';
    import {currentGroup} from '../stores/onebankGroups';
    import {loadGroupHome} from '../stores/home';
    import {refreshBadges} from '../stores/badges';

    let sidebarExpand = $state(true);

    // The group list comes from the login payload first, then a live
    // `loadgroups` picks up anything created since. A one-shot boot task, so
    // nothing it reads may become a dependency.
    $effect(() => {
        untrack(() => {
            seedFromLogin();
            void refreshGroups();
        });
    });

    // Every screen reads the active group's home (the sidebar card at least),
    // so it is loaded here whenever the group changes — not only by the home
    // route, which left a deep link to `#/account` with an empty card.
    $effect(() => {
        const id = $currentGroup;
        if (!id) return;
        void loadGroupHome(id);
        void refreshBadges(id);
    });
</script>

<Layout sidebarExpanded={sidebarExpand} onToggleExpand={() => (sidebarExpand = !sidebarExpand)}>
    <!-- The routed page, and the b1hybrid / onebank-ui overlays stacked on it. -->
    <FrameContainer/>
</Layout>
