<script lang="ts">
    /**
     * One tile in a menu grid.
     *
     * Harvested from onebank-ui `pages/DESKTOP/components/MenuIcon.svelte`. Its
     * `isDesktop` branch is gone — this app is only ever the desktop build, so
     * the desktop arm is the only one left.
     */
    import Icon from '@iconify/svelte';
    import type {MenuIcon} from '../../lib/menus';

    let {
        menu,
        hasPin = false,
        usable = true,
        large = false,
        onclick,
    }: {
        menu: MenuIcon
        hasPin?: boolean
        /** False greys the tile out: the group's permissions exclude this menu. */
        usable?: boolean
        /** The roomier layout used by the full menu list. */
        large?: boolean
        onclick?: () => void
    } = $props();
</script>

{#if menu}
    <div
            class="relative h-max cursor-pointer overflow-hidden text-center {large ? 'flex w-full flex-col items-center justify-center tablet:p-2' : 'my-3 w-full'}"
            class:disabled-icon={!usable}
            role="button"
            tabindex="0"
            onclick={onclick}
            onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick?.() } }}
    >
        {#if hasPin}
            <Icon icon="mdi:star" class="absolute right-1 top-1 h-4 w-4 rounded-full bg-onebank-red p-0.5 text-white"/>
        {/if}
        <img src="img/{menu.filename}" alt={menu.name} class="mx-auto h-12 w-12 object-contain tablet:h-14 tablet:w-14"/>
        <div class="mt-1 text-xs leading-tight text-gray-500 tablet:text-sm">{menu.name}</div>
    </div>
{/if}
