<script lang="ts">
    /**
     * Every account in the group at a glance: totals per currency on top, then
     * the accounts grouped by kind with their balances. All of it is the
     * group's real `loadhome` — no command of its own. A row opens that
     * account's statement. Replaces IBANKACCOUNTDETAIL, whose credit/debit
     * columns the core does not provide; the statement has the movements.
     */
    import CcyBadge from '../../lib/components/CcyBadge.svelte';
    import type {Account} from '../../definition';
    import {formatMoney, maskAccount, money, t} from '../../lib/utils/helper';
    import {navigateToPath} from '../../lib/utils/navigation';
    import {currentGroup, loadHomeResult} from '../../stores/onebankGroups';
    import {homeError, homeLoading, loadGroupHome} from '../../stores/home';

    const KINDS: Array<{type: Account['type'][]; en: string; lo: string}> = [
        {type: ['SAVING', 'CURRENT', 'STANDARD'], en: 'Bank accounts', lo: 'ບັນຊີທະນາຄານ'},
        {type: ['VIRTUAL'], en: 'Main accounts', lo: 'ບັນຊີຫຼັກ'},
        {type: ['SHADOW'], en: 'Shadow accounts', lo: 'ບັນຊີເງົາ'},
    ];

    const TYPE_LABEL: Record<string, [string, string]> = {
        SAVING: ['Savings', 'ເງິນຝາກປະຢັດ'],
        CURRENT: ['Current', 'ກະແສລາຍວັນ'],
        STANDARD: ['Standard', 'ມາດຕະຖານ'],
        VIRTUAL: ['Main', 'ບັນຊີຫຼັກ'],
        SHADOW: ['Shadow', 'ບັນຊີເງົາ'],
    };

    const accounts = $derived($loadHomeResult?.accounts ?? []);

    const groups = $derived(
        KINDS.map((kind) => ({...kind, accounts: accounts.filter((account) => kind.type.includes(account.type))})).filter((kind) => kind.accounts.length > 0),
    );

    /** One tile per currency: how many accounts, what is available, what is booked. */
    const totals = $derived.by(() => {
        const byCcy = new Map<string, {ccy: string; count: number; available: number; current: number}>();
        for (const account of accounts) {
            const total = byCcy.get(account.ccy) ?? {ccy: account.ccy, count: 0, available: 0, current: 0};
            total.count += 1;
            total.available += Number(account.availablebalance ?? 0);
            total.current += Number(account.currentbalance ?? account.availablebalance ?? 0);
            byCcy.set(account.ccy, total);
        }
        return [...byCcy.values()];
    });

    const statusWord = (status?: string) =>
        status && status !== 'ACTIVE' ? t('Locked', 'ລັອກ') : t('Active', 'ໃຊ້ງານ');
</script>

<div class="space-y-4">
    <h1 class="text-lg font-semibold text-onebank-blue">{t('Account detail', 'ລາຍລະອຽດບັນຊີ')}</h1>

    {#if $homeError && accounts.length === 0}
        <div class="flex items-center justify-between gap-3 rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">
            <span>{$homeError}</span>
            <button type="button" class="font-semibold underline" onclick={() => loadGroupHome($currentGroup, true)}>{t('Retry', 'ລອງໃໝ່')}</button>
        </div>
    {/if}

    {#if accounts.length === 0 && ($homeLoading || !$loadHomeResult)}
        <div class="grid gap-4 tablet:grid-cols-3">
            {#each [0, 1, 2] as i (i)}<div class="h-28 animate-pulse rounded-ob-xl bg-white"></div>{/each}
        </div>
        <div class="h-64 animate-pulse rounded-ob-xl bg-white"></div>
    {:else if accounts.length === 0}
        <div class="ob-card p-8 text-center text-onebank-subtle">
            {t('This group has no accounts yet. Add one from Accounts.', 'ກຸ່ມນີ້ຍັງບໍ່ມີບັນຊີ. ເພີ່ມບັນຊີໄດ້ທີ່ໜ້າບັນຊີ.')}
        </div>
    {:else}
        <ul class="grid gap-4 tablet:grid-cols-2 laptop:grid-cols-3" aria-label={t('Totals by currency', 'ຍອດລວມຕາມສະກຸນເງິນ')}>
            {#each totals as total (total.ccy)}
                <li class="ob-card flex items-start gap-4 p-5">
                    <CcyBadge ccy={total.ccy}/>
                    <div class="min-w-0">
                        <p class="text-sm text-onebank-subtle">
                            {total.count} {total.count === 1 ? t('account', 'ບັນຊີ') : t('accounts', 'ບັນຊີ')} · {total.ccy}
                        </p>
                        <p class="text-xl font-bold tabular-nums">{money(total.available, total.ccy)}</p>
                        <p class="text-xs text-onebank-subtle">{t('Booked', 'ຍອດບັນຊີ')}: <span class="tabular-nums">{formatMoney(total.current)}</span></p>
                    </div>
                </li>
            {/each}
        </ul>

        {#each groups as group (group.en)}
            <section class="overflow-x-auto rounded-ob-md bg-white shadow-ob-card">
                <h2 class="px-6 pt-5 pb-3 font-semibold text-onebank-blue">{t(group.en, group.lo)}</h2>
                <table class="w-full min-w-180 text-left text-sm">
                    <thead class="bg-onebank-blue text-white">
                        <tr>
                            <th class="px-6 py-3 font-medium">{t('Account', 'ບັນຊີ')}</th>
                            <th class="px-4 py-3 font-medium">{t('Type', 'ປະເພດ')}</th>
                            <th class="px-4 py-3 font-medium">{t('Currency', 'ສະກຸນເງິນ')}</th>
                            <th class="px-4 py-3 font-medium">{t('Status', 'ສະຖານະ')}</th>
                            <th class="px-4 py-3 text-right font-medium">{t('Available', 'ຍອດທີ່ໃຊ້ໄດ້')}</th>
                            <th class="px-6 py-3 text-right font-medium">{t('Booked', 'ຍອດບັນຊີ')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each group.accounts as account (account.accountid)}
                            {@const label = TYPE_LABEL[account.type]}
                            <tr class="cursor-pointer border-t border-onebank-row transition-colors hover:bg-onebank-page"
                                onclick={() => navigateToPath(`/statement?account=${encodeURIComponent(account.accountid)}`)}>
                                <td class="px-6 py-3">
                                    <a href="#/statement?account={encodeURIComponent(account.accountid)}" class="block font-semibold hover:underline">{account.alias || account.name}</a>
                                    <span class="block text-xs text-onebank-subtle tabular-nums">{maskAccount(account.account)}</span>
                                </td>
                                <td class="px-4 py-3">{label ? t(label[0], label[1]) : account.type}</td>
                                <td class="px-4 py-3"><CcyBadge ccy={account.ccy} variant="pill"/></td>
                                <td class="px-4 py-3">
                                    <span class="rounded-full px-2.5 py-0.5 text-xs {account.status && account.status !== 'ACTIVE' ? 'bg-onebank-pink text-onebank-red' : 'bg-onebank-blue-soft text-onebank-blue'}">{statusWord(account.status)}</span>
                                </td>
                                <td class="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(Number(account.availablebalance ?? 0))}</td>
                                <td class="px-6 py-3 text-right tabular-nums">{formatMoney(Number(account.currentbalance ?? account.availablebalance ?? 0))}</td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </section>
        {/each}
    {/if}
</div>
