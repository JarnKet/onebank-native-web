<script lang="ts">
    /**
     * Daily debit/credit bars, or the spend-share donut, for one account.
     *
     * Merges onebank-ui's `BarchartWidget` and `PiechartWidget`, which were two
     * 204-line files differing only in widget kind, chart type and how the
     * response maps onto series. Both cache per account so flipping between
     * accounts does not re-fetch, and both treat a missing `items` key as "no
     * data for this account" rather than an error — that is the core's
     * convention.
     */
    import {BarChartGrouped, DonutChart} from '@carbon/charts-svelte';
    // Carbon types these as enums, not the string literals they serialise to.
    import {Alignments, LegendPositions, ScaleTypes} from '@carbon/charts';
    import WidgetHeader from './WidgetHeader.svelte';
    import CollapsedWidget from './CollapsedWidget.svelte';
    import FetchingError from './FetchingError.svelte';
    import {loadWidget} from '../../lib/api/commands';
    import type {UsageDaily, UsageShare, WidgetKind} from '../../lib/api/types';
    import {t} from '../../lib/utils/helper';
    import {currentGroup, loadHomeResult} from '../../stores/onebankGroups';

    let {kind, title}: {kind: Extract<WidgetKind, 'USAGEDAILY' | 'USAGESHARE'>; title: [string, string]} = $props();

    const DEBIT_HEX = '#EF5350';
    const CREDIT_HEX = '#4CAF50';
    const NO_DATA = 'NO_DATA';

    interface Point {
        group: string
        date: string
        value: number
    }

    let expanded = $state(true);
    let loading = $state(false);
    let failed = $state(false);
    let data = $state<Point[]>([]);
    let selectedAccountId = $state('');

    const accounts = $derived($loadHomeResult?.accounts ?? []);

    // Cached per group+account: switching back should not re-fetch.
    const cache = new Map<string, Point[]>();
    const cacheKey = (group: string, account: string) => `${group}::${account}`;

    function toBars(items: UsageDaily[]): Point[] {
        return items.flatMap((item) => [
            {group: 'debit', date: item.date, value: item.debit},
            {group: 'credit', date: item.date, value: item.credit},
        ]);
    }

    function toSlices(items: UsageShare[]): Point[] {
        if (items.length === 0) return [{group: NO_DATA, date: '', value: 1}];
        return items.map((item) => ({group: item.type, date: '', value: item.amount}));
    }

    async function load(group: string, accountId: string) {
        if (!group || !accountId) return;
        const key = cacheKey(group, accountId);
        const cached = cache.get(key);
        if (cached) {
            data = cached;
            failed = false;
            return;
        }
        loading = true;
        failed = false;
        try {
            const response = await loadWidget(kind, accountId, group);
            if (response?.items) {
                const points = kind === 'USAGEDAILY' ? toBars(response.items as UsageDaily[]) : toSlices(response.items as UsageShare[]);
                cache.set(key, points);
                data = points;
            } else {
                failed = true;
            }
        } catch {
            failed = true;
        } finally {
            loading = false;
        }
    }

    // Default to the group's first account, and follow it when the group changes.
    $effect(() => {
        const first = accounts[0]?.accountid ?? '';
        if (first && !accounts.some((a) => a.accountid === selectedAccountId)) selectedAccountId = first;
    });

    $effect(() => {
        void load($currentGroup, selectedAccountId);
    });

    function retry() {
        cache.delete(cacheKey($currentGroup, selectedAccountId));
        void load($currentGroup, selectedAccountId);
    }

    const totals = $derived({
        debit: data.filter((p) => p.group === 'debit').reduce((sum, p) => sum + p.value, 0),
        credit: data.filter((p) => p.group === 'credit').reduce((sum, p) => sum + p.value, 0),
    });

    const barOptions = $derived({
        legend: {enabled: false},
        grid: {y: {numberOfTicks: 3}, x: {enabled: false}},
        resizable: true,
        height: '160px',
        axes: {
            right: {visible: true, mapsTo: 'value'},
            bottom: {mapsTo: 'date', scaleType: ScaleTypes.TIME},
        },
        toolbar: {enabled: false},
        color: {scale: {debit: DEBIT_HEX, credit: CREDIT_HEX}},
    });

    const donutOptions = $derived({
        resizable: true,
        height: '160px',
        legend: {position: LegendPositions.LEFT, enabled: true},
        tooltip: {enabled: true},
        pie: {alignment: Alignments.RIGHT, labels: {enabled: false}},
        toolbar: {enabled: false},
        color: {scale: {OnePay: '#E6241AB2', [NO_DATA]: '#ededed'}},
        donut: {center: {label: ''}, alignment: Alignments.RIGHT},
    });
</script>

{#if !expanded}
    <CollapsedWidget onRestore={() => (expanded = true)}/>
{:else}
    <div class="relative flex h-full flex-col rounded-xl bg-onebank-base-50 p-2">
        <WidgetHeader onCollapse={() => (expanded = false)}>
            <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-medium text-gray-700">{t(title[0], title[1])}</span>
                {#if accounts.length > 1}
                    <select
                            bind:value={selectedAccountId}
                            class="max-w-[9rem] truncate rounded-md border-gray-200 py-0.5 text-xs"
                            aria-label={t('Account', 'ບັນຊີ')}
                    >
                        {#each accounts as account (account.accountid)}
                            <option value={account.accountid}>{account.alias || account.name || account.account}</option>
                        {/each}
                    </select>
                {/if}
            </div>
        </WidgetHeader>

        {#if failed}
            <FetchingError onRetry={retry}/>
        {:else if loading}
            <div class="h-40 animate-pulse rounded-lg bg-gray-100" aria-busy="true"></div>
        {:else if data.length === 0}
            <div class="flex h-40 items-center justify-center text-sm text-gray-400">{t('No data', 'ບໍ່ມີຂໍ້ມູນ')}</div>
        {:else if kind === 'USAGEDAILY'}
            <div class="graph-frame flex-1">
                <BarChartGrouped {data} options={barOptions}/>
            </div>
            <div class="mt-1 flex justify-between px-1 text-xs">
                <span class="text-negative">{t('Debit', 'ລາຍຈ່າຍ')}: {totals.debit.toLocaleString()}</span>
                <span class="text-positive">{t('Credit', 'ລາຍຮັບ')}: {totals.credit.toLocaleString()}</span>
            </div>
        {:else}
            <div class="graph-frame flex-1">
                <DonutChart {data} options={donutOptions}/>
            </div>
        {/if}
    </div>
{/if}
