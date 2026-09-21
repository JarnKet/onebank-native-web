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

    /** The three "add" buttons under the list (black in the Figma, navy-outlined here). */
    const addActions: Array<{label: string; panel: Panel}> = [
        {label: t('Add main account', 'ເພີ່ມບັນຊີຫຼັກ'), panel: {kind: 'open-new', accountType: 'VIRTUAL'}},
        {label: t('Add shadow account', 'ເພີ່ມບັນຊີເງົາ'), panel: {kind: 'open-new', accountType: 'SHADOW'}},
        {label: t('Add from a personal account', 'ເພີ່ມບັນຊີຈາກບັນຊີສ່ວນຕົວ'), panel: {kind: 'add-existing'}},
    ];

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

<div class="w-full">
    <div class="space-y-4">
        {#if error}
            <div class="flex items-center justify-between gap-3 rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">
                <span>{error}</span>
                <button class="underline" onclick={() => refresh($currentGroup)}>{t('Retry', 'ລອງໃໝ່')}</button>
            </div>
        {/if}

        {#if notice}
            <div class="flex items-center justify-between gap-3 rounded-ob-sm bg-green-50 p-3 text-sm text-green-700" role="status">
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
            <h1 class="text-2xl font-semibold">{t('Accounts for viewing or transacting', 'ບັນຊີທີ່ຈະໃຊ້ເບິ່ງ ຫຼື ເຄື່ອນໄຫວ')}</h1>

            {#if loading && accounts.length === 0}
                <div class="grid grid-cols-1 gap-3 desktop:grid-cols-2" aria-busy="true">
                    {#each Array(2) as _, i (i)}
                        <div class="h-44 animate-pulse rounded-ob-xl bg-white"></div>
                    {/each}
                </div>
            {:else if accounts.length === 0}
                <div class="ob-card p-8 text-center text-onebank-subtle">
                    {t('This group holds no account yet.', 'ກຸ່ມນີ້ຍັງບໍ່ມີບັນຊີ')}
                </div>
            {:else}
                <div class="grid grid-cols-1 gap-3 desktop:grid-cols-2">
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

            <div class="grid grid-cols-1 gap-4 pt-10 tablet:grid-cols-3 desktop:px-14">
                {#each addActions as action (action.label)}
                    <button type="button" class="flex h-15 items-center justify-center gap-3 rounded-ob-xl border-2 border-onebank-blue bg-white text-onebank-blue hover:bg-onebank-blue-soft px-4 text-xl font-bold transition-colors"
                            onclick={() => (panel = action.panel)}>
                        <Icon icon="mdi:plus-circle" class="h-6 w-6 shrink-0"/>
                        <span class="truncate">{action.label}</span>
                    </button>
                {/each}
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
