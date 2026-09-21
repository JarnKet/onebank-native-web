<script lang="ts">
    /**
     * "Add from a personal account": pick any of your own accounts the group
     * does not hold yet, then add them in one batch.
     */
    import Icon from '@iconify/svelte';
    import SelectableAccount from '../../lib/components/SelectableAccount.svelte';
    import {changeAccounts} from '../../lib/api/commands';
    import {t} from '../../lib/utils/helper';
    import {cards, withAvailableAccounts} from './cards';

    let {
        available,
        onDone,
        onCancel,
    }: {
        available: string[]
        onDone: () => void
        onCancel: () => void
    } = $props();

    let selected = $state<string[]>([]);
    let saving = $state(false);
    let error = $state('');

    const offered = $derived(withAvailableAccounts($cards, available).flatMap((card) => card.accounts));

    function toggle(accountid: string) {
        selected = selected.includes(accountid) ? selected.filter((id) => id !== accountid) : [...selected, accountid];
    }

    async function save() {
        if (selected.length === 0) {
            error = t('You need to select at least one account', 'ທ່ານຕ້ອງເລືອກຢ່າງໜ້ອຍໜຶ່ງບັນຊີ');
            return;
        }
        saving = true;
        error = '';
        try {
            const response = await changeAccounts(selected.map((accountid) => ({accountid, action: 'add' as const})));
            if (response?.result === 0) onDone();
            else error = response?.message || t('Could not add those accounts', 'ເພີ່ມບັນຊີບໍ່ໄດ້');
        } catch (e) {
            error = (e as Error)?.message || t('Could not add those accounts', 'ເພີ່ມບັນຊີບໍ່ໄດ້');
        } finally {
            saving = false;
        }
    }
</script>

<div class="space-y-5">
    <div class="flex items-center gap-2">
        <button type="button" class="rounded-full p-1 hover:bg-white" onclick={onCancel} aria-label={t('Back', 'ກັບຄືນ')}>
            <Icon icon="mdi:arrow-left" class="h-6 w-6"/>
        </button>
        <h2 class="text-2xl font-semibold">{t('Add from a personal account', 'ເພີ່ມບັນຊີຈາກບັນຊີສ່ວນຕົວ')}</h2>
    </div>

    {#if error}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}

    {#if offered.length === 0}
        <div class="ob-card p-8 text-center text-onebank-subtle">
            {t('Every account you hold is already in this group.', 'ບັນຊີທັງໝົດຂອງທ່ານຢູ່ໃນກຸ່ມນີ້ແລ້ວ')}
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-3 tablet:grid-cols-2 desktop:grid-cols-3">
            {#each offered as account (account.accountid)}
                <SelectableAccount {account} selected={selected.includes(account.accountid)} onToggle={() => toggle(account.accountid)}/>
            {/each}
        </div>
        <div class="flex justify-center pt-4">
            <button type="button" class="onebank-primary-btn tablet:w-60" onclick={save} disabled={saving || selected.length === 0}>
                {saving ? t('Saving…', 'ກຳລັງບັນທຶກ…') : t('Add account', 'ເພີ່ມບັນຊີ')}
            </button>
        </div>
    {/if}
</div>
