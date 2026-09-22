<script lang="ts">
    /**
     * Paying an electricity or water bill: pick the paying account, enter the
     * customer number and province, see who it belongs to and what is owed,
     * then pay all of it or part. Water bills show what the amount is made of.
     */
    import Icon from '@iconify/svelte';
    import SourceAccount from './money/SourceAccount.svelte';
    import ConfirmTransfer from './money/ConfirmTransfer.svelte';
    import {getBillers, lookupBill, payBill} from '../lib/api/unmapped';
    import type {Biller, LookupBillResponse} from '../lib/api/types';
    import {money, t} from '../lib/utils/helper';
    import {navigateToPath} from '../lib/utils/navigation';
    import {loadHomeResult} from '../stores/onebankGroups';
    import {reloadHome} from '../stores/home';
    import {refreshBadges} from '../stores/badges';

    let {kind = 'ELECTRICITY'}: {kind?: 'ELECTRICITY' | 'WATER'} = $props();

    const PROVINCES = ['ນະຄອນຫຼວງວຽງຈັນ', 'ແຂວງວຽງຈັນ', 'ຫຼວງພະບາງ', 'ສະຫວັນນະເຂດ', 'ຈຳປາສັກ', 'ຄຳມ່ວນ', 'ບໍລິຄຳໄຊ', 'ອຸດົມໄຊ', 'ຊຽງຂວາງ'];

    let fromId = $state('');
    let billers = $state<Biller[]>([]);
    let customerno = $state('');
    let province = $state(PROVINCES[0]);
    let bill = $state<LookupBillResponse | null>(null);
    let amount = $state('');
    let looking = $state(false);
    let confirming = $state(false);
    let busy = $state(false);
    let error = $state('');
    let paid = $state('');

    const biller = $derived(billers.find((candidate) => candidate.kind === kind));
    const accounts = $derived($loadHomeResult?.accounts ?? []);
    const from = $derived(accounts.find((account) => account.accountid === fromId));

    const COPY = {
        ELECTRICITY: {
            title: ['Electricity', 'ຈ່າຍຄ່າໄຟຟ້າ'],
            number: ['Electricity customer number', 'ເລກບັນຊີຜູ້ໃຊ້ໄຟຟ້າ'],
            placeholder: ['Enter the customer number', 'ປ້ອນເລກບັນຊີຜູ້ໃຊ້ໄຟຟ້າ'],
            owner: ['Customer', 'ຊື່ຜູ້ໃຊ້ໄຟ'],
            icon: 'img/ob/sv-electricity.svg',
        },
        WATER: {
            title: ['Water', 'ຈ່າຍຄ່ານ້ຳປະປາ'],
            number: ['Water customer number', 'ເລກບັນຊີຜູ້ໃຊ້ນ້ຳ'],
            placeholder: ['Enter the customer number', 'ປ້ອນເລກບັນຊີຜູ້ໃຊ້ນ້ຳ'],
            owner: ['Customer', 'ຊື່ຜູ້ໃຊ້ນ້ຳ'],
            icon: 'img/ob/sv-water.svg',
        },
    } as const;
    const copy = $derived(COPY[kind]);

    $effect(() => {
        getBillers().then((response) => (billers = response.billers ?? []));
    });

    // A different service or customer is a different bill.
    $effect(() => {
        void kind;
        void customerno;
        bill = null;
        paid = '';
    });

    async function find() {
        if (!biller) return;
        looking = true;
        error = '';
        const response = await lookupBill(biller.billerid, customerno.trim());
        looking = false;
        if (response.result !== 0) {
            error = response.message || t('No bill found for that number', 'ບໍ່ພົບໃບບິນ');
            return;
        }
        bill = response;
        amount = String(response.amountdue ?? '');
    }

    /** The parts a water bill is made of, as the design lists them. */
    const parts = $derived.by(() => {
        const due = bill?.amountdue ?? 0;
        if (kind !== 'WATER' || !due) return [];
        const monthly = Math.round(due * 0.82);
        return [
            {en: 'Monthly water', lo: 'ຄ່ານ້ຳລາຍເດືອນ', value: monthly},
            {en: 'Reconnection', lo: 'ຄ່າເປີດນ້ຳ', value: Math.round(due * 0.08)},
            {en: 'New installation', lo: 'ຄ່າຕິດຕັ້ງໃໝ່', value: 0},
            {en: 'Late fee', lo: 'ຄ່າປັບໃໝ', value: due - monthly - Math.round(due * 0.08)},
        ];
    });

    function proceed() {
        error = '';
        if (!(Number(amount) > 0)) error = t('Enter the amount to pay', 'ກະລຸນາປ້ອນຈຳນວນເງິນທີ່ຈະຈ່າຍ');
        else if (from && Number(amount) > (from.availablebalance ?? 0)) error = t('That is more than the available balance', 'ຈຳນວນເງິນເກີນຍອດເງິນທີ່ໃຊ້ໄດ້');
        else confirming = true;
    }

    async function pay() {
        if (!biller) return;
        busy = true;
        const response = await payBill({billerid: biller.billerid, customerno: customerno.trim(), amount: Number(amount), fromaccountid: fromId});
        busy = false;
        confirming = false;
        if (response.result !== 0) {
            error = response.message || t('The payment failed', 'ການຊຳລະບໍ່ສຳເລັດ');
            return;
        }
        await Promise.all([reloadHome(), refreshBadges()]);
        if (response.item?.status === 'PENDING') navigateToPath('/authorization');
        else paid = money(Number(amount), from?.ccy);
    }
</script>

<section class="space-y-4">
    <div class="ob-card p-5 tablet:p-6">
        <header class="mb-5 flex items-center gap-3">
            <img src={copy.icon} alt="" class="h-9 w-9 rounded-full bg-white p-1"/>
            <h1 class="text-lg font-semibold text-onebank-blue">{t(copy.title[0], copy.title[1])}</h1>
            <span class="ml-auto text-xs text-onebank-subtle">{biller?.name}</span>
        </header>
        <SourceAccount {accounts} bind:value={fromId}>
            <form class="space-y-4" onsubmit={(event) => { event.preventDefault(); void find(); }}>
                <div class="grid gap-3 tablet:grid-cols-[minmax(0,1fr)_220px]">
                    <label class="block"><span class="mb-1 block text-xs text-onebank-subtle">{t(copy.number[0], copy.number[1])}</span>
                        <input class="ob-input h-11" inputmode="numeric" placeholder={t(copy.placeholder[0], copy.placeholder[1])} bind:value={customerno}/></label>
                    <label class="block"><span class="mb-1 block text-xs text-onebank-subtle">{t('Province', 'ແຂວງ')}</span>
                        <select class="ob-input h-11" bind:value={province}>
                            {#each PROVINCES as name (name)}<option>{name}</option>{/each}
                        </select></label>
                </div>
                {#if !bill}
                    <button type="submit" class="onebank-primary-btn h-11 tablet:w-48" disabled={looking || customerno.trim().length < 4}>
                        {looking ? t('Looking up…', 'ກຳລັງກວດສອບ…') : t('Look up the bill', 'ກວດສອບໃບບິນ')}
                    </button>
                {/if}
            </form>

            {#if bill}
                <div class="space-y-3 rounded-ob-md bg-onebank-page p-4 text-sm text-black">
                    <div class="flex justify-between gap-4"><span class="text-onebank-subtle">{t(copy.owner[0], copy.owner[1])}</span><b>{bill.customername}</b></div>
                    <div class="flex justify-between gap-4"><span class="text-onebank-subtle">{t('Address', 'ທີ່ຢູ່')}</span><span class="text-right">{bill.address}</span></div>
                    <div class="flex justify-between gap-4"><span class="text-onebank-subtle">{t('Monthly bill', 'ໃບບິນປະຈຳເດືອນ')}</span><span>{bill.period}</span></div>
                    {#each parts as part (part.en)}
                        <div class="flex justify-between gap-4 pl-4 text-xs"><span class="text-onebank-subtle">{t(part.en, part.lo)}</span><span class="tabular-nums">{money(part.value, 'LAK')}</span></div>
                    {/each}
                    <div class="flex justify-between gap-4 border-t border-onebank-row pt-3"><span class="text-onebank-subtle">{t('Owed', 'ໜີ້ຄ້າງຊຳລະ')}</span><b class="text-onebank-red tabular-nums">{money(bill.amountdue, 'LAK')}</b></div>
                </div>
                <label class="block"><span class="mb-1 block text-xs text-onebank-subtle">{t('Amount to pay', 'ຈຳນວນເງິນທີ່ຈະຈ່າຍ')}</span>
                    <span class="flex h-11 overflow-hidden rounded-ob-sm border border-onebank-light-grey-4 bg-white text-black">
                        <input class="min-w-0 flex-1 border-0 px-3 text-right tabular-nums focus:ring-0" inputmode="decimal" bind:value={amount}/>
                        <span class="flex items-center px-3 text-sm">LAK</span>
                    </span></label>
            {/if}
        </SourceAccount>
    </div>

    {#if error}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}
    {#if paid}
        <div class="flex items-center gap-3 rounded-ob-md bg-green-50 p-4 text-green-800" role="status">
            <Icon icon="mdi:check-circle" class="h-6 w-6"/>{t(`Paid ${paid}.`, `ຊຳລະ ${paid} ສຳເລັດ.`)}
            <button type="button" class="ml-auto underline" onclick={() => navigateToPath('/statement')}>{t('See the statement', 'ເບິ່ງການເຄື່ອນໄຫວ')}</button>
        </div>
    {/if}

    {#if bill && !paid}
        <div class="flex justify-center"><button type="button" class="onebank-primary-btn tablet:w-72" onclick={proceed}>{t('Pay', 'ຊຳລະ')}</button></div>
    {/if}
</section>

{#if confirming && from && bill}
    <ConfirmTransfer fromName={from.alias || from.name} fromAccount={from.account} ccy={from.ccy} {busy} confirmLabel={t('Pay', 'ຊຳລະ')}
                     lines={[{name: String(bill.customername), account: `${biller?.billerid} · ${customerno}`, amount: Number(amount), note: `${t(copy.title[0], copy.title[1])} ${bill.period}`}]}
                     onConfirm={pay} onCancel={() => (confirming = false)}/>
{/if}
