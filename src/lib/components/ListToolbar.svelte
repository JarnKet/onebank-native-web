<script lang="ts">
    /**
     * The search / date / filter row that heads every list in the design
     * (messages, authorization history, the statement): a rounded search box,
     * a date box with a calendar icon, and the navy "filter" button.
     */
    import type {Snippet} from 'svelte';
    import Icon from '@iconify/svelte';
    import {t} from '../utils/helper';

    let {
        search = $bindable(''),
        date = $bindable(''),
        showDate = true,
        filterCount = 0,
        onFilter,
        children,
    }: {
        search?: string
        /** `YYYY-MM-DD`, or '' for any day. */
        date?: string
        showDate?: boolean
        filterCount?: number
        onFilter?: () => void
        /** Extra controls after the filter button. */
        children?: Snippet
    } = $props();
</script>

<div class="flex flex-wrap gap-3">
    <label class="relative block min-w-56 flex-3">
        <span class="sr-only">{t('Search', 'ຊອກຫາ')}</span>
        <Icon icon="mdi:magnify" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"/>
        <input type="search" bind:value={search} placeholder={t('Search', 'ຊອກຫາ')}
               class="h-11 w-full rounded-ob-xl border border-onebank-ink bg-white pl-11 pr-4 text-center text-sm placeholder:text-onebank-muted focus:border-onebank-red focus:ring-onebank-red"/>
    </label>
    {#if showDate}
        <label class="relative block min-w-44 flex-1">
            <span class="sr-only">{t('Date', 'ວັນທີ')}</span>
            <input type="date" bind:value={date}
                   class="h-11 w-full rounded-ob-xl border border-onebank-ink bg-white px-4 text-center text-sm text-black focus:border-onebank-red focus:ring-onebank-red"/>
        </label>
    {/if}
    {#if onFilter}
        <button type="button" class="relative flex h-11 items-center gap-2 rounded-ob-lg bg-onebank-blue px-4 text-sm text-white" onclick={onFilter}>
            <Icon icon="mdi:filter-variant" class="h-5 w-5"/>{t('Filter', 'ຕົວກັ່ນຕອງ')}
            {#if filterCount > 0}
                <span class="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-onebank-red px-1 text-[11px]">{filterCount}</span>
            {/if}
        </button>
    {/if}
    {@render children?.()}
</div>
