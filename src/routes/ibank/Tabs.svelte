<script lang="ts" generics="Id extends string">
    /**
     * The tab strip the iBank screens share, drawn as E-Cheque's: navy when
     * active, grey otherwise, 44px tall.
     */
    let {tabs, value = $bindable(), label}: {tabs: Array<{id: Id; label: string}>; value: Id; label: string} = $props();
</script>

<div class="flex flex-wrap gap-2" role="tablist" aria-label={label}>
    {#each tabs as tab (tab.id)}
        <button type="button" role="tab" aria-selected={value === tab.id}
                class="h-11 rounded-ob-md px-4 text-sm transition-colors {value === tab.id ? 'bg-onebank-blue text-white' : 'bg-onebank-page hover:bg-onebank-blue-soft'}"
                onclick={() => (value = tab.id)}>
            {tab.label}
        </button>
    {/each}
</div>
