<script lang="ts">
    /**
     * Adding accounts the user already holds to this group.
     *
     * From onebank-ui `ACCOUNT/components/web/WebAddExistingAccount.svelte` and
     * the `StepAddExistingAccount` around it. The list is the user's cards
     * filtered to `getavailableaccounts` — the accounts the group could still
     * be given — and saving is one `changeaccounts` batch.
     *
     * onebank-ui seeds its checkbox group with a literal `'view-only'`, a
     * leftover that matches no account and quietly rides along in the bound
     * array; dropped here.
     */
    import Icon from '@iconify/svelte';
    import {changeAccounts} from '../../lib/api/commands';
    import {maskAccount, t} from '../../lib/utils/helper';
    import {cards, withAvailableAccounts} from './cards';

    let {
        available,
        onDone,
        onCancel,
    }: {
        /** Account ids the group may be given, from `getavailableaccounts`. */
        available: string[]
        /** Saved successfully; the list reloads. */
        onDone: () => void
        onCancel: () => void
    } = $props();

    const CCY_BADGE: Record<string, string> = {
        LAK: 'bg-red-100 text-red-700',
        USD: 'bg-green-100 text-green-700',
        THB: 'bg-purple-100 text-purple-700',
        CNY: 'bg-yellow-100 text-yellow-700',
    };

    let selected = $state<string[]>([]);
    let saving = $state(false);
    let error = $state('');

    const offered = $derived(withAvailableAccounts($cards, available));

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

<div class="space-y-4">
    <div class="flex items-center gap-2">
        <button class="rounded-lg p-1 hover:bg-gray-100" onclick={onCancel} aria-label={t('Back', 'ກັບຄືນ')}>
            <Icon icon="mdi:arrow-left" width={20} height={20}/>
        </button>
        <h2 class="text-lg font-semibold text-gray-800">{t('Add from personal account', 'ເພີ່ມບັນຊີ ຈາກບັນຊີສ່ວນຕົວ')}</h2>
    </div>

    {#if error}
        <div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
    {/if}

    {#if offered.length === 0}
        <div class="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
            {t('Every account you hold is already in this group.', 'ບັນຊີທັງໝົດຂອງທ່ານຢູ່ໃນກຸ່ມນີ້ແລ້ວ')}
        </div>
    {:else}
        {#each offered as card (card.cardid)}
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
                                    type="checkbox"
                                    class="peer sr-only"
                                    checked={selected.includes(account.accountid)}
                                    onchange={() => toggle(account.accountid)}
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

        <div class="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button type="button" class="onebank-secondary-btn" onclick={onCancel} disabled={saving}>{t('Cancel', 'ຍົກເລີກ')}</button>
            <button type="button" class="onebank-primary-btn" onclick={save} disabled={saving || selected.length === 0}>
                {saving ? t('Saving…', 'ກຳລັງບັນທຶກ…') : t('Save', 'ບັນທຶກ')}
            </button>
        </div>
    {/if}
</div>
