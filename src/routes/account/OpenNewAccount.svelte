<script lang="ts">
    /**
     * Opening a virtual or shadow account against one the user already holds.
     *
     * From onebank-ui `ACCOUNT/components/web/WebOpenNewAccount.svelte`. Its
     * source list is every account on the user's cards — not the group's, and
     * not filtered by `getavailableaccounts`, since the new account is opened
     * against a personal one whether or not the group holds it.
     */
    import Icon from '@iconify/svelte';
    import {openNewAccount} from '../../lib/api/commands';
    import {maskAccount, t} from '../../lib/utils/helper';
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

    const CCY_BADGE: Record<string, string> = {
        LAK: 'bg-red-100 text-red-700',
        USD: 'bg-green-100 text-green-700',
        THB: 'bg-purple-100 text-purple-700',
        CNY: 'bg-yellow-100 text-yellow-700',
    };

    let selected = $state('');
    let alias = $state('');
    let saving = $state(false);
    let error = $state('');

    const title = $derived(
        accountType === 'SHADOW' ? t('Add Shadow Account', 'ເພີ່ມບັນຊີເງົາ') : t('Add Virtual Account', 'ເພີ່ມບັນຊີຫຼັກ'),
    );

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

<div class="space-y-4">
    <div class="flex items-center gap-2">
        <button class="rounded-lg p-1 hover:bg-gray-100" onclick={onCancel} aria-label={t('Back', 'ກັບຄືນ')}>
            <Icon icon="mdi:arrow-left" width={20} height={20}/>
        </button>
        <h2 class="text-lg font-semibold text-gray-800">{title}</h2>
    </div>

    {#if error}
        <div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
    {/if}

    {#if $cards.length === 0}
        <div class="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            {t('You have no account to open this against.', 'ທ່ານບໍ່ມີບັນຊີສຳລັບເປີດບັນຊີນີ້')}
        </div>
    {:else}
        <div class="space-y-4">
            <div class="text-sm font-medium text-gray-700">{t('Open against', 'ເປີດຈາກບັນຊີ')}</div>
            {#each $cards as card (card.cardid)}
                <div class="overflow-hidden rounded-lg border border-gray-200 bg-white">
                    <div class="flex min-h-[60px] items-center gap-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white p-4">
                        <img src="img/{card.filename}" alt="" class="h-12 w-auto rounded-md"/>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">{card.cardtype}</h3>
                            <p class="text-sm text-gray-600">{card.cardnumber}</p>
                        </div>
                    </div>
                    <div class="grid grid-cols-1 gap-3 p-4 tablet:grid-cols-2">
                        {#each card.accounts as account (account.accountid)}
                            <label class="cursor-pointer">
                                <input
                                        type="radio"
                                        class="peer sr-only"
                                        name="source-account"
                                        value={account.accountid}
                                        checked={selected === account.accountid}
                                        onchange={() => (selected = account.accountid)}
                                />
                                <div
                                        class="rounded-xl border border-gray-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-lg peer-checked:border-onebank-red peer-checked:bg-red-50 peer-checked:shadow-lg"
                                >
                                    <div class="flex items-start justify-between gap-2">
                                        <div class="min-w-0">
                                            <div class="truncate text-sm font-semibold text-gray-900">{maskAccount(account.account)}</div>
                                            <div class="truncate text-xs text-gray-600">{account.name}</div>
                                        </div>
                                        <span class="inline-flex flex-shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium {CCY_BADGE[account.ccy] ?? 'bg-gray-200 text-black'}">
                                            {account.ccy}
                                        </span>
                                    </div>
                                </div>
                            </label>
                        {/each}
                    </div>
                </div>
            {/each}

            <div class="space-y-2">
                <label for="newAccountAlias" class="text-sm font-medium text-gray-700">{t('Alias', 'ຊື່ເອີ້ນບັນຊີ')}</label>
                <input
                        id="newAccountAlias"
                        type="text"
                        bind:value={alias}
                        maxlength="50"
                        placeholder={t('Enter alias', 'ປ້ອນຊື່ເອີ້ນ')}
                        class="w-full rounded-xl border border-gray-300 px-4 py-3 text-base shadow-sm placeholder:text-gray-400 focus:border-onebank-red focus:ring-2 focus:ring-onebank-red"
                />
            </div>

            <div class="flex justify-end gap-3 border-t border-gray-200 pt-4">
                <button type="button" class="onebank-secondary-btn" onclick={onCancel} disabled={saving}>{t('Cancel', 'ຍົກເລີກ')}</button>
                <button type="button" class="onebank-primary-btn" onclick={open} disabled={saving || !selected}>
                    {saving ? t('Opening…', 'ກຳລັງເປີດ…') : t('Open account', 'ເປີດບັນຊີ')}
                </button>
            </div>
        </div>
    {/if}
</div>
