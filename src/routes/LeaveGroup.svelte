<script lang="ts">
    /**
     * Leaving a group: every group the user is in, searchable, each with its
     * own "leave" button, and the design's warning dialog before it happens.
     */
    import Icon from '@iconify/svelte';
    import Modal from '../lib/components/Modal.svelte';
    import {leaveGroup} from '../lib/api/commands';
    import {initials, t} from '../lib/utils/helper';
    import {goHome} from '../lib/utils/navigation';
    import {groups, refreshGroups} from '../stores/groups';
    import {onebankGroups} from '../stores/onebankGroups';
    import type {OneBankGroup} from '../lib/api/types';

    let search = $state('');
    let leaving = $state<OneBankGroup | null>(null);
    let busy = $state(false);
    let error = $state('');

    const shown = $derived(
        $groups.filter((group) => (group.name ?? group.onebankid).toLowerCase().includes(search.trim().toLowerCase())),
    );

    async function confirm() {
        if (!leaving) return;
        busy = true;
        error = '';
        const response = await leaveGroup(leaving.onebankid);
        busy = false;
        if (response.result !== 0) {
            error = response.message || t('Could not leave the group', 'ອອກຈາກກຸ່ມບໍ່ໄດ້');
            return;
        }
        const left = leaving.onebankid;
        leaving = null;
        onebankGroups.update((all) => {
            const {[left]: _gone, ...rest} = all;
            return rest;
        });
        await refreshGroups();
        if ($groups.length === 0) goHome();
    }
</script>

<section class="mx-auto max-w-3xl space-y-4 pt-2">
    <h1 class="sr-only">{t('Leave a group', 'ອອກຈາກກຸ່ມ')}</h1>
    <label class="relative block">
        <span class="sr-only">{t('Search groups', 'ຄົ້ນຫາກຸ່ມ')}</span>
        <Icon icon="mdi:magnify" class="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2"/>
        <input type="search" bind:value={search} placeholder={t('Search groups', 'ປ້ອນຊື່ກຸ່ມ')}
               class="h-12 w-full rounded-ob-xl border border-onebank-ink bg-white pl-12 pr-4 text-center text-base placeholder:text-onebank-muted focus:border-onebank-red focus:ring-onebank-red"/>
    </label>

    {#if error}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}

    <ul class="space-y-2.5">
        {#each shown as group (group.onebankid)}
            <li class="ob-card flex items-center gap-4 px-4 py-3">
                <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-onebank-light-grey-4 text-sm font-semibold text-white">
                    {initials(group.name)}
                </span>
                <span class="min-w-0 flex-1 truncate text-base font-semibold">{group.name ?? group.onebankid}</span>
                <button type="button" class="flex h-9 items-center gap-2 rounded-ob-sm border border-onebank-blue bg-white px-4 text-sm text-onebank-blue transition-colors hover:border-onebank-red hover:bg-onebank-red hover:text-white"
                        onclick={() => (leaving = group)}>
                    <Icon icon="mdi:logout" class="h-4 w-4"/>{t('Leave', 'ອອກຈາກກຸ່ມ')}
                </button>
            </li>
        {:else}
            <li class="ob-card p-8 text-center text-onebank-subtle">
                {$groups.length === 0 ? t('You are not in any group.', 'ທ່ານບໍ່ໄດ້ຢູ່ໃນກຸ່ມໃດ.') : t('No group matches', 'ບໍ່ພົບກຸ່ມ')}
            </li>
        {/each}
    </ul>
</section>

{#if leaving}
    <Modal size="sm" onClose={() => (leaving = null)}>
        <div class="flex flex-col items-center gap-3 text-center">
            <Icon icon="mdi:alert-outline" class="h-12 w-12 text-onebank-red"/>
            <h2 class="text-xl font-bold">{t('Do you really want to leave this group?', 'ທ່ານຕ້ອງການອອກຈາກກຸ່ມນີ້ແທ້ບໍ?')}</h2>
            <p class="text-sm text-onebank-subtle">
                {t(`Once you leave ${leaving.name}, you can no longer see or act on its accounts and transactions.`,
                   `ຖ້າອອກຈາກກຸ່ມ ${leaving.name}, ທ່ານຈະບໍ່ສາມາດເບິ່ງ ແລະ ເຄື່ອນໄຫວບັນຊີໃນກຸ່ມນີ້ໄດ້ອີກຕໍ່ໄປ.`)}
            </p>
        </div>
        {#snippet footer()}
            <button type="button" class="h-11 min-w-32 rounded-ob-sm border border-onebank-ink bg-white px-5 text-base font-bold" onclick={() => (leaving = null)} disabled={busy}>
                {t('Cancel', 'ຍົກເລີກ')}
            </button>
            <button type="button" class="h-11 min-w-32 rounded-ob-sm bg-onebank-red px-5 text-base font-bold text-white disabled:opacity-50" onclick={confirm} disabled={busy}>
                {busy ? t('Leaving…', 'ກຳລັງອອກ…') : t('Leave group', 'ອອກຈາກກຸ່ມ')}
            </button>
        {/snippet}
    </Modal>
{/if}
