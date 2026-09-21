<script lang="ts">
    /**
     * One message, as the design's receipt card: the transaction id and amount
     * up top, when / what / which account, where it went, who made it — and
     * Print and Share underneath. Opening it marks it read.
     */
    import Icon from '@iconify/svelte';
    import {getMessages, markMessageRead} from '../lib/api/commands';
    import type {Message} from '../lib/api/types';
    import {maskAccount, money, splitTime, t} from '../lib/utils/helper';
    import {navigateToPath} from '../lib/utils/navigation';
    import {serviceLabel, statusLabel, statusTone} from '../lib/transactions';
    import {currentGroup} from '../stores/onebankGroups';
    import {refreshBadges} from '../stores/badges';

    let {params = {}}: {params?: {id?: string}} = $props();

    let message = $state<Message | null>(null);
    let missing = $state(false);
    let shared = $state('');

    $effect(() => {
        const group = $currentGroup;
        const id = params.id;
        if (!group || !id) return;
        getMessages(group).then(async (response) => {
            message = response.messages?.find((candidate) => candidate.messageid === id) ?? null;
            missing = message === null;
            if (message && !message.read) {
                await markMessageRead(id);
                void refreshBadges(group);
            }
        });
    });

    const when = $derived(splitTime(message?.time));

    function summary(): string {
        if (!message) return '';
        return `${serviceLabel(message.service)} #${message.transactionid}\n${money(message.amount, message.ccy)}\n${when.date} ${when.time}\n${message.accountname} ${message.toaccount}`;
    }

    async function share() {
        try {
            if (navigator.share) await navigator.share({title: `OneBank #${message?.transactionid}`, text: summary()});
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
        <div class="ob-card p-8 text-center text-onebank-subtle">{t('This message no longer exists.', 'ບໍ່ພົບຂໍ້ຄວາມນີ້.')}</div>
    {:else if !message}
        <div class="h-96 animate-pulse rounded-ob-md bg-white"></div>
    {:else}
        <article class="overflow-hidden rounded-ob-md bg-white shadow-ob-card">
            <header class="flex items-start gap-3 border-b border-onebank-row p-6">
                <span class="flex h-8 w-8 items-center justify-center rounded-full bg-onebank-pink text-onebank-red">
                    <Icon icon="mdi:alert-circle" class="h-5 w-5"/>
                </span>
                <div class="flex-1">
                    <p class="text-sm text-onebank-subtle">{t('Transaction ID', 'ລະຫັດທຸລະກຳ')}</p>
                    <p class="text-lg font-bold">#{message.transactionid}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm text-onebank-subtle">{t('Amount', 'ຈຳນວນເງິນ')}</p>
                    <p class="text-lg font-bold tabular-nums {message.amount < 0 ? 'text-onebank-expense' : 'text-onebank-income'}">{money(message.amount, message.ccy)}</p>
                </div>
            </header>
            <dl class="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-onebank-row p-6 text-sm">
                <div><dt class="text-onebank-subtle">{t('Date & time', 'ວັນທີ ແລະ ເວລາ')}</dt><dd class="font-medium">{when.date} {when.time}</dd></div>
                <div><dt class="text-onebank-subtle">{t('Service', 'ບໍລິການ')}</dt><dd class="font-medium uppercase">{serviceLabel(message.service)}</dd></div>
                <div><dt class="text-onebank-subtle">{t('Account', 'ບັນຊີ')}</dt><dd class="font-medium">{maskAccount(message.account)}</dd></div>
                <div><dt class="text-onebank-subtle">{t('Account name', 'ຊື່ບັນຊີ')}</dt><dd class="font-medium">{message.accountname}</dd></div>
            </dl>
            <div class="border-b border-onebank-row p-6 text-sm">
                <h2 class="mb-3 font-semibold text-onebank-blue">{t('Transaction details', 'ລາຍລະອຽດທຸລະກຳ')}</h2>
                <div class="flex justify-between gap-4"><span class="text-onebank-subtle">{t('To account', 'ໄປບັນຊີ')}</span><span class="font-medium">{message.toaccount}</span></div>
            </div>
            <dl class="space-y-3 p-6 text-sm">
                <div class="flex justify-between"><dt class="text-onebank-subtle">{t('Maker', 'ຜູ້ສ້າງ')}</dt><dd class="font-semibold">{message.maker}</dd></div>
                <div class="flex justify-between"><dt class="text-onebank-subtle">{t('User type', 'ປະເພດຜູ້ໃຊ້')}</dt><dd class="font-semibold">{message.usertype}</dd></div>
                <div class="flex justify-between"><dt class="text-onebank-subtle">{t('Status', 'ສະຖານະ')}</dt>
                    <dd><span class="rounded-full px-3 py-0.5 text-xs font-semibold uppercase {statusTone(message.status)}">● {statusLabel(message.status)}</span></dd></div>
            </dl>
        </article>

        <div class="flex justify-end gap-3 print:hidden">
            <button type="button" class="flex h-10 w-40 items-center justify-center gap-2 rounded-ob-sm bg-onebank-expense text-sm font-semibold text-white" onclick={() => window.print()}>
                <Icon icon="mdi:printer" class="h-4 w-4"/>{t('Print', 'ພິມ')}
            </button>
            <button type="button" class="flex h-10 w-40 items-center justify-center gap-2 rounded-ob-sm bg-white text-sm font-semibold shadow-ob-card" onclick={share}>
                <Icon icon="mdi:share-variant" class="h-4 w-4"/>{t('Share', 'ແບ່ງປັນ')}
            </button>
        </div>
        {#if shared}<p class="text-right text-sm text-green-700" role="status">{shared}</p>{/if}
    {/if}
</div>
