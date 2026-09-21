<script lang="ts">
    /**
     * An account's statement, as the design's frame: the balance you can use,
     * then account + date range + filter + export, the active filters as
     * removable chips, and a table grouped by day with each day's money in
     * and out on the right.
     */
    import Icon from '@iconify/svelte';
    import AccountPicker from '../lib/components/AccountPicker.svelte';
    import Modal from '../lib/components/Modal.svelte';
    import {getStatement} from '../lib/api/commands';
    import type {TransactionInfo} from '../lib/api/types';
    import {formatMoney, isoDay, money, splitTime, t} from '../lib/utils/helper';
    import {ALL_CATEGORIES, CATEGORY_GROUPS, counterpart} from '../lib/transactions';
    import {currentGroup, loadHomeResult} from '../stores/onebankGroups';

    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);

    let accountId = $state('');
    let from = $state(isoDay(monthAgo));
    let to = $state(isoDay(today));
    let items = $state<TransactionInfo[]>([]);
    let balance = $state(0);
    let ccy = $state('LAK');
    let loading = $state(false);
    let filters = $state<string[]>([]);
    let draft = $state<string[]>([]);
    let filterOpen = $state(false);
    let filterSearch = $state('');

    const accounts = $derived($loadHomeResult?.accounts ?? []);

    $effect(() => {
        if (!accounts.some((account) => account.accountid === accountId)) accountId = accounts[0]?.accountid ?? '';
    });

    $effect(() => {
        const group = $currentGroup;
        const id = accountId;
        const range = [from, to];
        if (!group || !id) return;
        loading = true;
        getStatement(id, range[0], range[1], group)
            .then((response) => {
                items = response.items ?? [];
                balance = response.balance ?? 0;
                ccy = response.ccy ?? 'LAK';
            })
            .finally(() => (loading = false));
    });

    const filtered = $derived(
        filters.length === 0
            ? items
            : items.filter((tx) => ALL_CATEGORIES.filter((category) => filters.includes(category.id)).some((category) => category.matches(tx))),
    );

    const days = $derived.by(() => {
        const groups = new Map<string, TransactionInfo[]>();
        for (const tx of filtered) {
            const key = String(tx.txtime).slice(0, 10);
            groups.set(key, [...(groups.get(key) ?? []), tx]);
        }
        return [...groups].map(([day, list]) => ({
            day,
            list,
            income: list.filter((tx) => Number(tx.amount) > 0).reduce((sum, tx) => sum + Number(tx.amount), 0),
            spending: list.filter((tx) => Number(tx.amount) < 0).reduce((sum, tx) => sum - Number(tx.amount), 0),
        }));
    });

    function openFilters() {
        draft = [...filters];
        filterSearch = '';
        filterOpen = true;
    }

    function exportCsv() {
        const rows = [['Date', 'Reference', 'Amount', 'Currency', 'Description', 'Counterparty']];
        for (const tx of filtered) {
            rows.push([String(tx.txtime), String(tx.ticket ?? ''), String(tx.amount), String(tx.ccy), String(tx.detail?.DESCRIPTION ?? ''), counterpart(tx)]);
        }
        const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob(['﻿' + csv], {type: 'text/csv;charset=utf-8'}));
        const link = Object.assign(document.createElement('a'), {href: url, download: `statement-${from}-${to}.csv`});
        link.click();
        URL.revokeObjectURL(url);
    }

    const categoryName = (id: string) => {
        const category = ALL_CATEGORIES.find((candidate) => candidate.id === id);
        return category ? t(category.en, category.lo) : id;
    };
</script>

<div class="space-y-4">
    <div>
        <p class="text-sm">{t('Available balance', 'ຍອດເງິນທີ່ສາມາດນຳໃຊ້ໄດ້')}</p>
        <p class="text-4xl font-bold text-onebank-income tabular-nums">{formatMoney(balance, 0)} {ccy}</p>
    </div>

    <div class="flex flex-wrap items-center gap-3">
        <div class="w-full tablet:w-72"><AccountPicker {accounts} bind:value={accountId} showName label={t('Statement account', 'ບັນຊີ')}/></div>
        <label class="flex h-11 flex-1 items-center gap-2 rounded-ob-sm border border-[#d9d9d9] bg-white px-3 text-sm">
            <span class="shrink-0 text-onebank-subtle">{t('From', 'ຈາກວັນທີ')}</span>
            <input type="date" bind:value={from} max={to} class="min-w-0 flex-1 border-0 p-0 text-sm focus:ring-0"/>
        </label>
        <label class="flex h-11 flex-1 items-center gap-2 rounded-ob-sm border border-[#d9d9d9] bg-white px-3 text-sm">
            <span class="shrink-0 text-onebank-subtle">{t('To', 'ເຖິງວັນທີ')}</span>
            <input type="date" bind:value={to} min={from} max={isoDay(today)} class="min-w-0 flex-1 border-0 p-0 text-sm focus:ring-0"/>
        </label>
        <button type="button" class="flex h-11 items-center gap-2 rounded-ob-sm bg-onebank-blue px-4 text-sm text-white" onclick={openFilters}>
            <Icon icon="mdi:filter-variant" class="h-5 w-5"/>{t('Filter', 'ຕົວກັ່ນຕອງ')}
        </button>
        <button type="button" class="flex h-11 items-center gap-2 rounded-ob-sm bg-onebank-blue px-4 text-sm text-white disabled:opacity-50"
                disabled={filtered.length === 0} onclick={exportCsv}>
            <Icon icon="mdi:file-export-outline" class="h-5 w-5"/>Export
        </button>
    </div>

    {#if filters.length}
        <div class="flex flex-wrap gap-2">
            {#each filters as id (id)}
                <span class="flex items-center gap-2 rounded-ob-sm bg-onebank-light-grey-2 px-3 py-1 text-sm">
                    {categoryName(id)}
                    <button type="button" aria-label={t(`Remove ${categoryName(id)}`, `ລຶບ ${categoryName(id)}`)} onclick={() => (filters = filters.filter((other) => other !== id))}>
                        <Icon icon="mdi:close" class="h-4 w-4"/>
                    </button>
                </span>
            {/each}
        </div>
    {/if}

    <div class="overflow-x-auto rounded-ob-md bg-white shadow-ob-card">
        <table class="w-full min-w-[800px] text-left text-sm">
            <thead class="bg-onebank-blue text-white">
                <tr>
                    <th class="px-6 py-4 font-semibold">{t('Date', 'ວັນທີ')}</th>
                    <th class="px-4 py-4 font-semibold">{t('Reference', 'ເລກອ້າງອີງ')}</th>
                    <th class="px-4 py-4 font-semibold">{t('Amount', 'ຈຳນວນເງິນ')}</th>
                    <th class="px-4 py-4 font-semibold">{t('Description', 'ຄຳອະທິບາຍ')}</th>
                    <th class="px-6 py-4 font-semibold">{t('Details', 'ລາຍລະອຽດ')}</th>
                </tr>
            </thead>
            {#if loading && items.length === 0}
                <tbody><tr><td colspan="5" class="p-6"><div class="h-40 animate-pulse rounded bg-onebank-row"></div></td></tr></tbody>
            {:else if days.length === 0}
                <tbody><tr><td colspan="5" class="px-6 py-12 text-center text-onebank-subtle">{t('No movements in this period', 'ບໍ່ມີການເຄື່ອນໄຫວໃນໄລຍະນີ້')}</td></tr></tbody>
            {/if}
            {#each days as day (day.day)}
                <tbody class="border-b-8 border-onebank-page last:border-0">
                    <tr>
                        <th class="px-6 pb-1 pt-4 text-base font-bold" colspan="3">{splitTime(day.day + ' 00:00').date}</th>
                        <td class="px-6 pb-1 pt-4 text-right text-xs" colspan="2">
                            <span class="inline-block text-center"><span class="block">{t('Income', 'ລາຍຮັບ')}</span><span class="font-semibold text-onebank-income">{money(day.income, ccy)}</span></span>
                            <span class="ml-6 inline-block text-center"><span class="block">{t('Spending', 'ລາຍຈ່າຍ')}</span><span class="font-semibold text-onebank-red">{money(day.spending, ccy)}</span></span>
                        </td>
                    </tr>
                    {#each day.list as tx (tx.transactionid)}
                        {@const when = splitTime(tx.txtime)}
                        {@const amount = Number(tx.amount)}
                        <tr class="border-t border-onebank-row align-top">
                            <td class="px-6 py-3 leading-tight">{when.date}<br/>{when.time}</td>
                            <td class="px-4 py-3 tabular-nums">{tx.ticket}</td>
                            <td class="whitespace-nowrap px-4 py-3 font-semibold tabular-nums {amount < 0 ? 'text-onebank-red' : 'text-onebank-income'}">
                                {amount < 0 ? '−' : '+'} {formatMoney(Math.abs(amount))}
                            </td>
                            <td class="max-w-64 px-4 py-3">{tx.detail?.DESCRIPTION}</td>
                            <td class="px-6 py-3">{amount < 0 ? t('To', 'ຫາ') : t('From', 'ຈາກ')}: {counterpart(tx)}</td>
                        </tr>
                    {/each}
                </tbody>
            {/each}
        </table>
    </div>
</div>

{#if filterOpen}
    <Modal title={t('Filter', 'ຕົວກັ່ນຕອງ')} size="lg" onClose={() => (filterOpen = false)}>
        <label class="relative mb-5 block">
            <span class="sr-only">{t('Search filters', 'ຄົ້ນຫາຕົວກັ່ນຕອງ')}</span>
            <Icon icon="mdi:magnify" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2"/>
            <input type="search" bind:value={filterSearch} placeholder={t('Search filters', 'ຄົ້ນຫາຕົວກັ່ນຕອງ')}
                   class="h-10 w-full rounded-ob-xl border border-onebank-ink pl-11 text-center text-sm focus:border-onebank-red focus:ring-onebank-red"/>
        </label>
        {#each CATEGORY_GROUPS as group (group.en)}
            {@const visible = group.categories.filter((category) => `${category.en} ${category.lo}`.toLowerCase().includes(filterSearch.trim().toLowerCase()))}
            {#if visible.length}
                <h3 class="mb-2 mt-4 text-sm">{t(group.en, group.lo)}</h3>
                <div class="flex flex-wrap gap-2">
                    {#each visible as category (category.id)}
                        {@const on = draft.includes(category.id)}
                        <button type="button" aria-pressed={on}
                                class="h-8 rounded-ob-sm px-4 text-sm transition-colors {on ? 'bg-onebank-pink text-onebank-red' : 'bg-onebank-light-grey-4'}"
                                onclick={() => (draft = on ? draft.filter((id) => id !== category.id) : [...draft, category.id])}>
                            {t(category.en, category.lo)}
                        </button>
                    {/each}
                </div>
            {/if}
        {/each}
        {#snippet footer()}
            <button type="button" class="onebank-secondary-btn h-10 tablet:w-36" onclick={() => (draft = [])}>{t('Clear', 'ລ້າງ')}</button>
            <button type="button" class="onebank-primary-btn h-10 tablet:w-44" onclick={() => { filters = [...draft]; filterOpen = false; }}>{t('Apply', 'ຕົກລົງ')}</button>
        {/snippet}
    </Modal>
{/if}
