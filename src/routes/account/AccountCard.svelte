<script lang="ts">
    /**
     * One account in the group: balance, badges, and what can be done to it.
     *
     * From onebank-ui `ACCOUNT/components/web/WebHome.svelte`, which renders
     * this inline. Two things are collapsed on the way over: its alias block
     * appears twice in near-identical branches (the second only disables the
     * save button on an empty value), and its account-number reveal is
     * suppressed for accounts whose name contains "Onecash" — kept, since the
     * core has no other flag for that.
     */
    import Icon from '@iconify/svelte';
    import {maskAccount, t} from '../../lib/utils/helper';
    import type {Account} from '../../definition';

    let {
        account,
        busy = false,
        onLockToggle,
        onRemove,
        onAliasSave,
    }: {
        account: Account
        /** A request for this account is in flight; its menu actions are inert. */
        busy?: boolean
        onLockToggle: (account: Account) => void
        onRemove: (account: Account) => void
        onAliasSave: (account: Account, alias: string) => Promise<boolean>
    } = $props();

    const CCY_SYMBOL: Record<string, string> = {LAK: '₭', USD: '$', THB: '฿', CNY: '¥'};
    const CCY_BADGE: Record<string, string> = {
        LAK: 'bg-red-100 text-red-700',
        USD: 'bg-green-100 text-green-700',
        THB: 'bg-purple-100 text-purple-700',
        CNY: 'bg-yellow-100 text-yellow-700',
    };

    let revealed = $state(false);
    let menuOpen = $state(false);
    let editingAlias = $state(false);
    let aliasDraft = $state('');
    let savingAlias = $state(false);
    let copied = $state(false);

    const locked = $derived(account.status === 'LOCKED');
    // Only these two carry an alias; a real account is named by the core.
    const aliasable = $derived(account.type === 'SHADOW' || account.type === 'VIRTUAL');
    const shown = $derived(revealed ? account.account : maskAccount(account.account));
    // Onecash accounts are not the user's to read out; mobile hides the number
    // and the copy button for them.
    const readable = $derived(!(account.name ?? '').includes('Onecash'));

    function money(value: number | undefined): string {
        return (value ?? 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }

    async function copy() {
        try {
            await navigator.clipboard.writeText(account.account);
            copied = true;
            setTimeout(() => (copied = false), 1500);
        } catch {
            // A denied clipboard permission is not worth an error state; the
            // number is on screen and can be selected.
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

<div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-gray-300 hover:shadow">
    <div class="mb-4 flex items-start justify-between gap-2">
        <div class="flex min-w-0 items-center gap-3">
            <img src="img/ic_no_face.svg" class="h-12 w-12 flex-shrink-0 rounded-md" alt=""/>
            <div class="min-w-0">
                <h4 class="mb-0.5 truncate text-lg font-semibold text-gray-900">{shown}</h4>
                <p class="truncate text-sm text-gray-600">{account.name}</p>
            </div>
        </div>

        <div class="flex flex-shrink-0 items-center gap-1">
            {#if readable}
                <button
                        class="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                        title={copied ? t('Copied', 'ສຳເນົາແລ້ວ') : t('Copy account number', 'ສຳເນົາເລກບັນຊີ')}
                        aria-label={t('Copy account number', 'ສຳເນົາເລກບັນຊີ')}
                        onclick={copy}
                >
                    <Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} class="h-4 w-4 {copied ? 'text-green-600' : 'text-gray-600'}" width={16} height={16}/>
                </button>
                <button
                        class="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                        title={revealed ? t('Hide account number', 'ເຊື່ອງເລກບັນຊີ') : t('Show account number', 'ສະແດງເລກບັນຊີ')}
                        aria-label={revealed ? t('Hide account number', 'ເຊື່ອງເລກບັນຊີ') : t('Show account number', 'ສະແດງເລກບັນຊີ')}
                        onclick={() => (revealed = !revealed)}
                >
                    <Icon icon={revealed ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} class="h-4 w-4 text-gray-500" width={16} height={16}/>
                </button>
            {/if}

            <div class="relative">
                <button
                        class="rounded-lg p-1.5 transition-colors hover:bg-gray-100"
                        title={t('More actions', 'ການດຳເນີນການເພີ່ມເຕີມ')}
                        aria-label={t('More actions', 'ການດຳເນີນການເພີ່ມເຕີມ')}
                        aria-haspopup="true"
                        aria-expanded={menuOpen}
                        onclick={() => (menuOpen = !menuOpen)}
                >
                    <Icon icon="mdi:dots-vertical" class="h-4 w-4 text-gray-600" width={16} height={16}/>
                </button>

                {#if menuOpen}
                    <button
                            type="button"
                            class="fixed inset-0 z-10 cursor-default"
                            aria-label={t('Close menu', 'ປິດເມນູ')}
                            onclick={() => (menuOpen = false)}
                    ></button>
                    <div class="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg" role="menu">
                        <button
                                class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                role="menuitem"
                                disabled={busy}
                                onclick={() => { menuOpen = false; onLockToggle(account) }}
                        >
                            <Icon
                                    icon={busy ? 'mdi:loading' : locked ? 'mdi:lock-open-outline' : 'mdi:lock-outline'}
                                    class="h-4 w-4 {busy ? 'animate-spin text-gray-500' : locked ? 'text-green-500' : 'text-orange-500'}"
                                    width={16}
                                    height={16}
                            />
                            {locked ? t('Unlock account', 'ປົດລ໋ອກບັນຊີ') : t('Lock account', 'ລ໋ອກບັນຊີ')}
                        </button>
                        <div class="my-1 border-t border-gray-100"></div>
                        <button
                                class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                                role="menuitem"
                                disabled={busy}
                                onclick={() => { menuOpen = false; onRemove(account) }}
                        >
                            <Icon icon="mdi:delete-outline" class="h-4 w-4" width={16} height={16}/>
                            {t('Remove account', 'ລົບບັນຊີ')}
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </div>

    <div class="mb-4 rounded-lg bg-gray-50 px-4 py-3">
        <p class="mb-0.5 text-xs text-gray-500">{t('Available Balance', 'ຍອດເງິນທີ່ໃຊ້ໄດ້')}</p>
        <p class="truncate text-xl font-bold text-gray-900">
            {money((account as any).availablebalance)}
            {CCY_SYMBOL[account.ccy] ?? account.ccy}
        </p>
        <div class="mt-2 flex flex-wrap gap-2">
            <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium {CCY_BADGE[account.ccy] ?? 'bg-gray-200 text-black'}">
                {account.ccy}
            </span>
            <span class="inline-flex items-center rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-black">{account.type}</span>
            <span
                    class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium {locked
                        ? 'border-red-200 bg-red-100 text-red-700'
                        : 'border-green-200 bg-green-100 text-green-700'}"
            >
                <Icon icon={locked ? 'mdi:lock' : 'mdi:check-circle'} class="mr-1 h-3 w-3" width={12} height={12}/>
                {account.status}
            </span>
        </div>
    </div>

    {#if aliasable}
        <div class="flex items-center justify-between gap-2 rounded-lg border border-gray-200 p-3">
            <span class="flex items-center gap-2 text-sm font-medium">
                <Icon icon="mdi:tag-outline" class="h-4 w-4" width={16} height={16}/>
                {t('Alias', 'ຊື່ເອີ້ນບັນຊີ')}
            </span>

            {#if editingAlias}
                <div class="flex items-center gap-2">
                    <input
                            type="text"
                            bind:value={aliasDraft}
                            maxlength="50"
                            disabled={savingAlias}
                            placeholder={t('Enter alias', 'ປ້ອນຊື່ເອີ້ນ')}
                            aria-label={t('Alias', 'ຊື່ເອີ້ນບັນຊີ')}
                            class="rounded border border-gray-300 bg-white px-2 py-1 text-sm focus:border-onebank-red focus:outline-none focus:ring-1 focus:ring-onebank-red"
                    />
                    <button
                            type="button"
                            class="rounded p-1 text-green-600 hover:bg-green-100 disabled:opacity-50"
                            title={t('Save', 'ບັນທຶກ')}
                            aria-label={t('Save', 'ບັນທຶກ')}
                            disabled={savingAlias}
                            onclick={saveAlias}
                    >
                        <Icon icon={savingAlias ? 'mdi:loading' : 'mdi:check'} class="h-4 w-4 {savingAlias ? 'animate-spin' : ''}" width={16} height={16}/>
                    </button>
                    <button
                            type="button"
                            class="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            title={t('Cancel', 'ຍົກເລີກ')}
                            aria-label={t('Cancel', 'ຍົກເລີກ')}
                            disabled={savingAlias}
                            onclick={() => (editingAlias = false)}
                    >
                        <Icon icon="mdi:close" class="h-4 w-4" width={16} height={16}/>
                    </button>
                </div>
            {:else if account.alias}
                <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-accent">{account.alias}</span>
                    <button type="button" class="rounded p-1 hover:bg-gray-100" title={t('Edit alias', 'ແກ້ໄຂຊື່ເອີ້ນ')} aria-label={t('Edit alias', 'ແກ້ໄຂຊື່ເອີ້ນ')} onclick={startEditing}>
                        <Icon icon="mdi:pencil" class="h-3 w-3" width={12} height={12}/>
                    </button>
                </div>
            {:else}
                <button type="button" class="flex items-center gap-1 rounded text-sm font-medium text-accent hover:bg-gray-100" onclick={startEditing}>
                    <Icon icon="mdi:plus" class="h-3 w-3" width={12} height={12}/>
                    {t('Add alias', 'ເພີ່ມຊື່ເອີ້ນ')}
                </button>
            {/if}
        </div>
    {/if}
</div>
