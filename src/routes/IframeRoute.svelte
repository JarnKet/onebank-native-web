<script lang="ts">
    /**
     * A Figma route whose screen is not native yet: its legacy page, framed.
     *
     * The route owns the URL, the sidebar highlight and the deep link; only the
     * content is still a b1hybrid / onebank-ui page. When the route flips to
     * `native: true` this component simply stops being mounted for it.
     *
     * Route params ride in the hash querystring, so `#/role?page=addpermission`
     * survives a refresh and can be linked to. Read through `routeLocation`,
     * never svelte-spa-router's internals (CLAUDE.md).
     */
    import {buildPageUrl} from '../lib/utils/helper';
    import {currentGroup} from '../stores/onebankGroups';
    import {routeLocation} from '../stores/route';

    let {page}: {page: string} = $props();

    const src = $derived(buildPageUrl(page, $routeLocation.query, $currentGroup));
</script>

<div class="route-frame ob-card h-full min-h-[calc(100vh-220px)] overflow-hidden">
    <iframe
            title={page}
            {src}
            class="block h-full min-h-[inherit] w-full border-0 bg-white"
            allow="camera; clipboard-read; clipboard-write"
    ></iframe>
</div>
