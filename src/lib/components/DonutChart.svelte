<script lang="ts">
    /**
     * A donut with its legend beside it — the "where the money went" widget.
     *
     * Colours come in the order given and follow the slice's name, never its
     * rank. Three of the five palette slots sit under 3:1 against white, so the
     * legend (name and share, always visible) is the relief the dataviz rules
     * require: identity is never carried by colour alone.
     */
    interface Slice {
        name: string
        value: number
        color: string
    }

    let {slices, centre = '', size = 132}: {slices: Slice[]; centre?: string; size?: number} = $props();

    let hover = $state<string | null>(null);

    const total = $derived(slices.reduce((sum, slice) => sum + slice.value, 0));
    const R = 50;
    const STROKE = 18;
    const C = 2 * Math.PI * R;
    /** A 2px surface gap between segments, as an arc length. */
    const GAP = 2;

    const arcs = $derived.by(() => {
        let offset = 0;
        return slices.map((slice) => {
            const length = total > 0 ? (slice.value / total) * C : 0;
            const arc = {slice, dash: Math.max(0, length - (slices.length > 1 ? GAP : 0)), offset};
            offset += length;
            return arc;
        });
    });

    function percent(value: number): string {
        return total > 0 ? `${Math.round((value / total) * 100)}%` : '0%';
    }
</script>

<div class="flex items-center gap-4">
    <ul class="min-w-0 flex-1 space-y-1.5 text-sm">
        {#each slices as slice (slice.name)}
            <li class="flex items-center gap-2" class:opacity-50={hover !== null && hover !== slice.name}
                onpointerenter={() => (hover = slice.name)} onpointerleave={() => (hover = null)}>
                <span class="h-3 w-3 shrink-0 rounded-sm" style="background-color: {slice.color}"></span>
                <span class="min-w-0 flex-1 truncate text-black">{slice.name}</span>
                <span class="text-onebank-subtle tabular-nums">{percent(slice.value)}</span>
            </li>
        {/each}
    </ul>
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" class="shrink-0"
         aria-label={slices.map((slice) => `${slice.name} ${percent(slice.value)}`).join(', ')}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="#f1f1f1" stroke-width={STROKE}/>
        {#each arcs as arc (arc.slice.name)}
            <circle cx="60" cy="60" r={R} fill="none" stroke={arc.slice.color} stroke-width={hover === arc.slice.name ? STROKE + 4 : STROKE}
                    stroke-dasharray="{arc.dash} {C - arc.dash}" stroke-dashoffset={-arc.offset}
                    transform="rotate(-90 60 60)" class="transition-[stroke-width] duration-150"
                    role="presentation"
                    onpointerenter={() => (hover = arc.slice.name)} onpointerleave={() => (hover = null)}>
                <title>{arc.slice.name}: {percent(arc.slice.value)}</title>
            </circle>
        {/each}
        <text x="60" y="60" text-anchor="middle" dy="0.35em" class="fill-onebank-subtle text-[11px]">{centre}</text>
    </svg>
</div>
