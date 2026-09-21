<script lang="ts">
    /**
     * Opening a main (virtual) or shadow account against one of the user's real
     * accounts: pick the source, optionally name it, confirm.
     */
    import Icon from '@iconify/svelte';
    import SelectableAccount from '../../lib/components/SelectableAccount.svelte';
    import {openNewAccount} from '../../lib/api/commands';
    import {t} from '../../lib/utils/helper';
    import {cards} from './cards';

    let {
        accountType,
        onDone,
        onCancel,
    }: {
        accountType: 'VIRTUAL' | 'SHADOW'
        onDone: () => void
        onCancel: () => void
    } = $props();

    let selected = $state('');
    let alias = $state('');
    let saving = $state(false);
    let error = $state('');

    const title = $derived(accountType === 'SHADOW' ? t('Add shadow account', 'ເພີ່ມບັນຊີເງົາ') : t('Add main account', 'ເພີ່ມບັນຊີຫຼັກ'));
    const accounts = $derived($cards.flatMap((card) => card.accounts));

    async function open() {
        if (!selected) {
            error = t('Please select an account', 'ກະລຸນາເລືອກບັນຊີ');
            return;
        }
        saving = true;
        error = '';
        try {
            const response = await openNewAccount({accountType, accountid: selected, alias});
            if (response?.result === 0) onDone();
            else error = response?.message || t('Could not open the account', 'ເປີດບັນຊີບໍ່ໄດ້');
        } catch (e) {
            error = (e as Error)?.message || t('Could not open the account', 'ເປີດບັນຊີບໍ່ໄດ້');
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
        <h2 class="text-2xl font-semibold">{title}</h2>
    </div>

    {#if error}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}

    {#if accounts.length === 0}
        <div class="ob-card p-8 text-center text-onebank-subtle">
            {t('You have no account to open this against.', 'ທ່ານບໍ່ມີບັນຊີສຳລັບເປີດບັນຊີນີ້')}
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-3 tablet:grid-cols-2 desktop:grid-cols-3" role="radiogroup" aria-label={t('Open against', 'ເປີດຈາກບັນຊີ')}>
            {#each accounts as account (account.accountid)}
                <SelectableAccount {account} multiple={false} name="source-account"
                                   selected={selected === account.accountid} onToggle={() => (selected = account.accountid)}/>
            {/each}
        </div>

        <div class="pt-4">
            <label for="newAccountAlias" class="mb-2 block text-xl">
                {t('Account alias', 'ຊື່ເອີ້ນບັນຊີ')} <span class="text-sm text-onebank-subtle">({t('optional', 'ບໍ່ບັງຄັບ')})</span>
            </label>
            <div class="relative">
                <input id="newAccountAlias" type="text" bind:value={alias} maxlength="50"
                       placeholder={t('A name that helps you recognise this account', 'ຊື່ເອີ້ນບັນຊີ ທີ່ຈະຊ່ວຍໃຫ້ທ່ານຈື່ຈຳໄດ້ງ່າຍ')}
                       class="ob-input pr-16 text-center"/>
                <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-onebank-muted">{alias.length}/50</span>
            </div>
        </div>

        <div class="flex justify-center pt-4">
            <button type="button" class="onebank-primary-btn tablet:w-60" onclick={open} disabled={saving || !selected}>
                {saving ? t('Opening…', 'ກຳລັງເປີດ…') : t('Add account', 'ເພີ່ມບັນຊີ')}
            </button>
        </div>
    {/if}
</div>
