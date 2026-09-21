<script lang="ts">
    /**
     * Authorization history, in the design's two versions: what the user was
     * asked to approve (`?tab=approver`), and what the user made (`?tab=mine`).
     * Grouped by month, searchable, filterable by outcome.
     */
    import Icon from '@iconify/svelte';
    import ApprovalCard from './authorization/ApprovalCard.svelte';
    import ListToolbar from '../lib/components/ListToolbar.svelte';
    import {viewTransactions} from '../lib/api/commands';
    import type {TransactionInfo} from '../lib/api/types';
    import {t} from '../lib/utils/helper';
    import {navigateToPath} from '../lib/utils/navigation';
    import {counterpart, statusLabel} from '../lib/transactions';
    import {currentGroup} from '../stores/onebankGroups';
    import {myUserId} from '../stores/badges';
    import {routeLocation} from '../stores/route';

    let items = $state<TransactionInfo[]>([]);
    let search = $state('');
    let date = $state('');
    let status = $state<string>('');

    const me = myUserId();
    const tab = $derived(new URLSearchParams($routeLocation.query).get('tab') === 'mine' ? 'mine' : 'approver');

    $effect(() => {
        const group = $currentGroup;
        if (!group) return;
        viewTransactions(group).then((response) => (items = response.items ?? []));
    });

    const relevant = $derived(
        items.filter((tx) => {
            const involved = tab === 'mine'
                ? tx.makerid === me && (tx.status !== 'PENDING' || tx.archived)
                : (tx.approvals ?? []).some((approval) => approval.userid === me);
            if (!involved) return false;
            if (status && tx.status !== status) return false;
            if (date && !String(tx.txtime).startsWith(date)) return false;
            const query = search.trim().toLowerCase();
            return !query || `${counterpart(tx)} ${tx.detail?.DESCRIPTION ?? ''} ${tx.makername ?? ''}`.toLowerCase().includes(query);
        }),
    );

    const byMonth = $derived.by(() => {
        const groups = new Map<string, TransactionInfo[]>();
        for (const tx of relevant) {
            const key = String(tx.txtime).slice(0, 7);
            groups.set(key, [...(groups.get(key) ?? []), tx]);
        }
        return [...groups];
    });

    const STATUSES = ['', 'SUCCESS', 'REJECTED', 'CANCELLED'];
</script>

<div class="space-y-4">
    <div class="flex items-center gap-2">
        <button type="button" class="rounded-full p-1 hover:bg-white" aria-label={t('Back', 'ກັບຄືນ')} onclick={() => navigateToPath('/authorization')}>
            <Icon icon="mdi:arrow-left" class="h-6 w-6"/>
        </button>
        <h1 class="text-xl font-semibold">
            {tab === 'mine' ? t('History of your transactions', 'ປະຫວັດລາຍການຂອງທ່ານ') : t('History of what you approved', 'ປະຫວັດລາຍການທີ່ທ່ານຕ້ອງອະນຸມັດ')}
        </h1>
    </div>

    <ListToolbar bind:search bind:date>
        <select bind:value={status} aria-label={t('Outcome', 'ຜົນ')}
                class="h-11 rounded-ob-lg border-0 bg-onebank-blue px-4 pr-9 text-sm text-white focus:ring-onebank-red">
            {#each STATUSES as option (option)}
                <option value={option}>{option ? statusLabel(option) : t('All outcomes', 'ທັງໝົດ')}</option>
            {/each}
        </select>
    </ListToolbar>

    {#each byMonth as [month, list] (month)}
        <h2 class="pt-2 font-semibold">{month.slice(5, 7)}/{month.slice(0, 4)}</h2>
        <div class="space-y-3">
            {#each list as tx (tx.transactionid)}
                <ApprovalCard {tx} {me} mode="history"/>
            {/each}
        </div>
    {:else}
        <div class="ob-card p-8 text-center text-onebank-subtle">{t('Nothing in the history yet', 'ຍັງບໍ່ມີປະຫວັດ')}</div>
    {/each}
</div>
