<script lang="ts">
    /** Widget title bar with the collapse control. From onebank-ui. */
    import Icon from '@iconify/svelte';
    import type {Snippet} from 'svelte';

    let {onCollapse, children}: {onCollapse: () => void; children?: Snippet} = $props();
</script>

<div class="mb-2 flex w-full items-center gap-2">
    <button onclick={onCollapse} aria-label="Collapse widget" class="rounded hover:bg-gray-100">
        <Icon icon="mdi:chevron-down" width="20"/>
    </button>
    <div class="flex-1">{@render children?.()}</div>
</div>
