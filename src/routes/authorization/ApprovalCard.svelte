<script lang="ts">
    /**
     * One transaction on the authorization page, in the design's three looks:
     * waiting on me (violet outline, approve / reject), waiting on others (blue
     * outline, the level it waits at, edit / cancel), and history — with the
     * trail of who approved or rejected, and why, underneath.
     */
    import Icon from '@iconify/svelte';
    import type {TransactionInfo} from '../../lib/api/types';
    import {initials, money, splitTime, t} from '../../lib/utils/helper';
    import {counterpart, serviceLabel} from '../../lib/transactions';

    let {
        tx,
        me,
        mode,
        busy = false,
        onApprove,
        onReject,
        onEdit,
        onCancel,
        onArchive,
    }: {
        tx: TransactionInfo
        /** The logged-in user's id, to mark their own decisions "(You)". */
        me: string
        mode: 'approver' | 'maker' | 'history'
        busy?: boolean
        onApprove?: () => void
        onReject?: () => void
        onEdit?: () => void
        onCancel?: () => void
        onArchive?: () => void
    } = $props();

    const when = $derived(splitTime(tx.txtime));
    const approvals = $derived(tx.approvals ?? []);
    const nextLevel = $derived(approvals.filter((approval) => approval.decision === 'APPROVED').length + 1);
    const rejected = $derived(tx.status === 'REJECTED');
    const amount = $derived(Number(tx.amount ?? 0));

    const tone = $derived(
        mode === 'approver'
            ? 'border-[#c9a7f5]'
            : rejected
              ? 'border-[#bfe3f7] bg-[#eef8fd]'
              : mode === 'maker'
                ? 'border-[#bfe3f7]'
                : tx.status === 'SUCCESS'
                  ? 'border-[#c9a7f5]'
                  : 'border-[#e5d7fb] bg-[#f8f4fe]',
    );

    function who(userid: string, name: string): string {
        return userid === me ? `${name} (${t('You', 'ທ່ານ')})` : name;
    }
</script>

<article class="rounded-ob-lg border-2 bg-white p-4 {tone}">
    <div class="flex gap-3">
        <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-onebank-light-grey-4 text-xs font-semibold text-white">{initials(tx.makername)}</span>
        <div class="min-w-0 flex-1">
            <div class="flex items-start gap-2">
                <p class="flex-1 font-bold">{serviceLabel(tx.service)}</p>
                <p class="text-right text-xs leading-tight">{when.date}<br/>{when.time}</p>
            </div>
            <p class="font-semibold tabular-nums {amount < 0 ? 'text-onebank-red' : 'text-onebank-income'}">{money(amount, tx.ccy, true)}</p>
            <p class="truncate text-sm">{t('To', 'ໂອນຫາ')}: {counterpart(tx)}</p>
            {#if tx.detail?.DESCRIPTION && tx.detail.DESCRIPTION !== tx.service}
                <p class="line-clamp-2 text-sm">{t('Description', 'ຄຳອະທິບາຍ')}: {tx.detail.DESCRIPTION}</p>
            {/if}
            {#if tx.scheduledfor}
                <p class="text-sm text-onebank-blue"><Icon icon="mdi:calendar-clock" class="-mt-0.5 mr-1 inline h-4 w-4"/>{t('Scheduled for', 'ກຳນົດເວລາ')} {splitTime(tx.scheduledfor).date} {splitTime(tx.scheduledfor).time.slice(0, 5)}</p>
            {/if}
            {#if mode !== 'approver'}
                <p class="mt-1 text-xs text-onebank-subtle">{t('Made by', 'ສ້າງໂດຍ')} {who(String(tx.makerid ?? ''), String(tx.makername ?? ''))}</p>
            {/if}
        </div>
    </div>

    {#if mode === 'maker' && tx.status === 'PENDING'}
        <p class="mx-auto mt-3 w-fit rounded-full border border-onebank-pending/40 px-4 py-1 text-xs text-onebank-pending">
            {t(`Waiting for level ${nextLevel} approval`, `ລໍຖ້າອະນຸມັດຂັ້ນ ${nextLevel}`)} · {approvals.length}/{tx.requiredApprovals ?? 1}
        </p>
    {/if}

    {#if approvals.length}
        <ul class="mt-3 space-y-2">
            {#each approvals as approval (approval.userid + approval.time)}
                {@const at = splitTime(approval.time)}
                <li class="flex gap-2 text-xs">
                    <Icon icon={approval.decision === 'APPROVED' ? 'mdi:check-circle' : 'mdi:close-circle'}
                          class="h-7 w-7 shrink-0 {approval.decision === 'APPROVED' ? 'text-onebank-income' : 'text-onebank-expense'}"/>
                    <span class={approval.decision === 'APPROVED' ? 'text-onebank-subtle' : 'text-onebank-expense'}>
                        {approval.decision === 'APPROVED'
                            ? t(`Level ${approval.level} approved by`, `ອະນຸມັດຂັ້ນ ${approval.level} ແລ້ວ ໂດຍ`)
                            : t('Rejected by', 'ຖືກປະຕິເສດແລ້ວ ໂດຍ')}
                        {who(approval.userid, approval.name)}<br/>
                        <span class="text-onebank-muted">{at.date}, {at.time}</span>
                        {#if approval.reason}<br/><span>{t('Reason', 'ເຫດຜົນ')}: {approval.reason}</span>{/if}
                    </span>
                </li>
            {/each}
        </ul>
    {/if}

    {#if mode === 'approver'}
        <div class="mt-4 flex justify-center gap-4">
            <button type="button" class="h-8 w-32 rounded-ob-sm bg-onebank-pink text-sm font-medium text-onebank-red disabled:opacity-50" disabled={busy} onclick={onApprove}>
                {t('Approve', 'ອະນຸມັດ')}
            </button>
            <button type="button" class="h-8 w-32 rounded-ob-sm bg-onebank-light-grey-4 text-sm font-medium disabled:opacity-50" disabled={busy} onclick={onReject}>
                {t('Reject', 'ປະຕິເສດ')}
            </button>
        </div>
    {:else if mode === 'maker' && tx.status === 'PENDING'}
        <div class="mt-4 flex justify-center gap-4">
            <button type="button" class="h-8 w-28 rounded-ob-sm bg-onebank-light-grey-2 text-sm disabled:opacity-50" disabled={busy} onclick={onEdit}>{t('Edit', 'ແກ້ໄຂ')}</button>
            <button type="button" class="h-8 w-28 rounded-ob-sm bg-onebank-light-grey-4 text-sm disabled:opacity-50" disabled={busy} onclick={onCancel}>{t('Cancel', 'ຍົກເລີກ')}</button>
        </div>
    {:else if mode === 'maker' && rejected}
        <div class="mt-4 flex justify-center">
            <button type="button" class="h-8 rounded-ob-sm bg-[#cdeaf8] px-6 text-sm disabled:opacity-50" disabled={busy} onclick={onArchive}>{t('Move to history', 'ເກັບໄວ້ໃນປະຫວັດ')}</button>
        </div>
    {/if}
</article>
