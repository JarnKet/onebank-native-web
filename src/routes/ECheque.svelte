<script lang="ts">
    /**
     * E-Cheques, as the design's frames: on the left, the group's cheque books
     * ("create a new cheque") or the cheques it has received; on the right, the
     * history of cheques issued and received. Writing one goes form → preview
     * → done, with a QR the payee presents to cash it.
     */
    import Icon from '@iconify/svelte';
    import Modal from '../lib/components/Modal.svelte';
    import FauxQr from '../lib/components/FauxQr.svelte';
    import SelectableAccount from '../lib/components/SelectableAccount.svelte';
    import {buyChequeBook, cancelCheque, createCheque, getChequeBooks, getCheques, lookupAccount} from '../lib/api/unmapped';
    import type {Cheque, ChequeBook} from '../lib/api/types';
    import {isoDay, maskAccount, money, splitTime, t} from '../lib/utils/helper';
    import {currentGroup, loadHomeResult} from '../stores/onebankGroups';
    import {reloadHome} from '../stores/home';

    let tab = $state<'CREATE' | 'RECEIVED'>('CREATE');
    let historyTab = $state<'ISSUED' | 'RECEIVED'>('ISSUED');
    let historySearch = $state('');
    let books = $state<ChequeBook[]>([]);
    let cheques = $state<Cheque[]>([]);
    let step = $state<'LIST' | 'FORM' | 'PREVIEW' | 'DONE'>('LIST');
    let book = $state<ChequeBook | null>(null);
    let buying = $state(false);
    let buyAccount = $state('');
    let busy = $state(false);
    let error = $state('');
    let issued = $state<Cheque | null>(null);

    let kind = $state<'CASH' | 'ACCOUNT'>('ACCOUNT');
    let blockfunds = $state(false);
    let payeeaccount = $state('');
    let payee = $state('');
    let amount = $state('');
    let memo = $state('');
    let duedate = $state(isoDay(new Date(Date.now() + 7 * 864e5)));

    const accounts = $derived($loadHomeResult?.accounts ?? []);
    const bookAccount = $derived(accounts.find((account) => account.accountid === book?.accountid));

    async function load(group: string) {
        if (!group) return;
        const [bookResponse, chequeResponse] = await Promise.all([getChequeBooks(group), getCheques(group)]);
        books = bookResponse.books ?? [];
        cheques = chequeResponse.cheques ?? [];
    }

    $effect(() => {
        void load($currentGroup);
    });

    const history = $derived(
        cheques.filter((cheque) => (cheque.direction ?? 'ISSUED') === historyTab)
            .filter((cheque) => `${cheque.payee} ${cheque.number} ${cheque.memo}`.toLowerCase().includes(historySearch.trim().toLowerCase())),
    );
    const received = $derived(cheques.filter((cheque) => cheque.direction === 'RECEIVED'));

    function start(chosen: ChequeBook) {
        book = chosen;
        error = '';
        kind = 'ACCOUNT';
        blockfunds = false;
        payeeaccount = '';
        payee = '';
        amount = '';
        memo = '';
        step = 'FORM';
    }

    async function lookupPayee() {
        if (kind !== 'ACCOUNT' || payeeaccount.replace(/\D/g, '').length < 8) return;
        const response = await lookupAccount(payeeaccount.replace(/\D/g, ''));
        if (response.result === 0) payee = response.name ?? '';
    }

    function preview() {
        error = '';
        if (!payee.trim()) error = t('Enter who the cheque is for', 'ກະລຸນາປ້ອນຊື່ຜູ້ຮັບ');
        else if (kind === 'ACCOUNT' && payeeaccount.replace(/\D/g, '').length < 8) error = t("Enter the payee's account", 'ກະລຸນາປ້ອນບັນຊີຜູ້ຮັບ');
        else if (!(Number(amount) > 0)) error = t('Enter an amount', 'ກະລຸນາປ້ອນຈຳນວນເງິນ');
        else step = 'PREVIEW';
    }

    async function issue() {
        if (!book) return;
        busy = true;
        error = '';
        const response = await createCheque({
            accountid: book.accountid,
            bookid: book.bookid,
            payee: payee.trim(),
            payeeaccount: kind === 'ACCOUNT' ? payeeaccount.replace(/\D/g, '') : undefined,
            amount: Number(amount),
            duedate: `${duedate} 00:00:00`,
            memo,
            kind,
            blockfunds,
        });
        busy = false;
        if (response.result !== 0 || !response.cheque) {
            error = response.message || t('The cheque could not be issued', 'ອອກແຊັກບໍ່ສຳເລັດ');
            step = 'FORM';
            return;
        }
        issued = response.cheque;
        step = 'DONE';
        await Promise.all([load($currentGroup), reloadHome()]);
    }

    async function buy() {
        if (!buyAccount) return;
        busy = true;
        const response = await buyChequeBook(buyAccount);
        busy = false;
        if (response.result !== 0) {
            error = response.message || t('Could not buy the cheque book', 'ຊື້ປຶ້ມແຊັກບໍ່ໄດ້');
            return;
        }
        buying = false;
        await load($currentGroup);
    }

    async function cancel(cheque: Cheque) {
        const response = await cancelCheque(cheque.chequeid);
        if (response.result !== 0) error = response.message || t('Could not cancel the cheque', 'ຍົກເລີກແຊັກບໍ່ໄດ້');
        await Promise.all([load($currentGroup), reloadHome()]);
    }

    const STATUS: Record<string, [string, string, string]> = {
        ISSUED: ['Ready to cash', 'ພ້ອມຂຶ້ນເງິນ', 'text-onebank-income'],
        CASHED: ['Cashed', 'ຂຶ້ນເງິນແລ້ວ', 'text-onebank-subtle'],
        CANCELLED: ['Cancelled', 'ຍົກເລີກ', 'text-onebank-red'],
    };
</script>

<div class="grid items-start gap-4 desktop:grid-cols-[minmax(0,1fr)_380px]">
    <section class="ob-card min-h-96 p-5">
        {#if step === 'LIST'}
            <div class="mb-5 flex gap-3" role="tablist">
                {#each [['CREATE', 'New cheque', 'ສ້າງແຊັກໃໝ່', 'mdi:checkbook'], ['RECEIVED', 'Received cheques', 'ຮັບແຊັກ', 'mdi:inbox-arrow-down']] as [id, en, lo, icon] (id)}
                    <button type="button" role="tab" aria-selected={tab === id}
                            class="flex h-11 items-center gap-2 rounded-ob-md px-4 text-sm {tab === id ? 'bg-onebank-blue text-white' : 'bg-onebank-light-grey-2'}"
                            onclick={() => (tab = id as typeof tab)}>
                        <Icon icon={icon} class="h-5 w-5"/>{t(en, lo)}
                    </button>
                {/each}
            </div>
            {#if tab === 'CREATE'}
                <div class="grid gap-3 tablet:grid-cols-2">
                    {#each books as chequeBook (chequeBook.bookid)}
                        {@const account = accounts.find((candidate) => candidate.accountid === chequeBook.accountid)}
                        <button type="button" disabled={chequeBook.used >= chequeBook.total}
                                class="flex items-start gap-3 rounded-ob-md bg-white p-4 text-left shadow-ob-card transition-colors hover:bg-onebank-pink disabled:opacity-50"
                                onclick={() => start(chequeBook)}>
                            <img src="img/ob/sc-echeque.svg" alt="" class="h-10 w-10"/>
                            <span class="min-w-0 flex-1 text-xs">
                                <span class="block text-sm font-bold">{t('Book no.', 'ເຫຼັ້ມທີ')}: {chequeBook.number}</span>
                                <span class="block text-onebank-subtle">{t('Bought', 'ຊື້ເວລາ')} {splitTime(chequeBook.boughtat).date} {splitTime(chequeBook.boughtat).time}</span>
                                <span class="block">{account?.ccy} {maskAccount(account?.account)}</span>
                            </span>
                            <span class="text-right text-[11px]">{t('Used', 'ນຳໃຊ້ໄປ')}<br/><b class="text-onebank-red">{chequeBook.used}</b>/{chequeBook.total}</span>
                        </button>
                    {/each}
                    <button type="button" class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-ob-md border-2 border-dashed border-onebank-light-grey-4 text-sm"
                            onclick={() => { buying = true; buyAccount = accounts[0]?.accountid ?? ''; error = ''; }}>
                        <Icon icon="mdi:plus" class="h-6 w-6"/>{t('Buy a cheque book to start writing cheques', 'ຊື້ປຶ້ມແຊັກ ເພື່ອເລີ່ມສ້າງແຊັກ')}
                    </button>
                </div>
            {:else}
                <ul class="space-y-3">
                    {#each received as cheque (cheque.chequeid)}
                        <li class="rounded-ob-md border border-onebank-row p-4 text-sm">
                            <div class="flex justify-between gap-3"><b>{t('Cheque no.', 'ເລກທີ')} {cheque.number}</b><span class={STATUS[cheque.status][2]}>{t(STATUS[cheque.status][0], STATUS[cheque.status][1])}</span></div>
                            <p class="mt-1 font-semibold text-onebank-income tabular-nums">{money(cheque.amount, cheque.ccy)}</p>
                            <p class="text-onebank-subtle">{t('Cash from', 'ຂຶ້ນເງິນໄດ້ຈາກ')} {splitTime(cheque.duedate).date} · {cheque.memo}</p>
                        </li>
                    {:else}
                        <li class="py-10 text-center text-sm text-onebank-subtle">{t('No cheques received', 'ບໍ່ມີແຊັກທີ່ໄດ້ຮັບ')}</li>
                    {/each}
                </ul>
            {/if}
        {:else if step === 'FORM' && book}
            <button type="button" class="mb-4 flex items-center gap-1 text-sm text-onebank-subtle" onclick={() => (step = 'LIST')}>
                <Icon icon="mdi:arrow-left" class="h-5 w-5"/>{t('Cheque books', 'ປຶ້ມແຊັກ')}
            </button>
            <div class="mb-5 rounded-ob-md bg-onebank-pink p-4 text-sm">
                <b>{t('Book no.', 'ເຫຼັ້ມທີ')}: {book.number}</b> · {bookAccount?.ccy} {maskAccount(bookAccount?.account)} · {t('Available', 'ໃຊ້ໄດ້')} {money(bookAccount?.availablebalance, bookAccount?.ccy)}
            </div>
            <div class="space-y-4">
                <fieldset>
                    <legend class="ob-label">{t('Cheque type', 'ປະເພດແຊັກ')}</legend>
                    <div class="flex flex-wrap items-center gap-2">
                        {#each [['CASH', 'Cash cheque', 'ແຊັກເງິນສົດ'], ['ACCOUNT', 'Account payee', 'ແຊັກມອບເງິນເຂົ້າບັນຊີ']] as [id, en, lo] (id)}
                            <button type="button" aria-pressed={kind === id} class="h-9 rounded-ob-sm px-4 text-sm {kind === id ? 'bg-onebank-red text-white' : 'bg-onebank-light-grey-2'}"
                                    onclick={() => (kind = id as typeof kind)}>{t(en, lo)}</button>
                        {/each}
                        <label class="ml-2 flex items-center gap-2 text-sm">
                            <input type="checkbox" class="rounded text-onebank-red focus:ring-onebank-red" bind:checked={blockfunds}/>
                            {t('Hold the funds in the account', 'ບຼັອກເງິນໃນບັນຊີ')}
                        </label>
                    </div>
                </fieldset>
                {#if kind === 'ACCOUNT'}
                    <label class="block"><span class="ob-label">{t("Payee's account", 'ບັນຊີຜູ້ຮັບ')}</span>
                        <input class="ob-input" placeholder="0000 000000 000" bind:value={payeeaccount} onblur={lookupPayee}/></label>
                {/if}
                <label class="block"><span class="ob-label">{t('Pay to', 'ຈ່າຍໃຫ້')}</span><input class="ob-input" bind:value={payee} readonly={kind === 'ACCOUNT' && payee !== '' && payeeaccount !== ''}/></label>
                <label class="block"><span class="ob-label">{t('Amount', 'ຈຳນວນເງິນ')}</span>
                    <span class="relative block"><input class="ob-input pr-14 text-right tabular-nums" inputmode="decimal" placeholder="0.00" bind:value={amount}/>
                        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-onebank-subtle">{bookAccount?.ccy}</span></span></label>
                <label class="block"><span class="ob-label">{t('Purpose', 'ຈຸດປະສົງ')}</span><input class="ob-input" maxlength="100" bind:value={memo}/></label>
                <label class="block"><span class="ob-label">{t('Can be cashed from', 'ວັນທີຂຶ້ນເງິນ')}</span><input type="date" class="ob-input w-48" min={isoDay(new Date())} bind:value={duedate}/></label>
            </div>
            {#if error}<p class="mt-4 text-sm text-red-600" role="alert">{error}</p>{/if}
            <div class="mt-6 flex justify-center gap-3">
                <button type="button" class="onebank-secondary-btn" onclick={() => (step = 'LIST')}>{t('Cancel', 'ຍົກເລີກ')}</button>
                <button type="button" class="onebank-primary-btn" onclick={preview}>{t('Next', 'ຕໍ່ໄປ')}</button>
            </div>
        {:else if (step === 'PREVIEW' || step === 'DONE') && book}
            {@const shown = issued && step === 'DONE' ? issued : null}
            <div class="relative mx-auto max-w-2xl overflow-hidden rounded-ob-md border border-onebank-row bg-white p-6 shadow-ob-card">
                <div class="absolute inset-y-0 left-6 border-l-2 border-dashed border-onebank-light-grey-4"></div>
                <div class="pl-6">
                    <div class="flex items-start justify-between gap-4">
                        {#if step === 'DONE'}<Icon icon="mdi:check-circle" class="h-10 w-10 text-onebank-income"/>{:else}<img src="img/ob/logo-mark.png" alt="" class="h-10 w-10"/>{/if}
                        <p class="text-right text-xs">{t('No.', 'ເລກທີ')}: {shown?.number ?? '—'}<br/>{t('Issued', 'ອອກວັນທີ')}: {shown ? splitTime(shown.issuedate).date : splitTime(new Date().toISOString().replace('T', ' ')).date}</p>
                    </div>
                    <dl class="mt-5 grid gap-4 text-sm tablet:grid-cols-2">
                        <div><dt class="text-onebank-subtle">{t('Type', 'ປະເພດ')}</dt><dd class="font-semibold">{kind === 'CASH' ? t('Cash cheque', 'ແຊັກເງິນສົດ') : t('Account payee', 'ແຊັກມອບເງິນເຂົ້າບັນຊີ')}</dd></div>
                        <div><dt class="text-onebank-subtle">{t('Can be cashed from', 'ວັນທີຂຶ້ນເງິນ')}</dt><dd class="font-semibold text-onebank-income">{splitTime(`${duedate} 00:00`).date}</dd></div>
                        <div><dt class="text-onebank-subtle">{t('From', 'ຈາກບັນຊີ')}</dt><dd class="font-semibold">{maskAccount(bookAccount?.account)}<br/><span class="font-normal">{bookAccount?.name}</span></dd></div>
                        <div><dt class="text-onebank-subtle">{t('Pay to', 'ຈ່າຍໃຫ້')}</dt><dd class="font-semibold">{kind === 'ACCOUNT' ? maskAccount(payeeaccount.replace(/\D/g, '')) : ''}<br/><span class="font-normal">{payee}</span></dd></div>
                        <div><dt class="text-onebank-subtle">{t('Amount', 'ຈຳນວນເງິນ')}</dt><dd class="text-lg font-bold text-onebank-income tabular-nums">{money(Number(amount), bookAccount?.ccy)}</dd></div>
                        <div><dt class="text-onebank-subtle">{t('Purpose', 'ຈຸດປະສົງ')}</dt><dd>{memo || '—'}</dd></div>
                    </dl>
                    {#if shown}
                        <div class="mt-5 flex justify-end"><FauxQr value={`${shown.chequeid}:${shown.number}`} size={96} label={t('Cheque QR code', 'QR code ແຊັກ')}/></div>
                    {/if}
                </div>
            </div>
            {#if error}<p class="mt-4 text-center text-sm text-red-600" role="alert">{error}</p>{/if}
            <div class="mt-6 flex justify-center gap-3">
                {#if step === 'PREVIEW'}
                    <button type="button" class="onebank-secondary-btn" onclick={() => (step = 'FORM')} disabled={busy}>{t('Back', 'ກັບຄືນ')}</button>
                    <button type="button" class="onebank-primary-btn" onclick={issue} disabled={busy}>{busy ? t('Issuing…', 'ກຳລັງອອກແຊັກ…') : t('Confirm', 'ຢືນຢັນ')}</button>
                {:else}
                    <button type="button" class="onebank-secondary-btn" onclick={() => { step = 'LIST'; issued = null; }}>{t('Back', 'ກັບຄືນ')}</button>
                {/if}
            </div>
        {/if}
    </section>

    <aside class="ob-card p-5">
        <label class="relative mb-3 block">
            <span class="sr-only">{t('Search history', 'ຄົ້ນຫາປະຫວັດ')}</span>
            <Icon icon="mdi:magnify" class="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2"/>
            <input type="search" bind:value={historySearch} placeholder={t('Search history', 'ຄົ້ນຫາປະຫວັດ')}
                   class="h-9 w-full rounded-full border-onebank-light-grey-4 pl-10 text-sm focus:border-onebank-red focus:ring-onebank-red"/>
        </label>
        <div class="mb-3 grid grid-cols-2 gap-2 text-xs" role="tablist">
            {#each [['ISSUED', 'Issued', 'ປະຫວັດການອອກແຊັກ'], ['RECEIVED', 'Received', 'ປະຫວັດການຮັບແຊັກ']] as [id, en, lo] (id)}
                <button type="button" role="tab" aria-selected={historyTab === id}
                        class="h-8 rounded-ob-sm {historyTab === id ? 'bg-onebank-blue text-white' : 'bg-onebank-light-grey-2'}"
                        onclick={() => (historyTab = id as typeof historyTab)}>{t(en, lo)}</button>
            {/each}
        </div>
        <ul class="max-h-[560px] divide-y divide-onebank-row overflow-y-auto">
            {#each history as cheque (cheque.chequeid)}
                <li class="flex items-start gap-3 py-3 text-xs">
                    <div class="min-w-0 flex-1">
                        <p class="font-semibold tabular-nums {cheque.direction === 'RECEIVED' ? 'text-onebank-income' : 'text-onebank-red'}">{money(cheque.amount, cheque.ccy)}</p>
                        <p class="truncate">{cheque.payee}</p>
                        <p class="text-onebank-subtle">{splitTime(cheque.issuedate).date} {splitTime(cheque.issuedate).time}</p>
                    </div>
                    <div class="text-right">
                        <p class={STATUS[cheque.status][2]}>{t(STATUS[cheque.status][0], STATUS[cheque.status][1])}</p>
                        {#if cheque.status === 'ISSUED' && cheque.direction !== 'RECEIVED'}
                            <button type="button" class="mt-1 text-onebank-subtle underline hover:text-onebank-red" onclick={() => cancel(cheque)}>{t('Cancel', 'ຍົກເລີກ')}</button>
                        {/if}
                    </div>
                </li>
            {:else}
                <li class="py-8 text-center text-xs text-onebank-subtle">{t('No cheques yet', 'ຍັງບໍ່ມີແຊັກ')}</li>
            {/each}
        </ul>
    </aside>
</div>

{#if buying}
    <Modal title={t('Choose the account to charge', 'ເລືອກຕັດຈາກບັນຊີ')} size="lg" onClose={() => (buying = false)}>
        <div class="grid gap-3 tablet:grid-cols-2">
            {#each accounts as account (account.accountid)}
                <SelectableAccount {account} multiple={false} name="book-account" selected={buyAccount === account.accountid} onToggle={() => (buyAccount = account.accountid)}/>
            {/each}
        </div>
        <p class="mt-4 text-center text-xs text-onebank-subtle">{t('A book of 30 cheques costs 50,000 LAK.', 'ປຶ້ມແຊັກ 30 ໃບ ລາຄາ 50,000 ກີບ.')}</p>
        {#if error}<p class="mt-2 text-center text-sm text-red-600" role="alert">{error}</p>{/if}
        {#snippet footer()}
            <button type="button" class="onebank-secondary-btn tablet:w-36" onclick={() => (buying = false)}>{t('Cancel', 'ຍົກເລີກ')}</button>
            <button type="button" class="onebank-primary-btn tablet:w-44" disabled={!buyAccount || busy} onclick={buy}>{t('Buy cheque book', 'ຊື້ປຶ້ມແຊັກ')}</button>
        {/snippet}
    </Modal>
{/if}
