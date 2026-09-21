<script lang="ts">
    /**
     * Sending money — the design's black transfer panel, in its three variants:
     *
     * - `BCEL`: to one account or several (a row per recipient), with recent /
     *   favourite recipients, quick amounts and common descriptions alongside.
     * - `INTERBANK`: an international transfer — IBAN, SWIFT, address, and who
     *   bears the fee.
     * - `IDCARD`: cash picked up with an ID card at a BCEL branch or BCOME agent.
     *
     * Saved drafts line the top; "Continue" opens the black confirmation card;
     * "Schedule" adds a date and time. In a group whose roles require approval
     * the result is pending, and the user lands on the authorization page.
     */
    import {untrack} from 'svelte';
    import Icon from '@iconify/svelte';
    import SourceAccount from './SourceAccount.svelte';
    import DraftStrip from './DraftStrip.svelte';
    import ConfirmTransfer from './ConfirmTransfer.svelte';
    import {deleteDraft, getDrafts, getRecipients, lookupAccount, saveDraft, submitTransfer, toggleFavourite} from '../../lib/api/commands';
    import type {Recipient, TransferDraft, TransferItem, TransferKind} from '../../lib/api/types';
    import {formatMoney, initials, maskAccount, money, t} from '../../lib/utils/helper';
    import {navigateToPath} from '../../lib/utils/navigation';
    import {currentGroup, loadHomeResult} from '../../stores/onebankGroups';
    import {routeLocation} from '../../stores/route';
    import {reloadHome} from '../../stores/home';
    import {refreshBadges} from '../../stores/badges';

    let {kind = 'BCEL'}: {kind?: Exclude<TransferKind, 'SALARY'>} = $props();

    interface Row extends TransferItem {
        /** Name lookup state for this row's account number. */
        looking?: boolean
        error?: string
    }

    // `amount` starts empty rather than 0, so the field shows its placeholder.
    const blankRow = (): Row => ({toaccount: '', toname: '', amount: '' as unknown as number, ccy: 'LAK', note: '', bank: kind === 'INTERBANK' ? 'SWIFT' : 'BCEL', feebearer: 'SENDER', pickup: 'BCEL'});

    let fromId = $state('');
    let multiple = $state(false);
    let rows = $state<Row[]>([blankRow()]);
    let focused = $state(0);
    let scheduling = $state(false);
    let scheduleAt = $state('');
    let repeat = $state('ONCE');
    let draftId = $state('');
    let draftName = $state('');
    let drafts = $state<TransferDraft[]>([]);
    let recipients = $state<Recipient[]>([]);
    let recipientTab = $state<'RECENT' | 'FAVOURITE' | 'ALL'>('RECENT');
    let recipientSearch = $state('');
    let confirming = $state(false);
    let busy = $state(false);
    let error = $state('');
    let notice = $state('');
    let done = $state<{status: string; count: number} | null>(null);

    const accounts = $derived($loadHomeResult?.accounts ?? []);
    const from = $derived(accounts.find((account) => account.accountid === fromId));
    const ccy = $derived(from?.ccy ?? 'LAK');
    const fee = $derived(kind === 'INTERBANK' ? (rows[0]?.feebearer === 'SHARED' ? 10 : 25) : kind === 'IDCARD' ? 15_000 : 0);
    const filled = $derived(rows.filter((row) => row.toaccount.trim() || row.toname.trim() || row.amount > 0));
    const total = $derived(filled.reduce((sum, row) => sum + Number(row.amount || 0), 0) + fee * filled.length);

    const TITLE: Record<string, [string, string]> = {
        BCEL: ['Transfer', 'ໂອນເງິນ'],
        INTERBANK: ['International transfer', 'ໂອນເງິນຕ່າງປະເທດ'],
        IDCARD: ['Transfer to an ID card', 'ໂອນເງິນຫາບັດປະຈຳຕົວ'],
    };
    const QUICK_AMOUNTS = [5_000, 10_000, 20_000, 50_000, 100_000, 200_000, 500_000, 1_000_000, 5_000_000];
    const NOTES: Array<[string, string]> = [['Goods', 'ຄ່າເຄື່ອງ'], ['Food', 'ຄ່າອາຫານ'], ['Transport', 'ຄ່າຂົນສົ່ງ'], ['Rent', 'ຄ່າເຊົ່າ'], ['Salary advance', 'ເບີກເງິນເດືອນລ່ວງໜ້າ']];

    async function loadSide(group: string) {
        if (!group) return;
        const [draftResponse, recipientResponse] = await Promise.all([getDrafts(group), getRecipients(group)]);
        drafts = (draftResponse.drafts ?? []).filter((draft) => draft.kind === kind);
        recipients = recipientResponse.recipients ?? [];
    }

    $effect(() => {
        void loadSide($currentGroup);
    });

    // Prefill from the querystring once: "edit" on the authorization page lands here.
    $effect(() => untrack(() => {
        const params = new URLSearchParams($routeLocation.query);
        if (!params.get('to')) return;
        rows = [{...blankRow(), toaccount: params.get('to') ?? '', toname: params.get('name') ?? '', amount: Number(params.get('amount') ?? 0), note: params.get('note') ?? ''}];
        notice = t('The pending transfer was withdrawn so you can change it.', 'ລາຍການເກົ່າຖືກຍົກເລີກແລ້ວ ເພື່ອໃຫ້ທ່ານແກ້ໄຂ.');
    }));

    async function lookup(index: number) {
        const row = rows[index];
        if (kind !== 'BCEL' || row.toaccount.replace(/\D/g, '').length < 8) return;
        rows[index].looking = true;
        rows[index].error = '';
        const response = await lookupAccount(row.toaccount.replace(/\D/g, ''));
        rows[index].looking = false;
        if (response.result === 0) rows[index].toname = response.name ?? '';
        else rows[index].error = response.message || t('Account not found', 'ບໍ່ພົບບັນຊີ');
    }

    function useRecipient(recipient: Recipient) {
        const target = rows[focused] && !rows[focused].toaccount ? focused : multiple ? rows.length : 0;
        if (target >= rows.length) rows = [...rows, blankRow()];
        rows[target] = {...rows[target], toaccount: recipient.account, toname: recipient.name, error: ''};
        focused = target;
    }

    function setAmount(amount: number) {
        if (!rows[focused]) return;
        rows[focused].amount = amount;
    }

    function openDraft(draft: TransferDraft) {
        draftId = draft.draftid;
        draftName = draft.name;
        fromId = draft.fromaccountid;
        rows = draft.items.map((item) => ({...blankRow(), ...item}));
        multiple = rows.length > 1;
        notice = t(`Draft "${draft.name}" opened`, `ເປີດຮ່າງ "${draft.name}" ແລ້ວ`);
    }

    async function removeDraft(draft: TransferDraft) {
        await deleteDraft(draft.draftid);
        if (draftId === draft.draftid) draftId = '';
        await loadSide($currentGroup);
    }

    async function storeDraft() {
        if (filled.length === 0) {
            error = t('Fill in at least one recipient first', 'ກະລຸນາປ້ອນຜູ້ຮັບຢ່າງໜ້ອຍໜຶ່ງຄົນ');
            return;
        }
        const name = draftName || filled.map((row) => row.toname.split(' ')[0]).filter(Boolean).join(', ') || t('Draft', 'ຮ່າງ');
        const response = await saveDraft({draftid: draftId, name, kind, fromaccountid: fromId, items: filled.map(clean)});
        if (response.result === 0 && response.draft) {
            draftId = response.draft.draftid;
            draftName = response.draft.name;
            notice = t('Draft saved', 'ບັນທຶກຮ່າງແລ້ວ');
            await loadSide($currentGroup);
        }
    }

    function clean(row: Row): TransferItem {
        const {looking: _looking, error: _error, ...item} = $state.snapshot(row) as Row;
        return {...item, ccy, amount: Number(item.amount) || 0, toaccount: item.toaccount.trim()};
    }

    function validate(): string {
        if (!from) return t('Choose the account to send from', 'ກະລຸນາເລືອກບັນຊີຕົ້ນທາງ');
        if (filled.length === 0) return t('Add a recipient', 'ກະລຸນາເພີ່ມຜູ້ຮັບ');
        for (const row of filled) {
            if (kind === 'IDCARD' ? !row.idcard?.trim() || !row.phone?.trim() : !row.toaccount.trim()) return t('Every recipient needs an account', 'ຜູ້ຮັບທຸກຄົນຕ້ອງມີເລກບັນຊີ');
            if (!row.toname.trim()) return t('Every recipient needs a name', 'ຜູ້ຮັບທຸກຄົນຕ້ອງມີຊື່');
            if (!(Number(row.amount) > 0)) return t('Every recipient needs an amount', 'ກະລຸນາປ້ອນຈຳນວນເງິນ');
            if (kind === 'INTERBANK' && !row.swift?.trim()) return t('Enter the SWIFT code', 'ກະລຸນາປ້ອນລະຫັດ SWIFT');
        }
        if (from && total > (from.availablebalance ?? 0)) return t('That is more than the available balance', 'ຈຳນວນເງິນເກີນຍອດເງິນທີ່ໃຊ້ໄດ້');
        if (scheduling && !scheduleAt) return t('Choose when to send it', 'ກະລຸນາເລືອກເວລາໂອນ');
        return '';
    }

    function proceed() {
        error = validate();
        if (!error) confirming = true;
    }

    async function send() {
        busy = true;
        error = '';
        const items = filled.map(clean).map((item) => (kind === 'IDCARD' ? {...item, toaccount: item.idcard ?? ''} : item));
        const response = await submitTransfer({
            kind,
            fromaccountid: fromId,
            items,
            schedule: scheduling && scheduleAt ? `${scheduleAt.replace('T', ' ')}:00` : undefined,
        });
        busy = false;
        confirming = false;
        if (response.result !== 0) {
            error = response.message || t('The transfer could not be sent', 'ໂອນເງິນບໍ່ສຳເລັດ');
            return;
        }
        if (draftId) await deleteDraft(draftId);
        await Promise.all([reloadHome(), refreshBadges()]);
        const status = response.item?.status ?? 'SUCCESS';
        if (status === 'PENDING') navigateToPath('/authorization');
        else done = {status, count: items.length};
    }

    function reset() {
        done = null;
        rows = [blankRow()];
        draftId = '';
        draftName = '';
        scheduling = false;
        void loadSide($currentGroup);
    }

    const shownRecipients = $derived(
        recipients.filter((recipient) => {
            if (recipientTab === 'FAVOURITE' && !recipient.favourite) return false;
            const query = recipientSearch.trim().toLowerCase();
            return !query || `${recipient.name} ${recipient.account}`.toLowerCase().includes(query);
        }).slice(0, recipientTab === 'ALL' ? 50 : 6),
    );
</script>

{#if done}
    <section class="ob-card mx-auto flex max-w-xl flex-col items-center gap-4 p-10 text-center">
        <span class="flex h-16 w-16 items-center justify-center rounded-full bg-green-100"><Icon icon="mdi:check-bold" class="h-9 w-9 text-onebank-income"/></span>
        <h1 class="text-xl font-bold">{scheduling ? t('Transfer scheduled', 'ຕັ້ງເວລາໂອນແລ້ວ') : t('Transfer completed', 'ໂອນເງິນສຳເລັດ')}</h1>
        <p class="text-onebank-subtle">{money(total, ccy)} · {t(`${done.count} recipient(s)`, `${done.count} ບັນຊີ`)}</p>
        <div class="flex gap-3">
            <button type="button" class="onebank-secondary-btn" onclick={reset}>{t('Send another', 'ໂອນອີກ')}</button>
            <button type="button" class="onebank-primary-btn" onclick={() => navigateToPath('/statement')}>{t('See the statement', 'ເບິ່ງການເຄື່ອນໄຫວ')}</button>
        </div>
    </section>
{:else}
<div class="space-y-4">
    <DraftStrip {drafts} onOpen={openDraft} onDelete={removeDraft}/>

    {#if notice}<div class="rounded-ob-sm bg-green-50 p-3 text-sm text-green-700" role="status">{notice}</div>{/if}

    <section class="ob-card p-5 tablet:p-6">
        <header class="mb-5 flex flex-wrap items-center gap-3">
            <h1 class="text-lg font-semibold text-onebank-blue">{t(TITLE[kind][0], TITLE[kind][1])}</h1>
            {#if kind === 'BCEL'}
                <div class="mx-auto flex gap-2 rounded-ob-md bg-onebank-page p-1" role="tablist">
                    {#each [{on: false, en: 'One account', lo: 'ໂອນບັນຊີດຽວ'}, {on: true, en: 'Several accounts', lo: 'ໂອນຫຼາຍບັນຊີ'}] as tab (tab.en)}
                        <button type="button" role="tab" aria-selected={multiple === tab.on}
                                class="h-8 rounded-ob-sm px-4 text-xs {multiple === tab.on ? 'bg-onebank-red font-semibold text-white' : 'bg-white text-black'}"
                                onclick={() => { multiple = tab.on; if (!tab.on) rows = [rows[0] ?? blankRow()]; }}>
                            {t(tab.en, tab.lo)}
                        </button>
                    {/each}
                </div>
            {:else}
                <span class="mx-auto"></span>
            {/if}
            <button type="button" class="flex h-8 items-center gap-2 rounded-ob-sm bg-onebank-light-grey-2 px-3 text-xs text-black" onclick={storeDraft}>
                <Icon icon="mdi:content-save-outline" class="h-4 w-4"/>{t('Save as draft', 'ບັນທຶກຮ່າງການໂອນ')}
            </button>
        </header>

        <SourceAccount {accounts} bind:value={fromId}>
            <div>
                <p class="mb-2 text-sm">{t('Transfer to', 'ໂອນຫາ')}</p>

                {#if kind === 'BCEL' && multiple}
                    <div class="overflow-x-auto rounded-ob-md bg-white text-black">
                        <table class="w-full min-w-[560px] text-sm">
                            <thead class="bg-onebank-light-grey-2 text-xs">
                                <tr><th class="px-3 py-2 text-left">{t('Destination account', 'ບັນຊີປາຍທາງ')}</th><th class="px-3 py-2 text-left">{t('Amount', 'ຈຳນວນເງິນ')}</th><th class="px-3 py-2 text-left">{t('Description', 'ຄຳອະທິບາຍ')}</th><th class="w-8"></th></tr>
                            </thead>
                            <tbody>
                                {#each rows as row, index (index)}
                                    <tr class="border-t border-onebank-row align-top {focused === index ? 'bg-onebank-pink/50' : ''}">
                                        <td class="px-3 py-2">
                                            <input class="w-full rounded border-onebank-light-grey-4 px-2 py-1 text-sm" placeholder="0101200..." bind:value={row.toaccount}
                                                   onfocus={() => (focused = index)} onblur={() => lookup(index)} aria-label={t('Destination account', 'ບັນຊີປາຍທາງ')}/>
                                            <span class="mt-0.5 block truncate text-[11px] {row.error ? 'text-red-600' : 'text-onebank-subtle'}">{row.looking ? '…' : row.error || row.toname}</span>
                                        </td>
                                        <td class="px-3 py-2">
                                            <input class="w-32 rounded border-onebank-light-grey-4 px-2 py-1 text-right text-sm tabular-nums" inputmode="decimal" bind:value={row.amount}
                                                   onfocus={() => (focused = index)} aria-label={t('Amount', 'ຈຳນວນເງິນ')}/>
                                            <span class="ml-1 text-xs">{ccy}</span>
                                        </td>
                                        <td class="px-3 py-2"><input class="w-full rounded border-onebank-light-grey-4 px-2 py-1 text-sm" bind:value={row.note} onfocus={() => (focused = index)} aria-label={t('Description', 'ຄຳອະທິບາຍ')}/></td>
                                        <td class="py-2 pr-2">
                                            {#if rows.length > 1}
                                                <button type="button" class="text-onebank-muted hover:text-onebank-red" aria-label={t('Remove row', 'ລຶບແຖວ')}
                                                        onclick={() => { rows = rows.filter((_, position) => position !== index); focused = 0; }}>
                                                    <Icon icon="mdi:close-circle" class="h-5 w-5"/>
                                                </button>
                                            {/if}
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                        <button type="button" class="flex w-full items-center justify-center gap-2 border-t border-dashed border-onebank-light-grey-4 py-2.5 text-sm"
                                onclick={() => { rows = [...rows, blankRow()]; focused = rows.length - 1; }}>
                            <Icon icon="mdi:plus-circle-outline" class="h-5 w-5"/>{t('Add account', 'ເພີ່ມບັນຊີ')}
                        </button>
                    </div>
                {:else}
                    {@const row = rows[0]}
                    <div class="grid gap-3 tablet:grid-cols-2">
                        {#if kind === 'IDCARD'}
                            <fieldset class="tablet:col-span-2">
                                <legend class="mb-1.5 text-xs text-onebank-subtle">{t('Where the money is picked up', 'ເລືອກສະຖານທີ່ຮັບເງິນ')}</legend>
                                <div class="grid gap-2 tablet:grid-cols-2">
                                    {#each [['BCEL', 'Any BCEL branch', 'ທະນາຄານ ການຄ້າຕ່າງປະເທດລາວ ມະຫາຊົນ (ທຸກໜ່ວຍບໍລິການ)'], ['BCOME', 'Any BCOME agent', 'ຕົວແທນ BCOME (ທຸກຈຸດບໍລິການ)']] as [id, en, lo] (id)}
                                        <label class="flex cursor-pointer items-center gap-2 rounded-ob-sm border-2 bg-white px-3 py-2 text-sm text-black {row.pickup === id ? 'border-onebank-red' : 'border-onebank-row'}">
                                            <input type="radio" name="pickup" class="text-onebank-red focus:ring-onebank-red" checked={row.pickup === id} onchange={() => (row.pickup = id)}/>
                                            {t(en, lo)}
                                        </label>
                                    {/each}
                                </div>
                            </fieldset>
                            <label class="block"><span class="mb-1 block text-xs text-onebank-subtle">{t("Receiver's name", 'ຊື່ຜູ້ຮັບເງິນ')}</span><input class="ob-input h-11" bind:value={row.toname}/></label>
                            <label class="block"><span class="mb-1 block text-xs text-onebank-subtle">{t('Phone', 'ເບີໂທ')}</span><input class="ob-input h-11" inputmode="tel" placeholder="020 5555 5555" bind:value={row.phone}/></label>
                            <label class="block"><span class="mb-1 block text-xs text-onebank-subtle">{t('ID card number', 'ເລກບັດປະຈຳຕົວ')}</span><input class="ob-input h-11" bind:value={row.idcard}/></label>
                            <label class="block"><span class="mb-1 block text-xs text-onebank-subtle">{t('Receiver confirms with', 'ຢືນຢັນຜູ້ຮັບດ້ວຍ')}</span>
                                <select class="ob-input h-11"><option>{t('ID card', 'ບັດປະຈຳຕົວ')}</option><option>{t('Passport', 'ໜັງສືຜ່ານແດນ')}</option></select></label>
                        {:else}
                            <label class="block">
                                <span class="mb-1 block text-xs text-onebank-subtle">{kind === 'INTERBANK' ? t('Account number / IBAN', 'ເລກບັນຊີປາຍທາງ/ IBAN') : t('Destination account number', 'ເລກບັນຊີປາຍທາງ')}</span>
                                <span class="flex h-11 overflow-hidden rounded-ob-sm border border-onebank-light-grey-4 bg-white text-black">
                                    <span class="flex items-center border-r border-onebank-light-grey-4 px-3 text-sm">{ccy}</span>
                                    <input class="min-w-0 flex-1 border-0 px-3 text-sm focus:ring-0" placeholder="00123456789012" bind:value={row.toaccount} onblur={() => lookup(0)}/>
                                </span>
                                {#if row.error}<span class="mt-1 block text-xs text-red-600">{row.error}</span>{/if}
                            </label>
                            <label class="block">
                                <span class="mb-1 block text-xs text-onebank-subtle">{t('Destination account name', 'ຊື່ບັນຊີປາຍທາງ')}</span>
                                <input class="ob-input h-11 {kind === 'BCEL' ? 'bg-onebank-light-grey-2' : ''}" bind:value={row.toname} readonly={kind === 'BCEL'}
                                       placeholder={row.looking ? t('Looking up…', 'ກຳລັງຊອກ…') : kind === 'BCEL' ? t('Filled in from the account number', 'ຈະສະແດງອັດຕະໂນມັດ') : ''}/>
                            </label>
                            {#if kind === 'INTERBANK'}
                                <label class="block"><span class="mb-1 block text-xs text-onebank-subtle">{t('SWIFT code', 'ລະຫັດ SWIFT')}</span><input class="ob-input h-11 uppercase" maxlength="11" bind:value={row.swift}/></label>
                                <label class="block"><span class="mb-1 block text-xs text-onebank-subtle">{t("Receiver's address", 'ທີ່ຢູ່ຜູ້ຮັບປາຍທາງ')}</span><input class="ob-input h-11" bind:value={row.address}/></label>
                                <label class="block"><span class="mb-1 block text-xs text-onebank-subtle">{t('Who pays the fee', 'ການເກັບຄ່າທຳນຽມ')}</span>
                                    <select class="ob-input h-11" bind:value={row.feebearer}>
                                        <option value="SENDER">{t('Charged to the sender', 'ເກັບຈາກຕົ້ນທາງ')}</option>
                                        <option value="SHARED">{t('Shared by both sides', 'ເກັບທັງສອງເບື້ອງ')}</option>
                                    </select></label>
                            {/if}
                        {/if}
                        <label class="block">
                            <span class="mb-1 block text-xs text-onebank-subtle">{kind === 'IDCARD' ? t('Amount to receive', 'ຈຳນວນເງິນປາຍທາງ') : t('Amount', 'ຈຳນວນເງິນ')}</span>
                            <span class="flex h-11 overflow-hidden rounded-ob-sm border border-onebank-light-grey-4 bg-white text-black">
                                <input class="min-w-0 flex-1 border-0 px-3 text-right text-sm tabular-nums focus:ring-0" inputmode="decimal" placeholder="0.00" bind:value={row.amount}/>
                                <span class="flex items-center px-3 text-sm">{ccy}</span>
                            </span>
                        </label>
                        <label class="block {kind === 'BCEL' ? 'tablet:col-span-2' : ''}">
                            <span class="mb-1 block text-xs text-onebank-subtle">{t('Description', 'ຄຳອະທິບາຍ')}</span>
                            <input class="ob-input h-11" maxlength="100" bind:value={row.note}/>
                        </label>
                        {#if fee}
                            <p class="text-xs text-onebank-subtle tablet:col-span-2">{t('Fee', 'ຄ່າທຳນຽມທີ່ຕ້ອງຊຳລະ')}: <b>{money(fee, ccy)}</b></p>
                        {/if}
                    </div>
                {/if}

                {#if scheduling}
                    <div class="mt-4 grid gap-3 rounded-ob-md bg-onebank-page p-4 tablet:grid-cols-2">
                        <label class="block"><span class="mb-1 block text-xs text-onebank-subtle">{t('Repeat', 'ຊ່ວງເວລາໂອນ')}</span>
                            <select class="ob-input h-11" bind:value={repeat}>
                                <option value="ONCE">{t('Once', 'ຄັ້ງດຽວ')}</option>
                                <option value="WEEKLY">{t('Every week', 'ທຸກອາທິດ')}</option>
                                <option value="MONTHLY">{t('Every month', 'ທຸກເດືອນ')}</option>
                            </select></label>
                        <label class="block"><span class="mb-1 block text-xs text-onebank-subtle">{t('Send at', 'ເວລາໂອນ')}</span>
                            <input type="datetime-local" class="ob-input h-11" bind:value={scheduleAt} min={new Date().toISOString().slice(0, 16)}/></label>
                    </div>
                {/if}
            </div>
        </SourceAccount>

        {#if kind === 'BCEL'}
            <div class="mt-6 grid gap-4 border-t border-onebank-row pt-5 desktop:grid-cols-3">
                <div class="rounded-ob-md bg-onebank-page p-3 text-black">
                    <div class="mb-2 flex gap-1 text-xs" role="tablist">
                        {#each [['RECENT', 'Recent', 'ລ່າສຸດ'], ['FAVOURITE', 'Favourites', 'ລາຍການທີ່ມັກ'], ['ALL', 'All', 'ທັງໝົດ']] as [id, en, lo] (id)}
                            <button type="button" role="tab" aria-selected={recipientTab === id}
                                    class="rounded-full px-3 py-1 {recipientTab === id ? 'bg-onebank-blue text-white' : 'bg-onebank-row'}"
                                    onclick={() => (recipientTab = id as typeof recipientTab)}>{t(en, lo)}</button>
                        {/each}
                    </div>
                    <input type="search" class="mb-2 h-8 w-full rounded-full border-onebank-light-grey-4 px-3 text-xs" placeholder={t('Search', 'ຊອກຫາ')} bind:value={recipientSearch}/>
                    <ul class="max-h-44 space-y-1 overflow-y-auto">
                        {#each shownRecipients as recipient (recipient.recipientid)}
                            <li class="flex items-center gap-2 rounded-ob-sm px-2 py-1.5 hover:bg-onebank-pink">
                                <button type="button" class="flex min-w-0 flex-1 items-center gap-2 text-left" onclick={() => useRecipient(recipient)}>
                                    <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-onebank-light-grey-4 text-[9px] font-semibold text-white">{initials(recipient.name)}</span>
                                    <span class="min-w-0"><span class="block truncate text-xs font-semibold">{recipient.name}</span><span class="block truncate text-[11px] text-onebank-subtle">{recipient.bank} · {maskAccount(recipient.account)}</span></span>
                                </button>
                                <button type="button" aria-label={recipient.favourite ? t('Unfavourite', 'ເອົາອອກຈາກທີ່ມັກ') : t('Favourite', 'ເພີ່ມໃສ່ທີ່ມັກ')}
                                        onclick={async () => { await toggleFavourite(recipient.recipientid); await loadSide($currentGroup); }}>
                                    <Icon icon={recipient.favourite ? 'mdi:star' : 'mdi:star-outline'} class="h-4 w-4 text-amber-400"/>
                                </button>
                            </li>
                        {:else}
                            <li class="py-4 text-center text-xs text-onebank-subtle">{t('Nobody yet', 'ຍັງບໍ່ມີ')}</li>
                        {/each}
                    </ul>
                </div>
                <div class="rounded-ob-md bg-onebank-page p-3 text-black">
                    <p class="mb-2 text-xs font-semibold">{t('Quick amounts', 'ຈຳນວນເງິນດ່ວນ')}</p>
                    <div class="grid grid-cols-3 gap-2">
                        {#each QUICK_AMOUNTS as amount (amount)}
                            <button type="button" class="h-9 rounded-ob-sm bg-onebank-row text-xs tabular-nums hover:bg-onebank-pink" onclick={() => setAmount(amount)}>{formatMoney(amount, 0)}</button>
                        {/each}
                    </div>
                </div>
                <div class="rounded-ob-md bg-onebank-page p-3 text-black">
                    <p class="mb-2 text-xs font-semibold">{t('Common descriptions', 'ຄຳອະທິບາຍທີ່ໃຊ້ເລື້ອຍໆ')}</p>
                    <div class="flex flex-wrap gap-2">
                        {#each NOTES as [en, lo] (en)}
                            <button type="button" class="rounded-ob-sm bg-onebank-row px-3 py-1.5 text-xs hover:bg-onebank-pink"
                                    onclick={() => { if (rows[focused]) rows[focused].note = t(en, lo); }}>{t(en, lo)}</button>
                        {/each}
                    </div>
                </div>
            </div>
        {/if}
    </section>

    {#if error}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}

    <div class="flex flex-col items-center justify-center gap-4 tablet:flex-row">
        <p class="text-sm tablet:mr-auto">{t('Total', 'ລວມ')}: <b class="tabular-nums">{money(total, ccy)}</b></p>
        <button type="button" class="onebank-primary-btn tablet:w-72" onclick={proceed}>{t('Continue', 'ດຳເນີນການຕໍ່')}</button>
        <button type="button" class="flex h-12.5 items-center gap-2 rounded-ob-sm px-5 font-semibold {scheduling ? 'border-2 border-onebank-red bg-onebank-red text-white' : 'border-2 border-onebank-blue bg-white text-onebank-blue hover:bg-onebank-blue-soft'}"
                aria-pressed={scheduling} onclick={() => (scheduling = !scheduling)}>
            <Icon icon="mdi:clock-outline" class="h-5 w-5"/>{t('Schedule', 'ຕັ້ງເວລາໂອນ')}
        </button>
    </div>
</div>
{/if}

{#if confirming && from}
    <ConfirmTransfer fromName={from.alias || from.name} fromAccount={from.account} {ccy} {fee} {busy}
                     schedule={scheduling ? scheduleAt.replace('T', ' ') : ''}
                     lines={filled.map((row) => ({name: row.toname, account: row.toaccount || row.idcard || '', amount: Number(row.amount), note: row.note}))}
                     onConfirm={send} onCancel={() => (confirming = false)}/>
{/if}
