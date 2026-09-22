<script lang="ts">
    /**
     * The group's messages: its transactions, newest first — what happened, to
     * which account, when, its status, the amount and who it went to. The data
     * is `viewtransactions`, what the old TRANSACTION page showed. A row opens
     * the transaction's detail.
     */
    import ListToolbar from '../lib/components/ListToolbar.svelte';
    import {viewTransactions} from '../lib/api/commands';
    import type {TransactionInfo} from '../lib/api/types';
    import {maskAccount, money, splitTime, t} from '../lib/utils/helper';
    import {navigateToPath} from '../lib/utils/navigation';
    import {counterpart, serviceLabel, statusLabel, statusTone} from '../lib/transactions';
    import {currentGroup} from '../stores/onebankGroups';

    let items = $state<TransactionInfo[]>([]);
    let loading = $state(false);
    let error = $state('');
    let search = $state('');
    let date = $state('');

    $effect(() => {
        const group = $currentGroup;
        if (!group) return;
        loading = true;
        error = '';
        viewTransactions(group)
            .then((response) => {
                if (response?.result === 0) items = response.items ?? [];
                else error = response?.message || t('Could not load the messages', 'ໂຫຼດຂໍ້ຄວາມບໍ່ໄດ້');
            })
            .catch((e) => (error = (e as Error)?.message || t('Could not load the messages', 'ໂຫຼດຂໍ້ຄວາມບໍ່ໄດ້')))
            .finally(() => (loading = false));
    });

    const shown = $derived(
        [...items]
            .sort((a, b) => String(b.txtime ?? '').localeCompare(String(a.txtime ?? '')))
            .filter((item) => {
                if (date && !String(item.txtime ?? '').startsWith(date)) return false;
                const query = search.trim().toLowerCase();
                return !query || `${counterpart(item)} ${item.account ?? ''} ${item.accountname ?? ''} ${item.makername ?? ''}`.toLowerCase().includes(query);
            }),
    );
</script>

<div class="space-y-4">
    <h1 class="sr-only">{t('Messages', 'ຂໍ້ຄວາມ')}</h1>
    <ListToolbar bind:search bind:date/>
    {#if error}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}

    <div class="overflow-x-auto rounded-ob-md bg-white shadow-ob-card">
        <table class="w-full min-w-[760px] text-left text-xs">
            <thead class="bg-onebank-page text-[10px] uppercase tracking-wide text-onebank-subtle">
                <tr>
                    <th class="px-6 py-3 font-medium">{t('Service', 'ບໍລິການ')}</th>
                    <th class="px-4 py-3 font-medium">{t('Account', 'ເລກບັນຊີ')}</th>
                    <th class="px-4 py-3 font-medium">{t('Date', 'ວັນທີ')}</th>
                    <th class="px-4 py-3 font-medium">{t('Status', 'ສະຖານະ')}</th>
                    <th class="px-4 py-3 text-right font-medium">{t('Amount', 'ຈຳນວນ')}</th>
                    <th class="px-6 py-3 font-medium">{t('Details', 'ລາຍລະອຽດ')}</th>
                </tr>
            </thead>
            <tbody>
                {#if loading && items.length === 0}
                    {#each [0, 1, 2] as i (i)}<tr><td colspan="6" class="px-6 py-2"><div class="h-8 animate-pulse rounded bg-onebank-row"></div></td></tr>{/each}
                {/if}
                {#each shown as item, index (item.transactionid ?? index)}
                    {@const when = splitTime(item.txtime)}
                    {@const amount = Number(item.amount ?? item.detail?.AMOUNT ?? 0)}
                    <tr class="cursor-pointer border-t border-onebank-row transition-colors hover:bg-onebank-page"
                        onclick={() => navigateToPath(`/messages/${item.transactionid}`)}>
                        <td class="px-6 py-3">
                            <a href="#/messages/{item.transactionid}" class="font-semibold hover:underline">{serviceLabel(item.service)}</a>
                        </td>
                        <td class="px-4 py-3">{maskAccount(item.account)}</td>
                        <td class="px-4 py-3 leading-tight">{when.date}<br/><span class="text-onebank-subtle">{when.time}</span></td>
                        <td class="px-4 py-3"><span class="rounded-full px-2.5 py-0.5 text-[11px] {statusTone(item.status)}">{statusLabel(item.status)}</span></td>
                        <td class="px-4 py-3 text-right font-semibold tabular-nums {amount < 0 ? 'text-onebank-red' : 'text-onebank-income'}">{money(amount, item.ccy ?? item.detail?.CCY)}</td>
                        <td class="max-w-72 px-6 py-3">
                            <span class="block truncate font-semibold">{item.detail?.TOACCOUNTNAME ?? item.accountname ?? ''}</span>
                            <span class="block truncate text-[11px] text-onebank-subtle">{t('To account', 'ໄປບັນຊີ')}: {item.detail?.TOACCOUNTNO ?? item.detail?.TOACCOUNT ?? ''}</span>
                        </td>
                    </tr>
                {:else}
                    {#if !loading}<tr><td colspan="6" class="px-6 py-12 text-center text-sm text-onebank-subtle">{t('No messages', 'ບໍ່ມີຂໍ້ຄວາມ')}</td></tr>{/if}
                {/each}
            </tbody>
        </table>
    </div>
</div>
