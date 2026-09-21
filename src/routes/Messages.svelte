<script lang="ts">
    /**
     * The group's inbox: one row per notification — what happened, to which
     * account, when, its status, the amount and who it went to. A row opens
     * the transaction's detail.
     */
    import ListToolbar from '../lib/components/ListToolbar.svelte';
    import {getMessages} from '../lib/api/commands';
    import type {Message} from '../lib/api/types';
    import {maskAccount, money, splitTime, t} from '../lib/utils/helper';
    import {navigateToPath} from '../lib/utils/navigation';
    import {serviceLabel, statusLabel, statusTone} from '../lib/transactions';
    import {currentGroup} from '../stores/onebankGroups';

    let messages = $state<Message[]>([]);
    let loading = $state(false);
    let search = $state('');
    let date = $state('');
    let unreadOnly = $state(false);

    $effect(() => {
        const group = $currentGroup;
        if (!group) return;
        loading = true;
        getMessages(group)
            .then((response) => (messages = response.messages ?? []))
            .finally(() => (loading = false));
    });

    const shown = $derived(
        messages.filter((message) => {
            if (unreadOnly && message.read) return false;
            if (date && !message.time.startsWith(date)) return false;
            const query = search.trim().toLowerCase();
            return !query || `${message.accountname} ${message.toaccount} ${message.account} ${message.maker}`.toLowerCase().includes(query);
        }),
    );
</script>

<div class="space-y-4">
    <h1 class="sr-only">{t('Messages', 'ຂໍ້ຄວາມ')}</h1>
    <ListToolbar bind:search bind:date filterCount={unreadOnly ? 1 : 0} onFilter={() => (unreadOnly = !unreadOnly)}/>
    {#if unreadOnly}<p class="text-sm text-onebank-subtle">{t('Showing unread messages only', 'ສະແດງສະເພາະຂໍ້ຄວາມທີ່ຍັງບໍ່ໄດ້ອ່ານ')}</p>{/if}

    <div class="overflow-x-auto rounded-ob-md bg-white shadow-ob-card">
        <table class="w-full min-w-[760px] text-left text-xs">
            <thead class="bg-onebank-page text-[10px] uppercase tracking-wide text-onebank-subtle">
                <tr>
                    <th class="px-6 py-3 font-medium">{t('Service', 'ບໍລິການ')}</th>
                    <th class="px-4 py-3 font-medium">{t('Account', 'ເລກບັນຊີ')}</th>
                    <th class="px-4 py-3 font-medium">{t('Date', 'ວັນທີ')}</th>
                    <th class="px-4 py-3 font-medium">{t('Status', 'ສະຖານະ')}</th>
                    <th class="px-4 py-3 text-right font-medium">{t('Amount', 'ຈຳນວນ')}</th>
                    <th class="px-6 py-3 font-medium">{t('Details', 'ລາຍລະອຽດ')}</th>
                </tr>
            </thead>
            <tbody>
                {#if loading && messages.length === 0}
                    {#each [0, 1, 2] as i (i)}<tr><td colspan="6" class="px-6 py-2"><div class="h-8 animate-pulse rounded bg-onebank-row"></div></td></tr>{/each}
                {/if}
                {#each shown as message (message.messageid)}
                    {@const when = splitTime(message.time)}
                    <tr class="cursor-pointer border-t border-onebank-row transition-colors hover:bg-onebank-page {message.read ? '' : 'font-semibold'}"
                        onclick={() => navigateToPath(`/messages/${message.messageid}`)}>
                        <td class="px-6 py-3">
                            <span class="flex items-center gap-2">
                                {#if !message.read}<span class="h-2 w-2 rounded-full bg-onebank-red" aria-label={t('Unread', 'ຍັງບໍ່ໄດ້ອ່ານ')}></span>{/if}
                                <a href="#/messages/{message.messageid}" class="hover:underline">{serviceLabel(message.service)}</a>
                            </span>
                        </td>
                        <td class="px-4 py-3">{maskAccount(message.account)}</td>
                        <td class="px-4 py-3 leading-tight">{when.date}<br/><span class="text-onebank-subtle">{when.time}</span></td>
                        <td class="px-4 py-3"><span class="rounded-full px-2.5 py-0.5 text-[11px] {statusTone(message.status)}">{statusLabel(message.status)}</span></td>
                        <td class="px-4 py-3 text-right font-semibold tabular-nums {message.amount < 0 ? 'text-onebank-red' : 'text-onebank-income'}">{money(message.amount, message.ccy)}</td>
                        <td class="max-w-72 px-6 py-3">
                            <span class="block truncate font-semibold">{message.accountname}</span>
                            <span class="block truncate text-[11px] font-normal text-onebank-subtle">{t('To account', 'ໄປບັນຊີ')}: {message.toaccount}</span>
                        </td>
                    </tr>
                {:else}
                    {#if !loading}<tr><td colspan="6" class="px-6 py-12 text-center text-sm text-onebank-subtle">{t('No messages', 'ບໍ່ມີຂໍ້ຄວາມ')}</td></tr>{/if}
                {/each}
            </tbody>
        </table>
    </div>
</div>
