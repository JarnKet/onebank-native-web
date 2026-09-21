<script lang="ts">
    /**
     * The dashboard's calendar card: a week strip, and the chosen day's
     * transactions under it — settled ones grey, cancelled struck through,
     * pending ones pink with a violet status, as the design colours them.
     *
     * Replaces the full month grid (`TransactionCalendar`). The design shows a
     * single week; the arrows step a week at a time and the month label
     * follows. It does not use the vendored Lao calendar table, which ended on
     * 2026-01-07 and threw on every date after it.
     */
    import Icon from '@iconify/svelte';
    import {viewTransactions} from '../../lib/api/commands';
    import type {TransactionInfo} from '../../lib/api/types';
    import {BUDDHIST_YEAR_OFFSET, FULL_MONTHS} from '../../lib/constant';
    import {initials, isoDay, lang, money, splitTime, t} from '../../lib/utils/helper';
    import {navigateToPath} from '../../lib/utils/navigation';
    import {currentGroup} from '../../stores/onebankGroups';
    import {indexByDay} from './calendar';

    /** Monday first, with the short Lao names the design uses. */
    const WEEKDAYS = [
        {en: 'Mon', lo: 'ຈັນ'}, {en: 'Tue', lo: 'ຄານ'}, {en: 'Wed', lo: 'ພຸດ'}, {en: 'Thu', lo: 'ພະຫັດ'},
        {en: 'Fri', lo: 'ສຸກ'}, {en: 'Sat', lo: 'ເສົາ'}, {en: 'Sun', lo: 'ທິດ'},
    ];

    let items = $state<TransactionInfo[]>([]);
    let loading = $state(false);
    let selected = $state(new Date());

    $effect(() => {
        const group = $currentGroup;
        if (!group) return;
        loading = true;
        viewTransactions(group)
            .then((response) => (items = response.items ?? []))
            .catch(() => (items = []))
            .finally(() => (loading = false));
    });

    const byDay = $derived(indexByDay(items));
    const todayKey = isoDay(new Date());

    const week = $derived.by(() => {
        const monday = new Date(selected);
        monday.setDate(selected.getDate() - ((selected.getDay() + 6) % 7));
        return Array.from({length: 7}, (_, index) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + index);
            return date;
        });
    });

    const month = $derived(FULL_MONTHS[selected.getMonth()]);
    const heading = $derived(`${lang === 1 ? month.lo : month.en} ${selected.getFullYear()} | ${selected.getFullYear() + BUDDHIST_YEAR_OFFSET}`);
    const dayItems = $derived(byDay.get(isoDay(selected)) ?? []);

    function shift(days: number) {
        const next = new Date(selected);
        next.setDate(selected.getDate() + days);
        selected = next;
    }

    function title(item: TransactionInfo): string {
        return String(item.detail?.DESCRIPTION || item.detail?.TOACCOUNTNAME || item.service || t('Transaction', 'ທຸລະກຳ'));
    }

    const STATUS: Record<string, [string, string]> = {
        SUCCESS: ['Success', 'ສຳເລັດ'],
        CANCELLED: ['Cancelled', 'ຍົກເລີກ'],
        PENDING: ['Pending', 'ລໍຖ້າອະນຸມັດ'],
        REJECTED: ['Rejected', 'ປະຕິເສດ'],
    };
</script>

<section class="flex flex-col rounded-ob-xl bg-onebank-surface p-5 shadow-ob-card">
    <header class="flex items-center gap-3">
        <h2 class="mr-auto text-xl font-bold">{heading}</h2>
        <button type="button" aria-label={t('Previous week', 'ອາທິດກ່ອນ')} onclick={() => shift(-7)}>
            <img src="img/ob/ic-chevron-circle-left.svg" alt="" width="30" height="30" class="-rotate-90"/>
        </button>
        <button type="button" aria-label={t('Next week', 'ອາທິດຖັດໄປ')} onclick={() => shift(7)}>
            <img src="img/ob/ic-chevron-circle-right.svg" alt="" width="30" height="30" class="rotate-90"/>
        </button>
        <button type="button" class="ml-3 text-onebank-subtle hover:text-black" aria-label={t('Open statement', 'ເປີດການເຄື່ອນໄຫວ')}
                onclick={() => navigateToPath('/statement')}>
            <Icon icon="mdi:arrow-expand" class="h-5 w-5"/>
        </button>
    </header>

    <div class="mt-4 grid grid-cols-7 text-center" role="grid" aria-label={heading}>
        {#each week as date, index (isoDay(date))}
            {@const key = isoDay(date)}
            {@const past = key < todayKey}
            {@const isSelected = key === isoDay(selected)}
            {@const has = (byDay.get(key)?.length ?? 0) > 0}
            <button type="button" role="gridcell" aria-selected={isSelected}
                    class="flex flex-col items-center gap-1.5 {past && !isSelected ? 'text-onebank-muted' : 'text-black'}"
                    onclick={() => (selected = date)}>
                <span class="text-base">{t(WEEKDAYS[index].en, WEEKDAYS[index].lo)}</span>
                <span class="relative flex h-12 w-12 items-center justify-center rounded-full text-base
                             {isSelected ? 'bg-onebank-red font-bold text-white' : 'font-medium'}">
                    {date.getDate()}
                    {#if has && !isSelected}<span class="absolute bottom-1.5 h-1.5 w-1.5 rounded-full bg-onebank-red"></span>{/if}
                </span>
            </button>
        {/each}
    </div>

    <button type="button" class="onebank-outline-btn mt-5 text-xl" onclick={() => navigateToPath('/transfer')}>
        <Icon icon="mdi:plus-circle" class="h-6 w-6"/>
        {t('New transaction', 'ມອບໝາຍທຸລະກຳ')}
    </button>

    <ul class="mt-5 flex max-h-[340px] flex-col gap-2 overflow-y-auto">
        {#if loading && items.length === 0}
            {#each [0, 1, 2] as i (i)}<li class="h-[73px] animate-pulse rounded-ob-xl bg-onebank-row"></li>{/each}
        {:else if dayItems.length === 0}
            <li class="py-8 text-center text-sm text-onebank-subtle">{t('Nothing on this day', 'ບໍ່ມີທຸລະກຳໃນມື້ນີ້')}</li>
        {/if}
        {#each dayItems as item, i (item.transactionid ?? i)}
            {@const pending = item.status === 'PENDING'}
            {@const cancelled = item.status === 'CANCELLED' || item.status === 'REJECTED'}
            {@const amount = Number(item.amount ?? 0)}
            <li class="flex items-center gap-4 rounded-ob-xl px-4 py-3 {pending ? 'bg-onebank-pink' : 'bg-onebank-row'}">
                <span class="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white
                             {pending ? 'bg-[#f26b6b]' : 'bg-[#e39a9a]'}">{initials(item.makername)}</span>
                <div class="min-w-0 flex-1">
                    <p class="truncate text-base font-bold {pending ? 'text-black' : cancelled ? 'text-onebank-muted line-through' : 'text-onebank-subtle'}">{title(item)}</p>
                    <p class="text-sm {pending ? 'text-black' : 'text-onebank-muted'}">{splitTime(item.txtime).time.slice(0, 5)}</p>
                </div>
                <div class="text-right">
                    <p class="text-base font-semibold tabular-nums
                              {pending ? 'text-black' : cancelled ? 'text-onebank-muted line-through' : amount < 0 ? 'text-onebank-debit' : 'text-onebank-income'}">
                        {money(amount, item.ccy, true)}
                    </p>
                    <p class="text-sm font-medium {pending ? 'text-onebank-pending' : 'text-onebank-muted'}">
                        {t(...(STATUS[item.status ?? ''] ?? [item.status ?? '', item.status ?? '']))}
                    </p>
                </div>
            </li>
        {/each}
    </ul>
</section>
