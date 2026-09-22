<script lang="ts">
    /**
     * Saved destination accounts: the same list the transfer form offers under
     * "saved" (`getrecipients`), so adding one here makes it available there
     * and vice versa. Add through a dialog, remove after a confirmation, star
     * the ones used most. Replaces IBANKDESTINATIONACCOUNT.
     */
    import Icon from '@iconify/svelte';
    import CcyBadge from '../../lib/components/CcyBadge.svelte';
    import ListToolbar from '../../lib/components/ListToolbar.svelte';
    import Modal from '../../lib/components/Modal.svelte';
    import {addRecipient, getRecipients, removeRecipient, toggleFavourite} from '../../lib/api/unmapped';
    import type {Recipient} from '../../lib/api/types';
    import {maskAccount, t} from '../../lib/utils/helper';
    import {currentGroup} from '../../stores/onebankGroups';

    const BANKS: Array<{id: string; name: string}> = [
        {id: 'BCEL', name: 'BCEL'},
        {id: 'LDB', name: 'Lao Development Bank'},
        {id: 'BFL', name: 'Banque Franco-Lao'},
        {id: 'ACLEDA', name: 'ACLEDA Bank Lao'},
        {id: 'JDB', name: 'Joint Development Bank'},
        {id: 'LVB', name: 'Lao-Viet Bank'},
        {id: 'APB', name: 'Agricultural Promotion Bank'},
        {id: 'SACOM', name: 'Sacombank Lao'},
    ];
    const bankName = (id: string) => BANKS.find((bank) => bank.id === id)?.name ?? id;

    let recipients = $state<Recipient[]>([]);
    let loading = $state(true);
    let error = $state('');
    let search = $state('');

    let adding = $state(false);
    let form = $state({name: '', account: '', ccy: 'LAK', bank: 'BCEL'});
    let formError = $state('');
    let saving = $state(false);

    let removing = $state<Recipient | null>(null);
    let removeBusy = $state(false);

    function load(group: string) {
        loading = true;
        error = '';
        getRecipients(group)
            .then((response) => {
                if (response?.result === 0) recipients = response.recipients ?? [];
                else error = response?.message || t('Could not load the saved accounts', 'ໂຫຼດບັນຊີທີ່ບັນທຶກໄວ້ບໍ່ໄດ້');
            })
            .catch((e) => (error = (e as Error)?.message || t('Could not load the saved accounts', 'ໂຫຼດບັນຊີທີ່ບັນທຶກໄວ້ບໍ່ໄດ້')))
            .finally(() => (loading = false));
    }

    $effect(() => {
        if ($currentGroup) load($currentGroup);
    });

    const shown = $derived.by(() => {
        const query = search.trim().toLowerCase();
        return [...recipients]
            .filter((recipient) => !query || `${recipient.name} ${recipient.account} ${bankName(recipient.bank)}`.toLowerCase().includes(query))
            .sort((a, b) => Number(b.favourite) - Number(a.favourite) || a.name.localeCompare(b.name));
    });

    function openAdd() {
        form = {name: '', account: '', ccy: 'LAK', bank: 'BCEL'};
        formError = '';
        adding = true;
    }

    async function save() {
        formError = '';
        saving = true;
        try {
            const response = await addRecipient({...form, account: form.account.replace(/\D/g, ''), name: form.name.trim()}, $currentGroup);
            if (response?.result !== 0) {
                formError = response?.message || t('Could not save the account', 'ບັນທຶກບັນຊີບໍ່ໄດ້');
                return;
            }
            adding = false;
            load($currentGroup);
        } catch (e) {
            formError = (e as Error)?.message || t('Could not save the account', 'ບັນທຶກບັນຊີບໍ່ໄດ້');
        } finally {
            saving = false;
        }
    }

    async function confirmRemove() {
        if (!removing) return;
        removeBusy = true;
        try {
            const response = await removeRecipient(removing.recipientid, $currentGroup);
            if (response?.result === 0) {
                recipients = recipients.filter((recipient) => recipient.recipientid !== removing?.recipientid);
                removing = null;
            } else error = response?.message || t('Could not remove the account', 'ລຶບບັນຊີບໍ່ໄດ້');
        } finally {
            removeBusy = false;
        }
    }

    async function star(recipient: Recipient) {
        const response = await toggleFavourite(recipient.recipientid, $currentGroup);
        if (response?.result === 0) recipient.favourite = !recipient.favourite;
    }
</script>

<div class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-lg font-semibold text-onebank-blue">{t('Destination accounts', 'ບັນຊີປາຍທາງ')}</h1>
        <button type="button" class="onebank-primary-btn h-11 gap-2 px-5" onclick={openAdd}>
            <Icon icon="mdi:plus" class="h-5 w-5"/>{t('Add account', 'ເພີ່ມບັນຊີ')}
        </button>
    </div>
    <ListToolbar bind:search showDate={false}/>
    {#if error}
        <div class="flex items-center justify-between gap-3 rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">
            <span>{error}</span>
            <button type="button" class="font-semibold underline" onclick={() => $currentGroup && load($currentGroup)}>{t('Retry', 'ລອງໃໝ່')}</button>
        </div>
    {/if}

    {#if loading && recipients.length === 0}
        <div class="grid gap-3 tablet:grid-cols-2">
            {#each [0, 1, 2, 3] as i (i)}<div class="h-20 animate-pulse rounded-ob-xl bg-white"></div>{/each}
        </div>
    {:else if shown.length === 0}
        <div class="ob-card p-8 text-center text-onebank-subtle">
            {#if search}
                {t('No saved account matches your search', 'ບໍ່ພົບບັນຊີທີ່ຄົ້ນຫາ')}
            {:else}
                <p>{t('No saved accounts yet. Accounts you transfer to are saved here, or add one now.', 'ຍັງບໍ່ມີບັນຊີທີ່ບັນທຶກໄວ້. ບັນຊີທີ່ທ່ານໂອນໄປຈະຖືກບັນທຶກໄວ້ທີ່ນີ້, ຫຼື ເພີ່ມໃໝ່ໄດ້ເລີຍ.')}</p>
                <button type="button" class="onebank-outline-btn mt-4 h-11 px-5" onclick={openAdd}>{t('Add account', 'ເພີ່ມບັນຊີ')}</button>
            {/if}
        </div>
    {:else}
        <ul class="grid gap-3 tablet:grid-cols-2">
            {#each shown as recipient (recipient.recipientid)}
                <li class="ob-card flex items-center gap-4 p-4">
                    <CcyBadge ccy={recipient.ccy}/>
                    <div class="min-w-0 flex-1">
                        <p class="truncate font-semibold">{recipient.name}</p>
                        <p class="truncate text-sm text-onebank-subtle tabular-nums">{maskAccount(recipient.account)} · {bankName(recipient.bank)}</p>
                    </div>
                    <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-onebank-page"
                            aria-pressed={recipient.favourite} aria-label={t(`Favourite ${recipient.name}`, `ບັນຊີໂປດ ${recipient.name}`)}
                            onclick={() => star(recipient)}>
                        <Icon icon={recipient.favourite ? 'mdi:star' : 'mdi:star-outline'} class="h-5 w-5 {recipient.favourite ? 'text-onebank-red' : 'text-onebank-muted'}"/>
                    </button>
                    <button type="button" class="flex h-9 w-9 items-center justify-center rounded-full text-onebank-muted hover:bg-onebank-pink hover:text-onebank-red"
                            aria-label={t(`Remove ${recipient.name}`, `ລຶບ ${recipient.name}`)} onclick={() => (removing = recipient)}>
                        <Icon icon="mdi:trash-can-outline" class="h-5 w-5"/>
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</div>

{#if adding}
    <Modal title={t('Add a destination account', 'ເພີ່ມບັນຊີປາຍທາງ')} onClose={() => (adding = false)}>
        <form id="add-recipient" class="space-y-4" onsubmit={(event) => { event.preventDefault(); void save(); }}>
            <label class="block"><span class="ob-label">{t('Bank', 'ທະນາຄານ')}</span>
                <select class="ob-input w-full" bind:value={form.bank}>
                    {#each BANKS as bank (bank.id)}<option value={bank.id}>{bank.name}</option>{/each}
                </select>
            </label>
            <label class="block"><span class="ob-label">{t('Account number', 'ເລກບັນຊີ')}</span>
                <input class="ob-input w-full tabular-nums" inputmode="numeric" autocomplete="off" required placeholder="0101200..." bind:value={form.account}/>
            </label>
            <label class="block"><span class="ob-label">{t('Name to show', 'ຊື່ທີ່ຈະສະແດງ')}</span>
                <input class="ob-input w-full" required bind:value={form.name}/>
            </label>
            <fieldset>
                <legend class="ob-label">{t('Currency', 'ສະກຸນເງິນ')}</legend>
                <div class="flex flex-wrap gap-2">
                    {#each ['LAK', 'USD', 'THB', 'CNY'] as ccy (ccy)}
                        <label class="flex cursor-pointer items-center gap-2 rounded-ob-sm border-2 px-3 py-2 text-sm {form.ccy === ccy ? 'border-onebank-red' : 'border-onebank-row'}">
                            <input type="radio" class="sr-only" name="ccy" value={ccy} bind:group={form.ccy}/>{ccy}
                        </label>
                    {/each}
                </div>
            </fieldset>
            {#if formError}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{formError}</div>{/if}
        </form>
        {#snippet footer()}
            <button type="button" class="onebank-secondary-btn h-10 tablet:w-36" onclick={() => (adding = false)}>{t('Cancel', 'ຍົກເລີກ')}</button>
            <button type="submit" form="add-recipient" class="onebank-primary-btn h-10 tablet:w-44" disabled={saving}>{t('Save', 'ບັນທຶກ')}</button>
        {/snippet}
    </Modal>
{/if}

{#if removing}
    <Modal title={t('Remove this account?', 'ລຶບບັນຊີນີ້ບໍ?')} size="sm" onClose={() => (removing = null)}>
        <p class="text-center">{removing.name}<br/><span class="text-sm text-onebank-subtle tabular-nums">{maskAccount(removing.account)}</span></p>
        <p class="mt-3 text-center text-sm text-onebank-subtle">{t('Transfers already sent are not affected.', 'ການໂອນທີ່ສົ່ງແລ້ວບໍ່ໄດ້ຮັບຜົນກະທົບ.')}</p>
        {#snippet footer()}
            <button type="button" class="onebank-secondary-btn h-10 tablet:w-36" onclick={() => (removing = null)}>{t('Keep', 'ເກັບໄວ້')}</button>
            <button type="button" class="onebank-primary-btn h-10 tablet:w-36" disabled={removeBusy} onclick={confirmRemove}>{t('Remove', 'ລຶບ')}</button>
        {/snippet}
    </Modal>
{/if}
