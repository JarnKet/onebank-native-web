<script lang="ts">
    /**
     * Month calendar with the selected day's transactions.
     *
     * Layout harvested from onebank-ui's `DesktopTransactionCalendar.svelte`;
     * the data is real. The original fills the month from
     * `generateRandomTransactions()` — invented amounts and descriptions against
     * a hardcoded account — which cannot ship in a running banking UI. This
     * reads `ONEBANKTRANSACTION/viewtransactions` and shows an empty state where
     * there is nothing, rather than inventing a row.
     *
     * Two other fixes to the original: its "Assign transaction" button had no
     * handler at all, so it is gone; and it printed the Buddhist year as
     * `getFullYear() + 542`, which is off by one — the Buddhist Era is 543 years
     * ahead. This deliberately differs from mobile, where the year is wrong.
     */
    import Icon from '@iconify/svelte';
    import CalendarDay from './CalendarDay.svelte';
    import {buildMonth, currentWeek, dayKey, indexByDay, signedAmount, type CalendarDay as Cell} from './calendar';
    import {viewTransactions} from '../../lib/api/commands';
    import type {TransactionInfo} from '../../lib/api/types';
    import {BUDDHIST_YEAR_OFFSET, FULL_MONTHS, daysOfWeek} from '../../lib/constant';
    import {t} from '../../lib/utils/helper';
    import {showPopup} from '../../lib/utils/helper';
    import {currentGroup} from '../../stores/onebankGroups';

    let items = $state<TransactionInfo[]>([]);
    let loading = $state(true);
    let failed = $state(false);
    let month = $state(new Date());
    let selected = $state<Date | null>(null);

    // Read once per render pass rather than per cell, so "today" cannot shift
    // mid-render across a midnight boundary.
    const today = new Date();

    const index = $derived(indexByDay(items));
    const cells = $derived(buildMonth(month, index, today));
    const week = $derived(currentWeek(cells));
    const selectedKey = $derived(selected ? dayKey(selected) : dayKey(today));
    const dayItems = $derived(index.get(selectedKey) ?? []);

    const monthLabel = $derived(t(FULL_MONTHS[month.getMonth()].en, FULL_MONTHS[month.getMonth()].lo));

    async function load(group: string) {
        if (!group) {
            items = [];
            loading = false;
            return;
        }
        loading = true;
        failed = false;
        try {
            const response = await viewTransactions(group);
            items = response?.items ?? [];
            // An absent `items` with a non-zero result is a failure, not an
            // empty month — say so instead of showing a clean empty calendar.
            failed = response?.result !== 0;
        } catch {
            items = [];
            failed = true;
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        void load($currentGroup);
    });

    function shiftMonth(offset: number) {
        month = new Date(month.getFullYear(), month.getMonth() + offset, 1);
        selected = null;
    }

    function amountText(item: TransactionInfo): string {
        const value = signedAmount(item);
        const ccy = item.ccy ?? item.detail?.CCY ?? '';
        return `${value.toLocaleString()} ${ccy}`.trim();
    }

    function describe(item: TransactionInfo): string {
        return (
            item.detail?.DESCRIPTION ||
            item.detail?.MERCHANTNAME ||
            item.detail?.TOACCOUNTNAME ||
            item.service ||
            t('Transaction', 'ລາຍການ')
        );
    }

    function timeText(item: TransactionInfo): string {
        const when = item.txtime ? new Date(item.txtime) : null;
        if (!when || Number.isNaN(when.getTime())) return '';
        return when.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    }
</script>

<div class="flex h-full flex-col rounded-xl bg-onebank-base-50 p-4 shadow">
    <div class="mb-3 flex items-center justify-between">
        <div>
            <div class="text-base font-semibold text-gray-800">{monthLabel}</div>
            <div class="text-xs text-gray-500">
                {month.getFullYear()} / {month.getFullYear() + BUDDHIST_YEAR_OFFSET}
            </div>
        </div>
        <div class="flex items-center gap-1">
            <button class="rounded-lg p-1.5 hover:bg-gray-100" onclick={() => shiftMonth(-1)} aria-label={t('Previous month', 'ເດືອນກ່ອນ')}>
                <Icon icon="mdi:chevron-left" width={20} height={20}/>
            </button>
            <button class="rounded-lg p-1.5 hover:bg-gray-100" onclick={() => shiftMonth(1)} aria-label={t('Next month', 'ເດືອນຕໍ່ໄປ')}>
                <Icon icon="mdi:chevron-right" width={20} height={20}/>
            </button>
            <button
                    class="rounded-lg p-1.5 hover:bg-gray-100"
                    onclick={() => showPopup('ONEBANKSTATEMENT.html', {})}
                    aria-label={t('Open statement', 'ເປີດການເຄື່ອນໄຫວ')}
            >
                <Icon icon="mdi:arrow-expand" width={18} height={18}/>
            </button>
        </div>
    </div>

    <div class="grid grid-cols-7 gap-1 text-center text-xs text-gray-400">
        {#each daysOfWeek as day (day.en)}
            <div>{t(day.en, day.lo)}</div>
        {/each}
    </div>

    <!-- Narrow viewports get the week containing today; wider ones the month. -->
    <div class="mt-1 grid grid-cols-7 gap-1 laptop:hidden">
        {#each week as cell, i (i)}
            <CalendarDay {cell} selected={cell.date ? dayKey(cell.date) === selectedKey : false} onselect={(d) => (selected = d)}/>
        {/each}
    </div>
    <div class="mt-1 hidden grid-cols-7 gap-1 laptop:grid">
        {#each cells as cell, i (i)}
            <CalendarDay {cell} selected={cell.date ? dayKey(cell.date) === selectedKey : false} onselect={(d) => (selected = d)}/>
        {/each}
    </div>

    <div class="mt-4 flex-1 overflow-y-auto">
        {#if loading}
            <div class="space-y-2" aria-busy="true">
                {#each Array(3) as _, i (i)}
                    <div class="h-12 animate-pulse rounded-lg bg-gray-100"></div>
                {/each}
            </div>
        {:else if failed}
            <div class="flex h-full flex-col items-center justify-center gap-2 py-6 text-sm text-gray-500">
                <Icon icon="mdi:alert-circle-outline" width={24} height={24}/>
                <span>{t('Could not load transactions', 'ໂຫຼດລາຍການບໍ່ໄດ້')}</span>
                <button class="text-accent underline" onclick={() => load($currentGroup)}>{t('Retry', 'ລອງໃໝ່')}</button>
            </div>
        {:else if dayItems.length === 0}
            <div class="flex h-full items-center justify-center py-6 text-sm text-gray-400">
                {t('No transactions on this day', 'ບໍ່ມີລາຍການໃນມື້ນີ້')}
            </div>
        {:else}
            <ul class="divide-y divide-gray-100">
                {#each dayItems as item, i (item.transactionid ?? i)}
                    <li class="flex items-center justify-between gap-3 py-2">
                        <div class="min-w-0">
                            <div class="truncate text-sm text-gray-800">{describe(item)}</div>
                            <div class="text-xs text-gray-400">{timeText(item)}{item.accountname ? ` · ${item.accountname}` : ''}</div>
                        </div>
                        <div class="flex-shrink-0 text-sm font-medium tabular-nums {signedAmount(item) < 0 ? 'text-negative' : 'text-positive'}">
                            {amountText(item)}
                        </div>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</div>
