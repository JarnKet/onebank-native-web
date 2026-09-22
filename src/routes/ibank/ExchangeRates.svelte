<script lang="ts">
    /**
     * The bank's exchange rates against the kip: cash buy/sell (not every
     * currency is bought as notes) and transfer buy/sell, with the time they
     * were published. Replaces onebank-ui's IBANKEXCHANGERATES page.
     */
    import Icon from '@iconify/svelte';
    import ListToolbar from '../../lib/components/ListToolbar.svelte';
    import {loadExchangeRates} from '../../lib/api/unmapped';
    import type {ExchangeRate} from '../../lib/api/types';
    import {splitTime, t} from '../../lib/utils/helper';
    import {currentGroup} from '../../stores/onebankGroups';
    import {rateText} from './format';

    let rates = $state<ExchangeRate[]>([]);
    let updated = $state('');
    let loading = $state(true);
    let error = $state('');
    let search = $state('');

    function load(group: string) {
        loading = true;
        error = '';
        loadExchangeRates(group)
            .then((response) => {
                if (response?.result === 0) {
                    rates = response.rates ?? [];
                    updated = response.updated ?? '';
                } else error = response?.message || t('Could not load the exchange rates', 'ໂຫຼດອັດຕາແລກປ່ຽນບໍ່ໄດ້');
            })
            .catch((e) => (error = (e as Error)?.message || t('Could not load the exchange rates', 'ໂຫຼດອັດຕາແລກປ່ຽນບໍ່ໄດ້')))
            .finally(() => (loading = false));
    }

    $effect(() => {
        if ($currentGroup) load($currentGroup);
    });

    const shown = $derived.by(() => {
        const query = search.trim().toLowerCase();
        return query ? rates.filter((rate) => `${rate.ccy} ${rate.nameEn} ${rate.nameLo}`.toLowerCase().includes(query)) : rates;
    });
    const when = $derived(updated ? splitTime(updated) : null);
</script>

<div class="space-y-4">
    <div class="flex flex-wrap items-end justify-between gap-2">
        <h1 class="text-lg font-semibold text-onebank-blue">{t('Exchange rates', 'ອັດຕາແລກປ່ຽນ')}</h1>
        {#if when}<p class="text-sm text-onebank-subtle">{t('Published', 'ປະກາດວັນທີ')} {when.date} {when.time}</p>{/if}
    </div>
    <ListToolbar bind:search showDate={false}/>
    {#if error}
        <div class="flex items-center justify-between gap-3 rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">
            <span>{error}</span>
            <button type="button" class="font-semibold underline" onclick={() => $currentGroup && load($currentGroup)}>{t('Retry', 'ລອງໃໝ່')}</button>
        </div>
    {/if}

    <div class="overflow-x-auto rounded-ob-md bg-white shadow-ob-card">
        <table class="w-full min-w-180 text-left text-sm">
            <thead class="bg-onebank-blue text-white">
                <tr>
                    <th rowspan="2" class="px-6 py-3 font-medium">{t('Currency', 'ສະກຸນເງິນ')}</th>
                    <th colspan="2" class="border-l border-white/20 px-4 pt-3 pb-1 text-center font-medium">{t('Cash', 'ເງິນສົດ')}</th>
                    <th colspan="2" class="border-l border-white/20 px-4 pt-3 pb-1 text-center font-medium">{t('Transfer', 'ການໂອນ')}</th>
                </tr>
                <tr class="text-xs">
                    <th class="border-l border-white/20 px-4 pb-3 text-right font-normal">{t('We buy', 'ຊື້')}</th>
                    <th class="px-4 pb-3 text-right font-normal">{t('We sell', 'ຂາຍ')}</th>
                    <th class="border-l border-white/20 px-4 pb-3 text-right font-normal">{t('We buy', 'ຊື້')}</th>
                    <th class="px-4 pb-3 text-right font-normal">{t('We sell', 'ຂາຍ')}</th>
                </tr>
            </thead>
            <tbody>
                {#if loading && rates.length === 0}
                    {#each [0, 1, 2, 3] as i (i)}<tr><td colspan="5" class="px-6 py-2"><div class="h-8 animate-pulse rounded bg-onebank-row"></div></td></tr>{/each}
                {:else}
                    {#each shown as rate (rate.ccy)}
                        <tr class="border-t border-onebank-row">
                            <td class="px-6 py-3">
                                <span class="flex items-center gap-3">
                                    <Icon icon={rate.flag} class="h-6 w-6 shrink-0"/>
                                    <span><span class="block font-semibold">{rate.ccy}</span><span class="block text-xs text-onebank-subtle">{t(rate.nameEn, rate.nameLo)}</span></span>
                                </span>
                            </td>
                            <td class="border-l border-onebank-row px-4 py-3 text-right tabular-nums">{rateText(rate.buy)}</td>
                            <td class="px-4 py-3 text-right tabular-nums">{rateText(rate.sell)}</td>
                            <td class="border-l border-onebank-row px-4 py-3 text-right tabular-nums">{rateText(rate.buyTransfer)}</td>
                            <td class="px-4 py-3 text-right tabular-nums">{rateText(rate.sellTransfer)}</td>
                        </tr>
                    {:else}
                        <tr><td colspan="5" class="px-6 py-12 text-center text-onebank-subtle">
                            {search ? t('No currency matches your search', 'ບໍ່ພົບສະກຸນເງິນທີ່ຄົ້ນຫາ') : t('No rates published', 'ບໍ່ມີອັດຕາແລກປ່ຽນ')}
                        </td></tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
    <p class="text-xs text-onebank-subtle">{t('Rates are in kip per unit and may change during the day. A dash means the bank does not trade that currency as cash.', 'ອັດຕາເປັນກີບຕໍ່ໜ່ວຍ ແລະ ອາດປ່ຽນແປງລະຫວ່າງວັນ. ເຄື່ອງໝາຍ – ໝາຍເຖິງທະນາຄານບໍ່ຊື້ຂາຍເງິນສົດສະກຸນນັ້ນ.')}</p>
</div>
