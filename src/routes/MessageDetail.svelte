<script lang="ts">
    /**
     * One transaction, as the design's receipt card: the id and amount up top,
     * when / what / which account, where it went, who made it — and Print and
     * Share underneath. Found by `transactionid` in `viewtransactions`.
     */
    import Icon from '@iconify/svelte';
    import {viewTransactions} from '../lib/api/commands';
    import type {TransactionInfo} from '../lib/api/types';
    import {maskAccount, money, splitTime, t} from '../lib/utils/helper';
    import {navigateToPath} from '../lib/utils/navigation';
    import {serviceLabel, statusLabel, statusTone} from '../lib/transactions';
    import {currentGroup} from '../stores/onebankGroups';

    let {params = {}}: {params?: {id?: string}} = $props();

    let item = $state<TransactionInfo | null>(null);
    let missing = $state(false);
    let shared = $state('');

    $effect(() => {
        const group = $currentGroup;
        const id = params.id;
        if (!group || !id) return;
        viewTransactions(group)
            .then((response) => {
                item = response?.items?.find((candidate) => String(candidate.transactionid) === id) ?? null;
                missing = item === null;
            })
            .catch(() => (missing = true));
    });

    const when = $derived(splitTime(item?.txtime));
    const amount = $derived(Number(item?.amount ?? item?.detail?.AMOUNT ?? 0));
    const ccy = $derived(item?.ccy ?? item?.detail?.CCY);
    const toAccount = $derived(String(item?.detail?.TOACCOUNTNO ?? item?.detail?.TOACCOUNT ?? ''));
    const toName = $derived(String(item?.detail?.TOACCOUNTNAME ?? ''));

    function summary(): string {
        if (!item) return '';
        return `${serviceLabel(item.service)} #${item.transactionid}\n${money(amount, ccy)}\n${when.date} ${when.time}\n${toName} ${toAccount}`;
    }

    async function share() {
        try {
            if (navigator.share) await navigator.share({title: `OneBank #${item?.transactionid}`, text: summary()});
            else {
                await navigator.clipboard.writeText(summary());
                shared = t('Copied to the clipboard', 'ສຳເນົາແລ້ວ');
            }
        } catch {
            // Dismissing the share sheet is not an error.
        }
    }
</script>

<div class="mx-auto max-w-3xl space-y-6">
    <button type="button" class="flex items-center gap-1 text-sm text-onebank-subtle hover:text-black print:hidden" onclick={() => navigateToPath('/messages')}>
        <Icon icon="mdi:arrow-left" class="h-5 w-5"/>{t('All messages', 'ຂໍ້ຄວາມທັງໝົດ')}
    </button>

    {#if missing}
        <div class="ob-card p-8 text-center text-onebank-subtle">{t('This transaction could not be found.', 'ບໍ່ພົບທຸລະກຳນີ້.')}</div>
    {:else if !item}
        <div class="h-96 animate-pulse rounded-ob-md bg-white"></div>
    {:else}
        <article class="overflow-hidden rounded-ob-md bg-white shadow-ob-card">
            <header class="flex items-start gap-3 border-b border-onebank-row p-6">
                <span class="flex h-8 w-8 items-center justify-center rounded-full bg-onebank-pink text-onebank-red">
                    <Icon icon="mdi:alert-circle" class="h-5 w-5"/>
                </span>
                <div class="flex-1">
                    <p class="text-sm text-onebank-subtle">{t('Transaction ID', 'ລະຫັດທຸລະກຳ')}</p>
                    <p class="text-lg font-bold">#{item.transactionid}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-onebank-subtle">{t('Amount', 'ຈຳນວນເງິນ')}</p>
                    <p class="text-lg font-bold tabular-nums {amount < 0 ? 'text-onebank-expense' : 'text-onebank-income'}">{money(amount, ccy)}</p>
                </div>
            </header>
            <dl class="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-onebank-row p-6 text-sm">
                <div><dt class="text-onebank-subtle">{t('Date & time', 'ວັນທີ ແລະ ເວລາ')}</dt><dd class="font-medium">{when.date} {when.time}</dd></div>
                <div><dt class="text-onebank-subtle">{t('Service', 'ບໍລິການ')}</dt><dd class="font-medium uppercase">{serviceLabel(item.service)}</dd></div>
                <div><dt class="text-onebank-subtle">{t('Account', 'ບັນຊີ')}</dt><dd class="font-medium">{maskAccount(item.account)}</dd></div>
                <div><dt class="text-onebank-subtle">{t('Account name', 'ຊື່ບັນຊີ')}</dt><dd class="font-medium">{item.accountname}</dd></div>
            </dl>
            <div class="space-y-2 border-b border-onebank-row p-6 text-sm">
                <h2 class="mb-1 font-semibold text-onebank-blue">{t('Transaction details', 'ລາຍລະອຽດທຸລະກຳ')}</h2>
                <div class="flex justify-between gap-4"><span class="text-onebank-subtle">{t('To account', 'ໄປບັນຊີ')}</span><span class="font-medium">{toAccount}</span></div>
                {#if toName}<div class="flex justify-between gap-4"><span class="text-onebank-subtle">{t('To', 'ຫາ')}</span><span class="font-medium">{toName}</span></div>{/if}
                {#if item.detail?.DESCRIPTION}<div class="flex justify-between gap-4"><span class="text-onebank-subtle">{t('Description', 'ຄຳອະທິບາຍ')}</span><span class="text-right">{item.detail.DESCRIPTION}</span></div>{/if}
            </div>
            <dl class="space-y-3 p-6 text-sm">
                <div class="flex justify-between"><dt class="text-onebank-subtle">{t('Maker', 'ຜູ້ສ້າງ')}</dt><dd class="font-semibold">{item.makername}</dd></div>
                {#if item.usertype}<div class="flex justify-between"><dt class="text-onebank-subtle">{t('User type', 'ປະເພດຜູ້ໃຊ້')}</dt><dd class="font-semibold">{item.usertype}</dd></div>{/if}
                <div class="flex justify-between"><dt class="text-onebank-subtle">{t('Status', 'ສະຖານະ')}</dt>
                    <dd><span class="rounded-full px-3 py-0.5 text-xs font-semibold uppercase {statusTone(item.status)}">● {statusLabel(item.status)}</span></dd></div>
            </dl>
        </article>

        <div class="flex justify-end gap-3 print:hidden">
            <button type="button" class="flex h-10 w-40 items-center justify-center gap-2 rounded-ob-sm bg-onebank-expense text-sm font-semibold text-white" onclick={() => window.print()}>
                <Icon icon="mdi:printer" class="h-4 w-4"/>{t('Print', 'ພິມ')}
            </button>
            <button type="button" class="onebank-secondary-btn h-10 w-40 text-sm tablet:min-w-40" onclick={share}>
                <Icon icon="mdi:share-variant" class="h-4 w-4"/>{t('Share', 'ແບ່ງປັນ')}
            </button>
        </div>
        {#if shared}<p class="text-right text-sm text-green-700" role="status">{shared}</p>{/if}
    {/if}
</div>
