<script lang="ts">
    /**
     * The group's accounts: what it holds, and what can be done to each.
     *
     * Harvested from onebank-ui `pages/ACCOUNT` — `StepHome` + its `WebHome`
     * arm, plus the add-existing and open-new steps. Differences:
     *
     * - onebank-ui's `App.svelte` fetches `loadhome` on mount for the account
     *   list. That payload is already in `loadHomeResult` here, so the list
     *   reads the store and only refetches after something changes it.
     * - Every mutation there ends in `closePopupWithResult({})`, which closes
     *   the page: the user is thrown back to home for locking an account. Here
     *   the list reloads in place and says what happened.
     * - Its `ADDACCOUNTCOMPLETE` step is a full screen whose only job is to say
     *   "done". A banner over the refreshed list carries the same news without
     *   costing a navigation.
     * - Its account-detail step is mobile-only (`MobileAccountDetail`); the
     *   desktop arm folds those actions into the card, so nothing is lost.
     */
    import Icon from '@iconify/svelte';
    import AccountCard from './account/AccountCard.svelte';
    import AddExistingAccount from './account/AddExistingAccount.svelte';
    import ConfirmDialog from './account/ConfirmDialog.svelte';
    import OpenNewAccount from './account/OpenNewAccount.svelte';
    import {changeAccountAlias, changeAccountStatus, changeAccounts, getAvailableAccounts, loadHome} from '../lib/api/commands';
    import {t} from '../lib/utils/helper';
    import {adoptLoadHomeResult, currentGroup, loadHomeResult} from '../stores/onebankGroups';
    import type {Account} from '../definition';

    type Panel = {kind: 'list'} | {kind: 'add-existing'} | {kind: 'open-new'; accountType: 'VIRTUAL' | 'SHADOW'};

    let panel = $state<Panel>({kind: 'list'});
    let loading = $state(false);
    let error = $state('');
    let notice = $state('');
    /** Account ids with a request in flight, so only that card goes inert. */
    let busy = $state<string[]>([]);
    let available = $state<string[]>([]);

    /** The account a dialog is asking about, and which question it asked. */
    let confirming = $state<{account: Account; action: 'lock' | 'remove'} | null>(null);
    let confirmBusy = $state(false);

    const accounts = $derived($loadHomeResult?.accounts ?? []);

    async function refresh(group: string) {
        if (!group) return;
        loading = true;
        error = '';
        try {
            const response = await loadHome(group);
            if (response?.result === 0) adoptLoadHomeResult(response as any);
            else error = response?.message || t('Could not load the accounts', 'ໂຫຼດບັນຊີບໍ່ໄດ້');
        } catch (e) {
            error = (e as Error)?.message || t('Could not load the accounts', 'ໂຫຼດບັນຊີບໍ່ໄດ້');
        } finally {
            loading = false;
        }
    }

    async function loadAvailable(group: string) {
        if (!group) return;
        try {
            const response = await getAvailableAccounts(group);
            available = response?.accounts ?? [];
        } catch {
            // Only the add-from-personal list depends on this; an empty list
            // reads as "nothing to add", which is the safe direction.
            available = [];
        }
    }

    // The list is whatever `loadhome` last returned, so a group switch only has
    // to reload when the store has nothing for the new group.
    $effect(() => {
        const group = $currentGroup;
        if (!group) return;
        if (!$loadHomeResult) void refresh(group);
        void loadAvailable(group);
    });

    function markBusy(accountid: string, value: boolean) {
        busy = value ? [...busy, accountid] : busy.filter((id) => id !== accountid);
    }

    /** Reloads both lists after a change; adding one removes it from the other. */
    async function afterChange(message: string) {
        notice = message;
        panel = {kind: 'list'};
        await Promise.all([refresh($currentGroup), loadAvailable($currentGroup)]);
    }

    async function saveAlias(account: Account, alias: string): Promise<boolean> {
        markBusy(account.accountid, true);
        error = '';
        try {
            const response = await changeAccountAlias(account.accountid, alias);
            if (response?.result === 0) {
                await refresh($currentGroup);
                return true;
            }
            error = response?.message || t('Could not save the alias', 'ບັນທຶກຊື່ເອີ້ນບໍ່ໄດ້');
            return false;
        } catch (e) {
            error = (e as Error)?.message || t('Could not save the alias', 'ບັນທຶກຊື່ເອີ້ນບໍ່ໄດ້');
            return false;
        } finally {
            markBusy(account.accountid, false);
        }
    }

    async function confirmed() {
        if (!confirming) return;
        const {account, action} = confirming;
        confirmBusy = true;
        error = '';
        try {
            if (action === 'lock') {
                const status = account.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
                const response = await changeAccountStatus([{accountid: account.accountid, status}]);
                if (response?.result === 0) {
                    confirming = null;
                    await afterChange(t('Account status changed', 'ປ່ຽນສະຖານະບັນຊີແລ້ວ'));
                } else {
                    error = response?.message || t('Could not change the account status', 'ປ່ຽນສະຖານະບໍ່ໄດ້');
                }
            } else {
                const response = await changeAccounts([{accountid: account.accountid, action: 'remove'}]);
                if (response?.result === 0) {
                    confirming = null;
                    await afterChange(t('Account removed', 'ລຶບບັນຊີແລ້ວ'));
                } else {
                    error = response?.message || t('Could not remove the account', 'ລຶບບັນຊີບໍ່ໄດ້');
                }
            }
        } catch (e) {
            error = (e as Error)?.message || t('Something went wrong', 'ມີບາງຢ່າງຜິດພາດ');
        } finally {
            confirmBusy = false;
        }
    }

    /** Closing a SHADOW or VIRTUAL account is permanent; removing is not. */
    const permanent = $derived(['SHADOW', 'VIRTUAL'].includes(confirming?.account.type ?? ''));

    const dialogTitle = $derived(
        !confirming
            ? ''
            : confirming.action === 'lock'
              ? confirming.account.status === 'LOCKED'
                  ? t('Do you want to unlock this account?', 'ທ່ານຕ້ອງການປົດລັອກບັນຊີນີ້ແທ້ບໍ່?')
                  : t('Do you want to lock this account?', 'ທ່ານຕ້ອງການລັອກບັນຊີນີ້ແທ້ບໍ່?')
              : permanent
                ? t('Do you want to permanently close the account?', 'ທ່ານຕ້ອງການປິດບັນຊີຖາວອນແທ້ບໍ່?')
                : t('Do you want to remove the account?', 'ທ່ານຕ້ອງການລຶບບັນຊີແທ້ບໍ່?'),
    );

    const dialogContent = $derived(
        !confirming || confirming.action === 'lock'
            ? ''
            : permanent
              ? t(
                    'Closing the account permanently will make it unusable forever.',
                    'ການປິດບັນຊີຖາວອນ ຈະເຮັດໃຫ້ບັນຊີນີ້ບໍ່ສາມາດໃຊ້ງານໄດ້ອີກຕະຫຼອດໄປ',
                )
              : t('Removing this account will take it out of this group.', 'ການລຶບບັນຊີນີ້ຈະເອົາອອກຈາກກຸ່ມນີ້'),
    );
</script>

<div class="h-full w-full overflow-y-auto p-4 tablet:p-6 desktop:p-8">
    <div class="mx-auto max-w-5xl space-y-4">
        {#if error}
            <div class="flex items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <span>{error}</span>
                <button class="underline" onclick={() => refresh($currentGroup)}>{t('Retry', 'ລອງໃໝ່')}</button>
            </div>
        {/if}

        {#if notice}
            <div class="flex items-center justify-between gap-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                <span class="flex items-center gap-2">
                    <Icon icon="mdi:check-circle" width={16} height={16}/>
                    {notice}
                </span>
                <button class="underline" onclick={() => (notice = '')}>{t('Dismiss', 'ປິດ')}</button>
            </div>
        {/if}

        {#if panel.kind === 'add-existing'}
            <AddExistingAccount
                    {available}
                    onDone={() => afterChange(t('Accounts added', 'ເພີ່ມບັນຊີແລ້ວ'))}
                    onCancel={() => (panel = {kind: 'list'})}
            />
        {:else if panel.kind === 'open-new'}
            <OpenNewAccount
                    accountType={panel.accountType}
                    onDone={() => afterChange(t('Account opened', 'ເປີດບັນຊີແລ້ວ'))}
                    onCancel={() => (panel = {kind: 'list'})}
            />
        {:else}
            <h1 class="text-xl font-semibold text-gray-800">{t('Accounts', 'ບັນຊີທີ່ຈະໃຊ້ເບິ່ງ ຫລື ເຄື່ອນໄຫວ')}</h1>

            {#if loading && accounts.length === 0}
                <div class="grid grid-cols-1 gap-4 tablet:grid-cols-2" aria-busy="true">
                    {#each Array(2) as _, i (i)}
                        <div class="h-56 animate-pulse rounded-xl bg-gray-100"></div>
                    {/each}
                </div>
            {:else if accounts.length === 0}
                <div class="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
                    {t('This group holds no account yet.', 'ກຸ່ມນີ້ຍັງບໍ່ມີບັນຊີ')}
                </div>
            {:else}
                <div class="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                    {#each accounts as account (account.accountid)}
                        <AccountCard
                                {account}
                                busy={busy.includes(account.accountid)}
                                onLockToggle={(target) => (confirming = {account: target, action: 'lock'})}
                                onRemove={(target) => (confirming = {account: target, action: 'remove'})}
                                onAliasSave={saveAlias}
                        />
                    {/each}
                </div>
            {/if}

            <div class="flex flex-col gap-3 border-t border-gray-200 pt-4 tablet:flex-row">
                <button class="onebank-secondary-btn" onclick={() => (panel = {kind: 'open-new', accountType: 'VIRTUAL'})}>
                    <Icon icon="mdi:plus" class="mr-2 h-4 w-4" width={16} height={16}/>
                    {t('Add Virtual Account', 'ເພີ່ມບັນຊີຫລັກ')}
                </button>
                <button class="onebank-secondary-btn" onclick={() => (panel = {kind: 'open-new', accountType: 'SHADOW'})}>
                    <Icon icon="mdi:plus" class="mr-2 h-4 w-4" width={16} height={16}/>
                    {t('Add Shadow Account', 'ເພີ່ມບັນຊີເງົາ')}
                </button>
                <button class="onebank-secondary-btn" onclick={() => (panel = {kind: 'add-existing'})}>
                    <Icon icon="mdi:plus" class="mr-2 h-4 w-4" width={16} height={16}/>
                    {t('Add from personal account', 'ເພີ່ມບັນຊີ ຈາກບັນຊີສ່ວນຕົວ')}
                </button>
            </div>
        {/if}
    </div>
</div>

<ConfirmDialog
        open={confirming !== null}
        title={dialogTitle}
        content={dialogContent}
        confirmLabel={t('Confirm', 'ຢືນຢັນ')}
        danger={confirming?.action === 'remove'}
        busy={confirmBusy}
        onConfirm={confirmed}
        onCancel={() => (confirming = null)}
/>
