<script lang="ts">
    /**
     * A currency as the design marks it: a round chip (on account pickers) or
     * a pill (on account cards), coloured per currency.
     */
    let {ccy, variant = 'circle'}: {ccy: string; variant?: 'circle' | 'pill'} = $props();

    const COLORS: Record<string, string> = {
        LAK: '#03a9f4',
        USD: '#00c853',
        THB: '#ff8f00',
        CNY: '#e53935',
    };
    const color = $derived(COLORS[ccy] ?? '#9d9fa3');
</script>

{#if variant === 'circle'}
    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
          style="background-color: {color}">{ccy}</span>
{:else}
    <span class="inline-flex h-5 min-w-12 items-center justify-center rounded-full px-3 text-[11px] font-semibold text-white"
          style="background-color: {color}">{ccy}</span>
{/if}
