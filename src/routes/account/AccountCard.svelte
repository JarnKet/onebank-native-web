<script lang="ts">
    /**
     * One account in the group, as the design's manage-account card draws it:
     * avatar, number (or alias), holder, balance, then the currency and type
     * pills — with the alias field inline for the two account types that have
     * one. Copy, show/hide and remove sit top right, with the lock toggle
     * beside them.
     *
     * Onecash accounts keep mobile's rule: their number is not shown or copied.
     */
    import Icon from '@iconify/svelte';
    import {initials, maskAccount, money, t} from '../../lib/utils/helper';
    import type {Account} from '../../definition';

    let {
        account,
        busy = false,
        onLockToggle,
        onRemove,
        onAliasSave,
    }: {
        account: Account
        /** A request for this account is in flight; its actions are inert. */
        busy?: boolean
        onLockToggle: (account: Account) => void
        onRemove: (account: Account) => void
        onAliasSave: (account: Account, alias: string) => Promise<boolean>
    } = $props();

    const TYPE_LABEL: Record<string, [string, string]> = {
        VIRTUAL: ['Main account', 'ບັນຊີຫຼັກ'],
        SHADOW: ['Shadow account', 'ບັນຊີເງົາ'],
        SAVING: ['Saving', 'ເງິນຝາກປະຢັດ'],
        CURRENT: ['Current', 'ກະແສລາຍວັນ'],
        STANDARD: ['Standard', 'ມາດຕະຖານ'],
    };
    const CCY_COLOR: Record<string, string> = {LAK: '#03a9f4', USD: '#00c853', THB: '#ff8f00', CNY: '#e53935'};

    let revealed = $state(false);
    let editingAlias = $state(false);
    let aliasDraft = $state('');
    let savingAlias = $state(false);
    let copied = $state(false);

    const locked = $derived(account.status === 'LOCKED');
    // Only these two carry an alias; a real account is named by the bank.
    const aliasable = $derived(account.type === 'SHADOW' || account.type === 'VIRTUAL');
    const shown = $derived(revealed ? account.account : maskAccount(account.account));
    const readable = $derived(!(account.name ?? '').includes('Onecash'));
    const typeLabel = $derived(TYPE_LABEL[account.type] ?? [account.type, account.type]);

    async function copy() {
        try {
            await navigator.clipboard.writeText(account.account);
            copied = true;
            setTimeout(() => (copied = false), 1500);
        } catch {
            // A denied clipboard is not worth an error state; the number is on screen.
        }
    }

    function startEditing() {
        aliasDraft = account.alias ?? '';
        editingAlias = true;
    }

    async function saveAlias() {
        if (savingAlias) return;
        savingAlias = true;
        const saved = await onAliasSave(account, aliasDraft);
        savingAlias = false;
        if (saved) editingAlias = false;
    }
</script>

<article class="ob-card flex gap-5 p-5">
    <span class="flex h-17.5 w-17.5 shrink-0 items-center justify-center rounded-full bg-onebank-light-grey-4 text-lg font-semibold text-white">
        {initials(account.alias || account.name)}
    </span>

    <div class="min-w-0 flex-1">
        <div class="flex items-start gap-2">
            <h3 class="min-w-0 flex-1 truncate pt-1 text-xl font-bold">{aliasable && account.alias ? account.alias.toUpperCase() : shown}</h3>
            <div class="flex shrink-0 items-center gap-1.5">
                {#if readable}
                    <button type="button" class="rounded-full p-1 transition-colors hover:bg-onebank-page"
                            title={copied ? t('Copied', 'ສຳເນົາແລ້ວ') : t('Copy account number', 'ສຳເນົາເລກບັນຊີ')}
                            aria-label={t('Copy account number', 'ສຳເນົາເລກບັນຊີ')} onclick={copy}>
                        <Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} class="h-6 w-6 {copied ? 'text-green-600' : ''}"/>
                    </button>
                    <button type="button" class="rounded-full p-1 transition-colors hover:bg-onebank-page"
                            aria-label={revealed ? t('Hide account number', 'ເຊື່ອງເລກບັນຊີ') : t('Show account number', 'ສະແດງເລກບັນຊີ')}
                            onclick={() => (revealed = !revealed)}>
                        <Icon icon={revealed ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} class="h-6 w-6"/>
                    </button>
                {/if}
                <button type="button" class="rounded-full p-1 transition-colors hover:bg-onebank-page disabled:opacity-40"
                        aria-label={locked ? t('Unlock account', 'ປົດລັອກບັນຊີ') : t('Lock account', 'ລັອກບັນຊີ')}
                        title={locked ? t('Unlock account', 'ປົດລັອກບັນຊີ') : t('Lock account', 'ລັອກບັນຊີ')}
                        disabled={busy} onclick={() => onLockToggle(account)}>
                    <Icon icon={busy ? 'mdi:loading' : locked ? 'mdi:lock' : 'mdi:lock-open-variant-outline'}
                          class="h-6 w-6 {busy ? 'animate-spin' : locked ? 'text-onebank-red' : ''}"/>
                </button>
                <button type="button" class="rounded-full p-1 transition-colors hover:bg-onebank-page disabled:opacity-40"
                        aria-label={t('Remove account', 'ລຶບບັນຊີ')} title={t('Remove account', 'ລຶບບັນຊີ')}
                        disabled={busy} onclick={() => onRemove(account)}>
                    <Icon icon="mdi:close-circle-outline" class="h-6 w-6"/>
                </button>
            </div>
        </div>
        {#if aliasable && account.alias}<p class="text-sm text-onebank-subtle">{shown}</p>{/if}
        <p class="mt-1 truncate text-base">{account.name}</p>
        <p class="mt-1 text-base tabular-nums">{money(account.availablebalance, account.ccy)}</p>

        <div class="mt-4 flex flex-wrap items-center gap-3">
            {#if aliasable}
                <div class="flex h-11.5 min-w-0 flex-1 basis-56 items-center gap-3 rounded-ob-sm border border-black px-4">
                    <span class="shrink-0 text-base">{t('Alias', 'ຊື່ເອີ້ນບັນຊີ')}</span>
                    {#if editingAlias}
                        <input type="text" bind:value={aliasDraft} maxlength="50" disabled={savingAlias}
                               placeholder={t('Enter alias', 'ປ້ອນຊື່ເອີ້ນ')} aria-label={t('Alias', 'ຊື່ເອີ້ນບັນຊີ')}
                               onkeydown={(event) => { if (event.key === 'Enter') void saveAlias(); if (event.key === 'Escape') editingAlias = false; }}
                               class="min-w-0 flex-1 border-0 p-0 text-base text-accent focus:ring-0"/>
                        <button type="button" aria-label={t('Save', 'ບັນທຶກ')} disabled={savingAlias} onclick={saveAlias}>
                            <Icon icon={savingAlias ? 'mdi:loading' : 'mdi:check'} class="h-5 w-5 text-green-600 {savingAlias ? 'animate-spin' : ''}"/>
                        </button>
                        <button type="button" aria-label={t('Cancel', 'ຍົກເລີກ')} disabled={savingAlias} onclick={() => (editingAlias = false)}>
                            <Icon icon="mdi:close" class="h-5 w-5"/>
                        </button>
                    {:else}
                        <button type="button" class="min-w-0 flex-1 truncate text-left text-base {account.alias ? 'text-accent' : 'text-onebank-muted'}"
                                aria-label={account.alias ? t('Edit alias', 'ແກ້ໄຂຊື່ເອີ້ນ') : t('Add alias', 'ເພີ່ມຊື່ເອີ້ນ')}
                                onclick={startEditing}>
                            {account.alias || t('Not set yet', 'ຍັງບໍ່ໄດ້ຕັ້ງຊື່')}
                        </button>
                    {/if}
                </div>
            {/if}
            <span class="inline-flex h-8.5 w-25 items-center justify-center rounded-full text-base text-white"
                  style="background-color: {CCY_COLOR[account.ccy] ?? '#9d9fa3'}">{account.ccy}</span>
            <span class="inline-flex h-8.5 items-center justify-center rounded-full px-5 text-base
                         {account.type === 'VIRTUAL' ? 'bg-onebank-blue text-white' : 'bg-onebank-light-grey-2 text-black'}">
                {t(typeLabel[0], typeLabel[1])}
            </span>
            {#if locked}
                <span class="inline-flex h-8.5 items-center gap-1 rounded-full bg-red-100 px-4 text-sm font-medium text-red-700">
                    <Icon icon="mdi:lock" class="h-4 w-4"/>{t('Locked', 'ລັອກ')}
                </span>
            {/if}
        </div>
    </div>
</article>
