<script lang="ts">
    /**
     * A routed page whose content is still an iframe.
     *
     * Phase 1 gives every corporate page a real URL without changing what
     * renders. When a page is migrated, its route swaps this component for the
     * native one and nothing else moves.
     *
     * Route params ride in the hash querystring, so `#/role?page=addpermission`
     * survives a refresh and can be linked to.
     *
     * The component positions itself rather than relying on a wrapper in
     * FrameContainer: a wrapper stays in the DOM on routes that render nothing
     * (home) and covers the main frame, making it unclickable.
     */
    import {router} from 'svelte-spa-router';
    import {buildPageUrl} from '../lib/utils/helper';
    import {currentGroup} from '../stores/onebankGroups';

    let {page}: {page: string} = $props();

    const src = $derived(buildPageUrl(page, router.querystring ?? '', $currentGroup));
</script>

<div class="route-frame absolute left-0 top-0 z-0 w-full">
    <iframe
            title={page}
            {src}
            class="h-full w-full"
            allow="camera; clipboard-read; clipboard-write"
    ></iframe>
</div>

<style>
    /* Fills the container. The 48px offset this used to carry was clearance for
       MAIN.html's tab bar, which no longer exists. */
    .route-frame {
        height: 100%;
    }
</style>
