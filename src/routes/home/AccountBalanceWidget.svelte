<script lang="ts">
    /**
     * Current and available balance per account.
     *
     * Harvested from onebank-ui `pages/HOME/components/AccountBalanceWidget.svelte`,
     * rewritten as runes and pointed at `loadWidget` instead of a raw
     * `sendMessage`. Balances are ordered by currency and then by size, which is
     * the mobile ordering.
     */
    import WidgetHeader from './WidgetHeader.svelte';
    import CollapsedWidget from './CollapsedWidget.svelte';
    import FetchingError from './FetchingError.svelte';
    import {loadWidget} from '../../lib/api/commands';
    import type {Balance} from '../../lib/api/types';
    import {t} from '../../lib/utils/helper';
    import {currentGroup} from '../../stores/onebankGroups';

    /** Display order; anything unrecognised sorts last. */
    const CCY_ORDER: Record<string, number> = {LAK: 1, THB: 2, USD: 3, CNY: 4};

    let balances = $state<Balance[]>([]);
    let loading = $state(true);
    let failed = $state(false);
    let expanded = $state(true);

    function sortBalances(list: Balance[]): Balance[] {
        return [...list].sort((a, b) => {
            const byCcy = (CCY_ORDER[a.ccy] ?? 999) - (CCY_ORDER[b.ccy] ?? 999);
            return byCcy !== 0 ? byCcy : b.availablebalance - a.availablebalance;
        });
    }

    async function load(group: string) {
        if (!group) return;
        loading = true;
        try {
            const response = await loadWidget('ACCOUNTBALANCES', undefined, group);
            // The core signals "no data" by omitting the key, not by a result
            // code, so presence of `balances` is the success test.
            if (response?.balances) {
                balances = sortBalances(response.balances);
                failed = false;
            } else {
                failed = true;
            }
        } catch {
            failed = true;
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        void load($currentGroup);
    });

    function money(value: number, ccy: string): string {
        return `${(value ?? 0).toLocaleString()} ${ccy ?? ''}`.trim();
    }
</script>

{#if !expanded}
    <CollapsedWidget onRestore={() => (expanded = true)}/>
{:else}
    <div class="relative flex h-full flex-col rounded-xl bg-onebank-base-50 p-2">
        <WidgetHeader onCollapse={() => (expanded = false)}>
            <span class="text-sm font-medium text-gray-700">{t('Balances', 'ຍອດເງິນ')}</span>
        </WidgetHeader>

        {#if failed}
            <FetchingError onRetry={() => load($currentGroup)}/>
        {:else if loading}
            <div class="space-y-2 p-1" aria-busy="true">
                {#each Array(3) as _, i (i)}
                    <div class="h-10 animate-pulse rounded-lg bg-gray-100"></div>
                {/each}
            </div>
        {:else if balances.length === 0}
            <div class="flex flex-1 items-center justify-center text-sm text-gray-400">
                {t('No accounts', 'ບໍ່ມີບັນຊີ')}
            </div>
        {:else}
            <ul class="flex-1 divide-y divide-gray-100 overflow-y-auto">
                {#each balances as balance, i (balance.account + i)}
                    <li class="flex items-center justify-between gap-2 py-2">
                        <div class="min-w-0">
                            <div class="truncate text-sm text-gray-800">{balance.name}</div>
                            <div class="text-xs text-gray-400">{balance.account}</div>
                        </div>
                        <div class="flex-shrink-0 text-right">
                            <div class="text-sm font-medium tabular-nums text-gray-900">{money(balance.availablebalance, balance.ccy)}</div>
                            <div class="text-xs text-gray-400">{t('Available', 'ໃຊ້ໄດ້')}</div>
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
{/if}
