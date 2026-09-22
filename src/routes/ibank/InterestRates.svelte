<script lang="ts">
    /**
     * Deposit interest rates, one table per kind of account (regular, fixed,
     * premium, junior), picked with tabs. Replaces IBANKINTERESTRATES.
     */
    import {loadInterestRates} from '../../lib/api/unmapped';
    import type {InterestRateTable} from '../../lib/api/types';
    import {splitTime, t} from '../../lib/utils/helper';
    import {currentGroup} from '../../stores/onebankGroups';
    import Tabs from './Tabs.svelte';
    import {percent} from './format';

    let tables = $state<InterestRateTable[]>([]);
    let updated = $state('');
    let active = $state('');
    let loading = $state(true);
    let error = $state('');

    function load(group: string) {
        loading = true;
        error = '';
        loadInterestRates(group)
            .then((response) => {
                if (response?.result === 0) {
                    tables = response.tables ?? [];
                    updated = response.updated ?? '';
                    if (!tables.some((table) => table.id === active)) active = tables[0]?.id ?? '';
                } else error = response?.message || t('Could not load the interest rates', 'ໂຫຼດອັດຕາດອກເບ້ຍບໍ່ໄດ້');
            })
            .catch((e) => (error = (e as Error)?.message || t('Could not load the interest rates', 'ໂຫຼດອັດຕາດອກເບ້ຍບໍ່ໄດ້')))
            .finally(() => (loading = false));
    }

    $effect(() => {
        if ($currentGroup) load($currentGroup);
    });

    const table = $derived(tables.find((candidate) => candidate.id === active));
    const when = $derived(updated ? splitTime(updated) : null);
</script>

<div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-2">
        <h1 class="text-lg font-semibold text-onebank-blue">{t('Interest rates', 'ອັດຕາດອກເບ້ຍ')}</h1>
        {#if when}<p class="text-sm text-onebank-subtle">{t('Published', 'ປະກາດວັນທີ')} {when.date} {when.time}</p>{/if}
    </div>
    {#if error}
        <div class="flex items-center justify-between gap-3 rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">
            <span>{error}</span>
            <button type="button" class="font-semibold underline" onclick={() => $currentGroup && load($currentGroup)}>{t('Retry', 'ລອງໃໝ່')}</button>
        </div>
    {/if}

    <section class="ob-card space-y-4 p-5 tablet:p-6">
        {#if loading && tables.length === 0}
            <div class="h-11 w-2/3 animate-pulse rounded-ob-md bg-onebank-row"></div>
            <div class="h-48 animate-pulse rounded-ob-md bg-onebank-row"></div>
        {:else if tables.length === 0}
            <p class="py-10 text-center text-onebank-subtle">{t('No interest rates published', 'ບໍ່ມີອັດຕາດອກເບ້ຍ')}</p>
        {:else}
            <Tabs label={t('Account type', 'ປະເພດບັນຊີ')} tabs={tables.map((item) => ({id: item.id, label: t(item.nameEn, item.nameLo)}))} bind:value={active}/>
            {#if table}
                <div class="overflow-x-auto rounded-ob-md border border-onebank-row" role="tabpanel">
                    <table class="w-full min-w-130 text-left text-sm">
                        <thead class="bg-onebank-blue text-white">
                            <tr>
                                <th class="px-5 py-3 font-medium">{t('Term', 'ໄລຍະ')}</th>
                                <th class="px-5 py-3 text-right font-medium">LAK</th>
                                <th class="px-5 py-3 text-right font-medium">USD</th>
                                <th class="px-5 py-3 text-right font-medium">THB</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each table.rates as rate (rate.periodEn)}
                                <tr class="border-t border-onebank-row">
                                    <td class="px-5 py-3 font-semibold">{t(rate.periodEn, rate.periodLo)}</td>
                                    <td class="px-5 py-3 text-right tabular-nums">{percent(rate.lak)}</td>
                                    <td class="px-5 py-3 text-right tabular-nums">{percent(rate.usd)}</td>
                                    <td class="px-5 py-3 text-right tabular-nums">{percent(rate.thb)}</td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        {/if}
    </section>
    <p class="text-xs text-onebank-subtle">{t('Rates are a year, before tax. A dash means the account is not offered in that currency.', 'ອັດຕາຕໍ່ປີ ກ່ອນຫັກອາກອນ. ເຄື່ອງໝາຍ – ໝາຍເຖິງບໍ່ມີບັນຊີສະກຸນເງິນນັ້ນ.')}</p>
</div>
