<script lang="ts">
    /**
     * One cell of the month grid. Harvested from onebank-ui's
     * `DesktopCalendarDay.svelte`.
     */
    import type {CalendarDay} from './calendar';

    let {
        cell,
        selected = false,
        onselect,
    }: {
        cell: CalendarDay
        selected?: boolean
        onselect?: (date: Date) => void
    } = $props();
</script>

{#if cell.isEmpty}
    <div class="h-10"></div>
{:else}
    <button
            type="button"
            class="relative flex h-10 w-full flex-col items-center justify-center rounded-lg text-sm transition-colors
        {selected || cell.isToday ? 'bg-gradient-to-br from-onebank-red to-onebank-dark-red font-semibold text-white' : 'text-gray-700 hover:bg-gray-100'}"
            aria-pressed={selected}
            onclick={() => cell.date && onselect?.(cell.date)}
    >
        {cell.day}
        {#if cell.hasTransactions}
            <span
                    class="absolute bottom-1 h-1.5 w-1.5 rounded-full {selected || cell.isToday ? 'bg-white' : 'bg-onebank-red'}"
                    aria-hidden="true"
            ></span>
        {/if}
    </button>
{/if}
