<script lang="ts">
    /** Saved transfer drafts across the top of the transfer page; one opens back into the form. */
    import Icon from '@iconify/svelte';
    import type {TransferDraft} from '../../lib/api/types';
    import {money, t} from '../../lib/utils/helper';

    let {
        drafts,
        onOpen,
        onDelete,
    }: {
        drafts: TransferDraft[]
        onOpen: (draft: TransferDraft) => void
        onDelete: (draft: TransferDraft) => void
    } = $props();

    let showAll = $state(false);
    const shown = $derived(showAll ? drafts : drafts.slice(0, 5));

    function recipients(draft: TransferDraft): string {
        const names = draft.items.map((item) => item.toname.split(' ')[0]);
        return names.length > 4 ? `${names.slice(0, 4).join(', ')} ${t(`and ${names.length - 4} more`, `ແລະ ອີກ ${names.length - 4}`)}` : names.join(', ');
    }
</script>

{#if drafts.length}
    <section class="flex items-stretch gap-3 overflow-x-auto pb-1" aria-label={t('Saved drafts', 'ຮ່າງການໂອນ')}>
        {#each shown as draft (draft.draftid)}
            <div class="group relative w-44 shrink-0 rounded-ob-md bg-white p-3 text-left shadow-ob-card">
                <button type="button" class="block w-full text-left" onclick={() => onOpen(draft)}>
                    <p class="truncate text-xs font-bold uppercase">{draft.name}</p>
                    <p class="line-clamp-2 text-[11px] text-onebank-subtle">{t('To', 'ຫາ')}: {recipients(draft)}</p>
                    <p class="mt-1 text-xs font-semibold text-onebank-red tabular-nums">
                        {money(draft.items.reduce((sum, item) => sum + Number(item.amount || 0), 0), draft.items[0]?.ccy)}
                    </p>
                </button>
                <button type="button" class="absolute right-1.5 top-1.5 hidden rounded-full text-onebank-muted hover:text-onebank-red group-hover:block"
                        aria-label={t('Delete draft', 'ລຶບຮ່າງ')} onclick={() => onDelete(draft)}>
                    <Icon icon="mdi:close-circle" class="h-4 w-4"/>
                </button>
            </div>
        {/each}
        {#if drafts.length > 5}
            <button type="button" class="flex w-16 shrink-0 flex-col items-center justify-center gap-1 text-[11px]" onclick={() => (showAll = !showAll)}>
                <Icon icon={showAll ? 'mdi:chevron-left-circle' : 'mdi:chevron-right-circle'} class="h-7 w-7 text-onebank-muted"/>
                {showAll ? t('Less', 'ໜ້ອຍລົງ') : t('See all', 'ເບິ່ງທັງໝົດ')}
            </button>
        {/if}
    </section>
{/if}
