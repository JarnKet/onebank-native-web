<script lang="ts">
    /**
     * Pending authorization: what is waiting on the user (left) and what the
     * user made that is waiting on others (right). Each column's history chip
     * opens the matching history list.
     */
    import Icon from '@iconify/svelte';
    import ApprovalCard from './authorization/ApprovalCard.svelte';
    import Modal from '../lib/components/Modal.svelte';
    import {approveTransaction, archiveTransaction, cancelTransaction, rejectTransaction, simulateApproval, viewTransactions} from '../lib/api/commands';
    import type {TransactionInfo} from '../lib/api/types';
    import {t} from '../lib/utils/helper';
    import {navigateToPath} from '../lib/utils/navigation';
    import {currentGroup} from '../stores/onebankGroups';
    import {myUserId, refreshBadges} from '../stores/badges';
    import {reloadHome} from '../stores/home';

    let items = $state<TransactionInfo[]>([]);
    let loading = $state(false);
    let busy = $state<string | number | null>(null);
    let error = $state('');
    let rejecting = $state<TransactionInfo | null>(null);
    let reason = $state('');

    const me = myUserId();

    async function load(group: string) {
        if (!group) return;
        loading = true;
        const response = await viewTransactions(group);
        items = response.items ?? [];
        loading = false;
    }

    $effect(() => {
        void load($currentGroup);
    });

    const decided = (tx: TransactionInfo) => (tx.approvals ?? []).some((approval) => approval.userid === me);
    const toApprove = $derived(items.filter((tx) => tx.status === 'PENDING' && tx.makerid !== me && !decided(tx)));
    const awaiting = $derived(
        items.filter((tx) => tx.makerid === me && !tx.archived && (tx.status === 'PENDING' || tx.status === 'REJECTED')),
    );

    async function act(tx: TransactionInfo, run: () => Promise<{result: number; message?: string}>) {
        busy = tx.transactionid ?? null;
        error = '';
        const response = await run();
        busy = null;
        if (response.result !== 0) error = response.message || t('Something went wrong', 'ມີບາງຢ່າງຜິດພາດ');
        await Promise.all([load($currentGroup), refreshBadges(), reloadHome()]);
    }

    async function submitReject() {
        if (!rejecting || !reason.trim()) return;
        const tx = rejecting;
        rejecting = null;
        await act(tx, () => rejectTransaction(tx.transactionid!, reason.trim()));
        reason = '';
    }

    /** Editing withdraws the pending one and reopens its form, filled in. */
    async function edit(tx: TransactionInfo) {
        await act(tx, () => cancelTransaction(tx.transactionid!));
        navigateToPath('/transfer', {
            to: String(tx.detail?.TOACCOUNTNO ?? ''),
            name: String(tx.detail?.TOACCOUNTNAME ?? ''),
            amount: String(Math.abs(Number(tx.amount ?? 0))),
            note: String(tx.detail?.DESCRIPTION ?? ''),
        });
    }
</script>

{#if error}<div class="mb-3 rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}

<div class="grid items-start gap-4 desktop:grid-cols-2">
    {#each [
        {title: t('Waiting for your approval', 'ລາຍການທີ່ທ່ານຕ້ອງອະນຸມັດ'), list: toApprove, mode: 'approver' as const, tab: 'approver', chip: 'bg-violet-100 text-violet-700'},
        {title: t('Waiting for others', 'ລາຍການທີ່ລໍຖ້າອະນຸມັດ'), list: awaiting, mode: 'maker' as const, tab: 'mine', chip: 'bg-sky-100 text-sky-700'},
    ] as column (column.tab)}
        <section class="ob-card flex flex-col gap-3 p-4">
            <header class="flex items-center gap-3">
                <h2 class="mr-auto text-lg font-bold">{column.title}</h2>
                <button type="button" class="flex items-center gap-1.5 rounded-ob-sm px-3 py-1 text-xs {column.chip}"
                        onclick={() => navigateToPath('/authorization/history', {tab: column.tab})}>
                    <Icon icon="mdi:history" class="h-4 w-4"/>{t('History', 'ປະຫວັດ')}
                </button>
            </header>
            {#if loading && items.length === 0}
                {#each [0, 1] as i (i)}<div class="h-40 animate-pulse rounded-ob-lg bg-onebank-row"></div>{/each}
            {:else}
                {#each column.list as tx (tx.transactionid)}
                    <ApprovalCard {tx} {me} mode={column.mode} busy={busy === tx.transactionid}
                                  onApprove={() => act(tx, () => approveTransaction(tx.transactionid!))}
                                  onReject={() => { rejecting = tx; reason = ''; }}
                                  onEdit={() => edit(tx)}
                                  onCancel={() => act(tx, () => cancelTransaction(tx.transactionid!))}
                                  onArchive={() => act(tx, () => archiveTransaction(tx.transactionid!))}
                                  onSimulate={column.mode === 'maker' ? () => act(tx, () => simulateApproval(tx.transactionid!)) : undefined}/>
                {:else}
                    <p class="py-10 text-center text-sm text-onebank-subtle">{t('Nothing here right now', 'ບໍ່ມີລາຍການ')}</p>
                {/each}
            {/if}
        </section>
    {/each}
</div>

{#if rejecting}
    <Modal title={t('Please give the reason for rejecting', 'ກະລຸນາລະບຸເຫດຜົນການປະຕິເສດ')} size="sm" onClose={() => (rejecting = null)}>
        <label class="block">
            <span class="sr-only">{t('Reason', 'ເຫດຜົນ')}</span>
            <textarea bind:value={reason} rows="4" maxlength="200"
                      class="w-full rounded-ob-sm border border-onebank-subtle p-3 focus:border-onebank-red focus:ring-onebank-red"></textarea>
        </label>
        {#snippet footer()}
            <button type="button" class="onebank-primary-btn h-10 tablet:w-44" disabled={!reason.trim()} onclick={submitReject}>{t('Save', 'ບັນທຶກ')}</button>
        {/snippet}
    </Modal>
{/if}
