<script lang="ts">
    /**
     * Transfer slips: the group's transfers, filtered by source account and
     * date range, each opening its printable receipt. Built on the real
     * `viewtransactions`, so a slip is exactly what Messages shows. Replaces
     * IBANKSLIP, whose rows only ever said "Opening slip...".
     */
    import ListToolbar from '../../lib/components/ListToolbar.svelte';
    import {viewTransactions} from '../../lib/api/commands';
    import type {TransactionInfo} from '../../lib/api/types';
    import {isoDay, maskAccount, money, splitTime, t} from '../../lib/utils/helper';
    import {navigateToPath} from '../../lib/utils/navigation';
    import {counterpart, serviceLabel, statusLabel, statusTone} from '../../lib/transactions';
    import {currentGroup, loadHomeResult} from '../../stores/onebankGroups';
    import {isSlip} from './slips';

    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);

    let items = $state<TransactionInfo[]>([]);
    let loading = $state(true);
    let error = $state('');
    let search = $state('');
    let account = $state('');
    let from = $state(isoDay(monthAgo));
    let to = $state(isoDay(today));

    const accounts = $derived($loadHomeResult?.accounts ?? []);

    function load(group: string) {
        loading = true;
        error = '';
        viewTransactions(group)
            .then((response) => {
                if (response?.result === 0) items = response.items ?? [];
                else error = response?.message || t('Could not load the slips', 'ໂຫຼດໃບຢັ້ງຢືນບໍ່ໄດ້');
            })
            .catch((e) => (error = (e as Error)?.message || t('Could not load the slips', 'ໂຫຼດໃບຢັ້ງຢືນບໍ່ໄດ້')))
            .finally(() => (loading = false));
    }

    $effect(() => {
        if ($currentGroup) load($currentGroup);
    });

    const slips = $derived(
        items
            .filter(isSlip)
            .filter((tx) => {
                const day = String(tx.txtime ?? '').slice(0, 10);
                if ((from && day < from) || (to && day > to)) return false;
                if (account && tx.account !== accounts.find((candidate) => candidate.accountid === account)?.account) return false;
                const query = search.trim().toLowerCase();
                return !query || `${counterpart(tx)} ${tx.ticket ?? ''} ${tx.makername ?? ''}`.toLowerCase().includes(query);
            })
            .sort((a, b) => String(b.txtime ?? '').localeCompare(String(a.txtime ?? ''))),
    );
</script>

<div class="space-y-4">
    <h1 class="text-lg font-semibold text-onebank-blue">{t('Slip report', 'ລາຍງານໃບຢັ້ງຢືນການໂອນ')}</h1>

    <ListToolbar bind:search showDate={false}>
        <label class="flex h-10 items-center gap-2 rounded-full border border-onebank-light-grey-4 bg-white px-4 text-sm">
            <span class="sr-only">{t('Source account', 'ບັນຊີຕົ້ນທາງ')}</span>
            <select bind:value={account} class="border-0 bg-transparent p-0 pr-6 text-sm focus:ring-0">
                <option value="">{t('All accounts', 'ທຸກບັນຊີ')}</option>
                {#each accounts as item (item.accountid)}<option value={item.accountid}>{item.alias || item.name} · {maskAccount(item.account)}</option>{/each}
            </select>
        </label>
        <label class="flex h-10 items-center gap-2 rounded-full border border-onebank-light-grey-4 bg-white px-4 text-sm">
            <span class="text-onebank-subtle">{t('From', 'ຈາກ')}</span>
            <input type="date" bind:value={from} max={to} class="border-0 p-0 text-sm focus:ring-0"/>
        </label>
        <label class="flex h-10 items-center gap-2 rounded-full border border-onebank-light-grey-4 bg-white px-4 text-sm">
            <span class="text-onebank-subtle">{t('To', 'ຫາ')}</span>
            <input type="date" bind:value={to} min={from} class="border-0 p-0 text-sm focus:ring-0"/>
        </label>
    </ListToolbar>

    {#if error}
        <div class="flex items-center justify-between gap-3 rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">
            <span>{error}</span>
            <button type="button" class="font-semibold underline" onclick={() => $currentGroup && load($currentGroup)}>{t('Retry', 'ລອງໃໝ່')}</button>
        </div>
    {/if}

    <div class="overflow-x-auto rounded-ob-md bg-white shadow-ob-card">
        <table class="w-full min-w-190 text-left text-sm">
            <thead class="bg-onebank-blue text-white">
                <tr>
                    <th class="px-6 py-3 font-medium">{t('Date', 'ວັນທີ')}</th>
                    <th class="px-4 py-3 font-medium">{t('Reference', 'ເລກອ້າງອີງ')}</th>
                    <th class="px-4 py-3 font-medium">{t('Type', 'ປະເພດ')}</th>
                    <th class="px-4 py-3 font-medium">{t('To', 'ຜູ້ຮັບ')}</th>
                    <th class="px-4 py-3 font-medium">{t('Status', 'ສະຖານະ')}</th>
                    <th class="px-6 py-3 text-right font-medium">{t('Amount', 'ຈຳນວນ')}</th>
                </tr>
            </thead>
            <tbody>
                {#if loading && items.length === 0}
                    {#each [0, 1, 2] as i (i)}<tr><td colspan="6" class="px-6 py-2"><div class="h-8 animate-pulse rounded bg-onebank-row"></div></td></tr>{/each}
                {:else}
                    {#each slips as tx, index (tx.transactionid ?? index)}
                        {@const when = splitTime(tx.txtime)}
                        <tr class="cursor-pointer border-t border-onebank-row transition-colors hover:bg-onebank-page"
                            onclick={() => navigateToPath(`/messages/${tx.transactionid}`)}>
                            <td class="px-6 py-3 leading-tight">{when.date}<br/><span class="text-xs text-onebank-subtle">{when.time}</span></td>
                            <td class="px-4 py-3">
                                <a href="#/messages/{tx.transactionid}" class="font-semibold text-onebank-blue hover:underline">{tx.ticket || tx.transactionid}</a>
                            </td>
                            <td class="px-4 py-3">{serviceLabel(tx.service)}</td>
                            <td class="max-w-64 px-4 py-3">
                                <span class="block truncate font-semibold">{tx.detail?.TOACCOUNTNAME ?? ''}</span>
                                <span class="block truncate text-xs text-onebank-subtle">{tx.detail?.TOACCOUNTNO ?? tx.detail?.TOACCOUNT ?? ''}</span>
                            </td>
                            <td class="px-4 py-3"><span class="rounded-full px-2.5 py-0.5 text-xs {statusTone(tx.status)}">{statusLabel(tx.status)}</span></td>
                            <td class="px-6 py-3 text-right font-semibold tabular-nums">{money(Math.abs(Number(tx.amount ?? 0)), tx.ccy)}</td>
                        </tr>
                    {:else}
                        <tr><td colspan="6" class="px-6 py-12 text-center text-onebank-subtle">
                            {t('No transfers in this period. Change the dates or the account to see more.', 'ບໍ່ມີການໂອນໃນຊ່ວງນີ້. ປ່ຽນວັນທີ ຫຼື ບັນຊີເພື່ອເບິ່ງເພີ່ມ.')}
                        </td></tr>
                    {/each}
                {/if}
            </tbody>
        </table>
    </div>
    <p class="text-xs text-onebank-subtle">{t('Open a slip to print it or share it with the person you paid.', 'ເປີດໃບຢັ້ງຢືນເພື່ອພິມ ຫຼື ແບ່ງປັນໃຫ້ຜູ້ຮັບເງິນ.')}</p>
</div>
