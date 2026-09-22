<script lang="ts">
    /**
     * The group's term deposits: totals per currency, then one card per
     * deposit with how far it is to maturity. A card opens its detail — the
     * terms, and its movements between two days. Replaces
     * IBANKTERMDEPOSITACCOUNT.
     */
    import Icon from '@iconify/svelte';
    import CcyBadge from '../../lib/components/CcyBadge.svelte';
    import {getTermDepositTransactions, loadTermDeposits} from '../../lib/api/unmapped';
    import type {TermDeposit} from '../../lib/api/types';
    import {maskAccount, money, t} from '../../lib/utils/helper';
    import {currentGroup} from '../../stores/onebankGroups';
    import ProductTransactions from './ProductTransactions.svelte';
    import Tabs from './Tabs.svelte';
    import {dayText, percent} from './format';

    let deposits = $state<TermDeposit[]>([]);
    let loading = $state(true);
    let error = $state('');
    let selected = $state<TermDeposit | null>(null);
    let tab = $state<'INFO' | 'TRANSACTIONS'>('INFO');

    function load(group: string) {
        loading = true;
        error = '';
        selected = null;
        loadTermDeposits(group)
            .then((response) => {
                if (response?.result === 0) deposits = response.deposits ?? [];
                else error = response?.message || t('Could not load the term deposits', 'ໂຫຼດບັນຊີເງິນຝາກມີກຳນົດບໍ່ໄດ້');
            })
            .catch((e) => (error = (e as Error)?.message || t('Could not load the term deposits', 'ໂຫຼດບັນຊີເງິນຝາກມີກຳນົດບໍ່ໄດ້')))
            .finally(() => (loading = false));
    }

    $effect(() => {
        if ($currentGroup) load($currentGroup);
    });

    const totals = $derived.by(() => {
        const byCcy = new Map<string, {ccy: string; principal: number; maturity: number}>();
        for (const deposit of deposits) {
            const total = byCcy.get(deposit.ccy) ?? {ccy: deposit.ccy, principal: 0, maturity: 0};
            total.principal += deposit.principal;
            total.maturity += deposit.maturityAmount;
            byCcy.set(deposit.ccy, total);
        }
        return [...byCcy.values()];
    });

    /** 0–100: how much of the term has passed. */
    function elapsed(deposit: TermDeposit): number {
        const start = Date.parse(deposit.start);
        const end = Date.parse(deposit.end);
        if (!(end > start)) return 100;
        return Math.round(Math.min(Math.max((Date.now() - start) / (end - start), 0), 1) * 100);
    }

    function open(deposit: TermDeposit) {
        selected = deposit;
        tab = 'INFO';
    }
</script>

<div class="space-y-4">
    {#if selected}
        {@const deposit = selected}
        <button type="button" class="flex items-center gap-1 text-sm text-onebank-blue hover:underline" onclick={() => (selected = null)}>
            <Icon icon="mdi:chevron-left" class="h-5 w-5"/>{t('All term deposits', 'ເງິນຝາກມີກຳນົດທັງໝົດ')}
        </button>
        <section class="ob-card space-y-5 p-5 tablet:p-6">
            <header class="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 class="text-lg font-semibold text-onebank-blue">{deposit.product}</h1>
                    <p class="text-sm text-onebank-subtle tabular-nums">{maskAccount(deposit.account)} · {deposit.holder}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-onebank-subtle">{t('Principal', 'ເງິນຕົ້ນ')}</p>
                    <p class="text-2xl font-bold tabular-nums">{money(deposit.principal, deposit.ccy)}</p>
                </div>
            </header>
            <Tabs label={t('Deposit detail', 'ລາຍລະອຽດເງິນຝາກ')} bind:value={tab}
                  tabs={[{id: 'INFO', label: t('Terms', 'ເງື່ອນໄຂ')}, {id: 'TRANSACTIONS', label: t('Transactions', 'ທຸລະກຳ')}]}/>
            <div role="tabpanel">
                {#if tab === 'INFO'}
                    <dl class="grid gap-x-8 gap-y-4 tablet:grid-cols-2 laptop:grid-cols-3">
                        {#each [
                            [t('Currency', 'ສະກຸນເງິນ'), deposit.ccy],
                            [t('Term', 'ໄລຍະ'), t(`${deposit.term} months`, `${deposit.term} ເດືອນ`)],
                            [t('Interest rate', 'ອັດຕາດອກເບ້ຍ'), `${percent(deposit.rate)} ${t('a year', 'ຕໍ່ປີ')}`],
                            [t('Start date', 'ວັນທີເລີ່ມ'), dayText(deposit.start)],
                            [t('Maturity date', 'ວັນທີຄົບກຳນົດ'), dayText(deposit.end)],
                            [t('Interest at maturity', 'ດອກເບ້ຍເມື່ອຄົບກຳນົດ'), money(deposit.interest, deposit.ccy)],
                            [t('Paid out at maturity', 'ຍອດເງິນເມື່ອຄົບກຳນົດ'), money(deposit.maturityAmount, deposit.ccy)],
                        ] as [label, value] (label)}
                            <div class="border-b border-onebank-row pb-3">
                                <dt class="text-sm text-onebank-subtle">{label}</dt>
                                <dd class="font-semibold tabular-nums">{value}</dd>
                            </div>
                        {/each}
                    </dl>
                {:else}
                    <ProductTransactions ccy={deposit.ccy} load={(from, to) => getTermDepositTransactions(deposit.id, from, to, $currentGroup)}/>
                {/if}
            </div>
        </section>
    {:else}
        <h1 class="text-lg font-semibold text-onebank-blue">{t('Term deposit accounts', 'ບັນຊີເງິນຝາກມີກຳນົດ')}</h1>
        {#if error}
            <div class="flex items-center justify-between gap-3 rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">
                <span>{error}</span>
                <button type="button" class="font-semibold underline" onclick={() => $currentGroup && load($currentGroup)}>{t('Retry', 'ລອງໃໝ່')}</button>
            </div>
        {/if}

        {#if loading && deposits.length === 0}
            <div class="grid gap-4 tablet:grid-cols-2">
                {#each [0, 1] as i (i)}<div class="h-40 animate-pulse rounded-ob-xl bg-white"></div>{/each}
            </div>
        {:else if deposits.length === 0}
            <div class="ob-card p-8 text-center text-onebank-subtle">
                {t('This group has no term deposits. Visit a BCEL branch to open one.', 'ກຸ່ມນີ້ບໍ່ມີເງິນຝາກມີກຳນົດ. ເປີດບັນຊີໄດ້ທີ່ສາຂາ ທຄຕລ.')}
            </div>
        {:else}
            <ul class="flex flex-wrap gap-3" aria-label={t('Totals by currency', 'ຍອດລວມຕາມສະກຸນເງິນ')}>
                {#each totals as total (total.ccy)}
                    <li class="flex items-center gap-3 rounded-ob-md bg-onebank-blue-soft px-4 py-2 text-onebank-blue">
                        <CcyBadge ccy={total.ccy}/>
                        <span class="text-sm">{t('Principal', 'ເງິນຕົ້ນ')} <b class="tabular-nums">{money(total.principal, total.ccy)}</b></span>
                        <span class="text-sm">· {t('at maturity', 'ເມື່ອຄົບກຳນົດ')} <b class="tabular-nums">{money(total.maturity, total.ccy)}</b></span>
                    </li>
                {/each}
            </ul>
            <ul class="grid gap-4 tablet:grid-cols-2">
                {#each deposits as deposit (deposit.id)}
                    {@const done = elapsed(deposit)}
                    <li>
                        <button type="button" class="ob-card block w-full space-y-3 p-5 text-left transition-shadow hover:shadow-ob-pill" onclick={() => open(deposit)}>
                            <span class="flex items-start justify-between gap-3">
                                <span class="min-w-0">
                                    <span class="block truncate font-semibold">{deposit.product}</span>
                                    <span class="block text-sm text-onebank-subtle tabular-nums">{maskAccount(deposit.account)}</span>
                                </span>
                                <CcyBadge ccy={deposit.ccy} variant="pill"/>
                            </span>
                            <span class="block text-xl font-bold tabular-nums">{money(deposit.principal, deposit.ccy)}</span>
                            <span class="block">
                                <span class="block h-2 overflow-hidden rounded-full bg-onebank-row" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={100}
                                      aria-label={t('Time to maturity', 'ໄລຍະເຖິງຄົບກຳນົດ')}>
                                    <span class="block h-full rounded-full bg-onebank-blue" style="width: {done}%"></span>
                                </span>
                                <span class="mt-1.5 flex justify-between text-xs text-onebank-subtle">
                                    <span>{percent(deposit.rate)} · {t(`${deposit.term} months`, `${deposit.term} ເດືອນ`)}</span>
                                    <span>{t('Matures', 'ຄົບກຳນົດ')} {dayText(deposit.end)}</span>
                                </span>
                            </span>
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    {/if}
</div>
