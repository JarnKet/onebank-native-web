<script lang="ts">
    /**
     * The group's loans: one card per loan with how much is repaid, opening a
     * detail with the terms, the repayments made, and the instalment schedule
     * (paid ones marked). Replaces IBANKLOANACCOUNT.
     */
    import Icon from '@iconify/svelte';
    import CcyBadge from '../../lib/components/CcyBadge.svelte';
    import {getLoanSchedule, getLoanTransactions, loadLoans} from '../../lib/api/unmapped';
    import type {Loan, LoanInstalment} from '../../lib/api/types';
    import {formatMoney, maskAccount, money, t} from '../../lib/utils/helper';
    import {currentGroup} from '../../stores/onebankGroups';
    import ProductTransactions from './ProductTransactions.svelte';
    import Tabs from './Tabs.svelte';
    import {dayText, percent} from './format';

    let loans = $state<Loan[]>([]);
    let loading = $state(true);
    let error = $state('');
    let selected = $state<Loan | null>(null);
    let tab = $state<'INFO' | 'TRANSACTIONS' | 'SCHEDULE'>('INFO');
    let schedule = $state<LoanInstalment[]>([]);
    let scheduleLoading = $state(false);
    let scheduleError = $state('');

    function load(group: string) {
        loading = true;
        error = '';
        selected = null;
        loadLoans(group)
            .then((response) => {
                if (response?.result === 0) loans = response.loans ?? [];
                else error = response?.message || t('Could not load the loans', 'ໂຫຼດບັນຊີເງິນກູ້ບໍ່ໄດ້');
            })
            .catch((e) => (error = (e as Error)?.message || t('Could not load the loans', 'ໂຫຼດບັນຊີເງິນກູ້ບໍ່ໄດ້')))
            .finally(() => (loading = false));
    }

    $effect(() => {
        if ($currentGroup) load($currentGroup);
    });

    // The schedule is loaded the first time its tab opens for a loan.
    $effect(() => {
        const loan = selected;
        if (!loan || tab !== 'SCHEDULE') return;
        scheduleLoading = true;
        scheduleError = '';
        getLoanSchedule(loan.id, $currentGroup)
            .then((response) => {
                if (response?.result === 0) schedule = response.schedule ?? [];
                else scheduleError = response?.message || t('Could not load the schedule', 'ໂຫຼດຕາຕະລາງຊຳລະບໍ່ໄດ້');
            })
            .catch((e) => (scheduleError = (e as Error)?.message || t('Could not load the schedule', 'ໂຫຼດຕາຕະລາງຊຳລະບໍ່ໄດ້')))
            .finally(() => (scheduleLoading = false));
    });

    const repaid = (loan: Loan) => (loan.amount > 0 ? Math.round(((loan.amount - loan.outstanding) / loan.amount) * 100) : 0);

    function open(loan: Loan) {
        selected = loan;
        schedule = [];
        tab = 'INFO';
    }
</script>

<div class="space-y-4">
    {#if selected}
        {@const loan = selected}
        <button type="button" class="flex items-center gap-1 text-sm text-onebank-blue hover:underline" onclick={() => (selected = null)}>
            <Icon icon="mdi:chevron-left" class="h-5 w-5"/>{t('All loans', 'ເງິນກູ້ທັງໝົດ')}
        </button>
        <section class="ob-card space-y-5 p-5 tablet:p-6">
            <header class="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 class="text-lg font-semibold text-onebank-blue">{loan.product}</h1>
                    <p class="text-sm text-onebank-subtle tabular-nums">{maskAccount(loan.account)} · {t(loan.typeEn, loan.typeLo)}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-onebank-subtle">{t('Still to repay', 'ຍອດຄົງເຫຼືອ')}</p>
                    <p class="text-2xl font-bold tabular-nums text-onebank-red">{money(loan.outstanding, loan.ccy)}</p>
                </div>
            </header>
            <Tabs label={t('Loan detail', 'ລາຍລະອຽດເງິນກູ້')} bind:value={tab}
                  tabs={[{id: 'INFO', label: t('Terms', 'ເງື່ອນໄຂ')}, {id: 'TRANSACTIONS', label: t('Repayments', 'ການຊຳລະ')}, {id: 'SCHEDULE', label: t('Schedule', 'ຕາຕະລາງຊຳລະ')}]}/>
            <div role="tabpanel">
                {#if tab === 'INFO'}
                    <dl class="grid gap-x-8 gap-y-4 tablet:grid-cols-2 laptop:grid-cols-3">
                        {#each [
                            [t('Borrower', 'ຜູ້ກູ້'), loan.borrower],
                            [t('Loan amount', 'ຈຳນວນເງິນກູ້'), money(loan.amount, loan.ccy)],
                            [t('Monthly instalment', 'ງວດຊຳລະຕໍ່ເດືອນ'), money(loan.monthlyPayment, loan.ccy)],
                            [t('Interest rate', 'ອັດຕາດອກເບ້ຍ'), `${percent(loan.rate)} ${t('a year', 'ຕໍ່ປີ')}`],
                            [t('Term', 'ໄລຍະ'), t(`${loan.term} months`, `${loan.term} ເດືອນ`)],
                            [t('Start date', 'ວັນທີເລີ່ມ'), dayText(loan.start)],
                            [t('End date', 'ວັນທີສິ້ນສຸດ'), dayText(loan.end)],
                            [t('Branch', 'ສາຂາ'), loan.branch],
                        ] as [label, value] (label)}
                            <div class="border-b border-onebank-row pb-3">
                                <dt class="text-sm text-onebank-subtle">{label}</dt>
                                <dd class="font-semibold tabular-nums">{value}</dd>
                            </div>
                        {/each}
                    </dl>
                {:else if tab === 'TRANSACTIONS'}
                    <ProductTransactions ccy={loan.ccy} load={(from, to) => getLoanTransactions(loan.id, from, to, $currentGroup)}/>
                {:else}
                    {#if scheduleError}<div class="mb-3 rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{scheduleError}</div>{/if}
                    <div class="overflow-x-auto rounded-ob-md border border-onebank-row">
                        <table class="w-full min-w-180 text-left text-sm">
                            <thead class="bg-onebank-blue text-white">
                                <tr>
                                    <th class="px-4 py-3 font-medium">#</th>
                                    <th class="px-4 py-3 font-medium">{t('Due', 'ວັນຄົບກຳນົດ')}</th>
                                    <th class="px-4 py-3 text-right font-medium">{t('Opening', 'ຍອດຍົກມາ')}</th>
                                    <th class="px-4 py-3 text-right font-medium">{t('Principal', 'ເງິນຕົ້ນ')}</th>
                                    <th class="px-4 py-3 text-right font-medium">{t('Interest', 'ດອກເບ້ຍ')}</th>
                                    <th class="px-4 py-3 text-right font-medium">{t('Closing', 'ຍອດຍົກໄປ')}</th>
                                    <th class="px-4 py-3 font-medium">{t('Status', 'ສະຖານະ')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#if scheduleLoading && schedule.length === 0}
                                    <tr><td colspan="7" class="p-4"><div class="h-32 animate-pulse rounded bg-onebank-row"></div></td></tr>
                                {:else}
                                    {#each schedule as instalment, index (instalment.date)}
                                        <tr class="border-t border-onebank-row {instalment.paid ? 'text-onebank-subtle' : ''}">
                                            <td class="px-4 py-2.5 tabular-nums">{index + 1}</td>
                                            <td class="px-4 py-2.5">{dayText(instalment.date)}</td>
                                            <td class="px-4 py-2.5 text-right tabular-nums">{formatMoney(instalment.opening)}</td>
                                            <td class="px-4 py-2.5 text-right tabular-nums">{formatMoney(instalment.principal)}</td>
                                            <td class="px-4 py-2.5 text-right tabular-nums">{formatMoney(instalment.interest)}</td>
                                            <td class="px-4 py-2.5 text-right tabular-nums">{formatMoney(instalment.closing)}</td>
                                            <td class="px-4 py-2.5">
                                                <span class="rounded-full px-2.5 py-0.5 text-xs {instalment.paid ? 'bg-onebank-blue-soft text-onebank-blue' : 'bg-onebank-pink text-onebank-red'}">
                                                    {instalment.paid ? t('Paid', 'ຊຳລະແລ້ວ') : t('Due', 'ຍັງບໍ່ຊຳລະ')}
                                                </span>
                                            </td>
                                        </tr>
                                    {:else}
                                        <tr><td colspan="7" class="px-4 py-10 text-center text-onebank-subtle">{t('No schedule for this loan', 'ບໍ່ມີຕາຕະລາງຊຳລະສຳລັບເງິນກູ້ນີ້')}</td></tr>
                                    {/each}
                                {/if}
                            </tbody>
                        </table>
                    </div>
                {/if}
            </div>
        </section>
    {:else}
        <h1 class="text-lg font-semibold text-onebank-blue">{t('Loan accounts', 'ບັນຊີເງິນກູ້')}</h1>
        {#if error}
            <div class="flex items-center justify-between gap-3 rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">
                <span>{error}</span>
                <button type="button" class="font-semibold underline" onclick={() => $currentGroup && load($currentGroup)}>{t('Retry', 'ລອງໃໝ່')}</button>
            </div>
        {/if}

        {#if loading && loans.length === 0}
            <div class="grid gap-4 tablet:grid-cols-2">
                {#each [0, 1] as i (i)}<div class="h-40 animate-pulse rounded-ob-xl bg-white"></div>{/each}
            </div>
        {:else if loans.length === 0}
            <div class="ob-card p-8 text-center text-onebank-subtle">
                {t('This group has no loans.', 'ກຸ່ມນີ້ບໍ່ມີເງິນກູ້.')}
            </div>
        {:else}
            <ul class="grid gap-4 tablet:grid-cols-2">
                {#each loans as loan (loan.id)}
                    {@const done = repaid(loan)}
                    <li>
                        <button type="button" class="ob-card block w-full space-y-3 p-5 text-left transition-shadow hover:shadow-ob-pill" onclick={() => open(loan)}>
                            <span class="flex items-start justify-between gap-3">
                                <span class="min-w-0">
                                    <span class="block truncate font-semibold">{loan.product}</span>
                                    <span class="block text-sm text-onebank-subtle tabular-nums">{maskAccount(loan.account)} · {t(loan.typeEn, loan.typeLo)}</span>
                                </span>
                                <CcyBadge ccy={loan.ccy} variant="pill"/>
                            </span>
                            <span class="flex items-end justify-between gap-3">
                                <span>
                                    <span class="block text-xs text-onebank-subtle">{t('Still to repay', 'ຍອດຄົງເຫຼືອ')}</span>
                                    <span class="block text-xl font-bold tabular-nums text-onebank-red">{money(loan.outstanding, loan.ccy)}</span>
                                </span>
                                <span class="text-right text-xs text-onebank-subtle">{t('of', 'ຈາກ')} <span class="tabular-nums">{money(loan.amount, loan.ccy)}</span></span>
                            </span>
                            <span class="block">
                                <span class="block h-2 overflow-hidden rounded-full bg-onebank-row" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={100}
                                      aria-label={t('Repaid', 'ຊຳລະແລ້ວ')}>
                                    <span class="block h-full rounded-full bg-onebank-blue" style="width: {done}%"></span>
                                </span>
                                <span class="mt-1.5 flex justify-between text-xs text-onebank-subtle">
                                    <span>{t(`${done}% repaid`, `ຊຳລະແລ້ວ ${done}%`)}</span>
                                    <span>{money(loan.monthlyPayment, loan.ccy)} / {t('month', 'ເດືອນ')}</span>
                                </span>
                            </span>
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    {/if}
</div>
