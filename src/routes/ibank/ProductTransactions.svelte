<script lang="ts">
    /**
     * Movements on a term deposit or a loan, between two days: the date range
     * of the statement, then a table with the navy header row.
     */
    import type {GetProductTransactionsResponse, ProductTransaction} from '../../lib/api/types';
    import {formatMoney, t} from '../../lib/utils/helper';
    import {dayText} from './format';

    let {load, ccy}: {load: (from: string, to: string) => Promise<GetProductTransactionsResponse>; ccy: string} = $props();

    let from = $state('');
    let to = $state('');
    let items = $state<ProductTransaction[]>([]);
    let loading = $state(true);
    let error = $state('');

    $effect(() => {
        const range = [from, to];
        loading = true;
        error = '';
        load(range[0], range[1])
            .then((response) => {
                if (response?.result === 0) items = response.items ?? [];
                else error = response?.message || t('Could not load the transactions', 'ໂຫຼດທຸລະກຳບໍ່ໄດ້');
            })
            .catch((e) => (error = (e as Error)?.message || t('Could not load the transactions', 'ໂຫຼດທຸລະກຳບໍ່ໄດ້')))
            .finally(() => (loading = false));
    });
</script>

<div class="space-y-3">
    <div class="flex flex-wrap items-end gap-3">
        <label class="block"><span class="ob-label">{t('From', 'ຈາກວັນທີ')}</span><input type="date" class="ob-input w-44" max={to || undefined} bind:value={from}/></label>
        <label class="block"><span class="ob-label">{t('To', 'ຫາວັນທີ')}</span><input type="date" class="ob-input w-44" min={from || undefined} bind:value={to}/></label>
    </div>
    {#if error}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}
    <div class="overflow-x-auto rounded-ob-md border border-onebank-row">
        <table class="w-full min-w-160 text-left text-sm">
            <thead class="bg-onebank-blue text-white">
                <tr>
                    <th class="px-4 py-3 font-medium">{t('Date', 'ວັນທີ')}</th>
                    <th class="px-4 py-3 font-medium">{t('Description', 'ລາຍລະອຽດ')}</th>
                    <th class="px-4 py-3 text-right font-medium">{t('Debit', 'ເດບິດ')}</th>
                    <th class="px-4 py-3 text-right font-medium">{t('Credit', 'ເຄຣດິດ')}</th>
                    <th class="px-4 py-3 text-right font-medium">{t('Balance', 'ຍອດເງິນ')} ({ccy})</th>
                </tr>
            </thead>
            <tbody>
                {#if loading && items.length === 0}
                    <tr><td colspan="5" class="p-4"><div class="h-24 animate-pulse rounded bg-onebank-row"></div></td></tr>
                {:else}
                    {#each items as item (item.id)}
                        <tr class="border-t border-onebank-row">
                            <td class="px-4 py-3">{dayText(item.date)}</td>
                            <td class="px-4 py-3">{t(item.descriptionEn, item.descriptionLo)}</td>
                            <td class="px-4 py-3 text-right tabular-nums">{item.debit ? formatMoney(item.debit) : '–'}</td>
                            <td class="px-4 py-3 text-right tabular-nums">{item.credit ? formatMoney(item.credit) : '–'}</td>
                            <td class="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(item.balance)}</td>
                        </tr>
                    {:else}
                        <tr><td colspan="5" class="px-4 py-10 text-center text-onebank-subtle">{t('No transactions in this period', 'ບໍ່ມີທຸລະກຳໃນຊ່ວງເວລານີ້')}</td></tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
</div>
