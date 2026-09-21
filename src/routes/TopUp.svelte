<script lang="ts">
    /**
     * Topping up a phone: the number (the carrier is read off its prefix),
     * recent numbers to pick again, quick amounts, then pay.
     */
    import Icon from '@iconify/svelte';
    import SourceAccount from './money/SourceAccount.svelte';
    import ConfirmTransfer from './money/ConfirmTransfer.svelte';
    import {payBill, viewTransactions} from '../lib/api/commands';
    import {formatMoney, money, t} from '../lib/utils/helper';
    import {navigateToPath} from '../lib/utils/navigation';
    import {currentGroup, loadHomeResult} from '../stores/onebankGroups';
    import {reloadHome} from '../stores/home';
    import {refreshBadges} from '../stores/badges';

    const AMOUNTS = [10_000, 15_000, 25_000, 50_000, 100_000, 200_000];
    const CARRIERS: Record<string, {id: string; name: [string, string]; color: string}> = {
        '9': {id: 'UNITEL', name: ['Unitel', 'ຢູນິເທວ'], color: '#e4032e'},
        '7': {id: 'TPLUS', name: ['T-Plus', 'ທີພລັສ'], color: '#f7941d'},
        '5': {id: 'LTC', name: ['Lao Telecom', 'ລາວໂທລະຄົມ'], color: '#0068b5'},
        '2': {id: 'ETL', name: ['ETL', 'ອີທີແອລ'], color: '#00a651'},
    };

    let fromId = $state('');
    let phone = $state('');
    let amount = $state('');
    let recent = $state<string[]>([]);
    let confirming = $state(false);
    let busy = $state(false);
    let error = $state('');
    let paid = $state('');

    const accounts = $derived($loadHomeResult?.accounts ?? []);
    const from = $derived(accounts.find((account) => account.accountid === fromId));
    const digits = $derived(phone.replace(/\D/g, ''));
    /** Lao mobile numbers are 020 + 8 digits; the digit after 020 names the carrier. */
    const carrier = $derived(digits.startsWith('20') ? CARRIERS[digits[2]] : digits.startsWith('020') ? CARRIERS[digits[3]] : undefined);
    const valid = $derived(/^0?20\d{8}$/.test(digits));

    $effect(() => {
        const group = $currentGroup;
        if (!group) return;
        viewTransactions(group).then((response) => {
            const numbers = (response.items ?? []).filter((tx) => tx.service === 'TOPUP').map((tx) => String(tx.detail?.TOACCOUNTNO ?? ''));
            recent = [...new Set([...numbers, '02095555555', '02075555555', '02055555555'])].slice(0, 5);
        });
    });

    function pretty(number: string): string {
        const clean = number.replace(/\D/g, '').replace(/^0?20/, '');
        return `020 ${clean.slice(0, 4)} ${clean.slice(4)}`.trim();
    }

    function proceed() {
        error = '';
        if (!valid) error = t('Enter a Lao mobile number: 020 and 8 digits', 'ກະລຸນາປ້ອນເບີໂທ 020 ແລະ 8 ຕົວເລກ');
        else if (!carrier) error = t('That number is not on a carrier we top up', 'ບໍ່ຮອງຮັບເບີນີ້');
        else if (!(Number(amount) >= 5_000)) error = t('The smallest top-up is 5,000 LAK', 'ຕື່ມຢ່າງໜ້ອຍ 5,000 ກີບ');
        else confirming = true;
    }

    async function pay() {
        if (!carrier) return;
        busy = true;
        const response = await payBill({billerid: carrier.id, customerno: digits, amount: Number(amount), fromaccountid: fromId});
        busy = false;
        confirming = false;
        if (response.result !== 0) {
            error = response.message || t('The top-up failed', 'ຕື່ມເງິນບໍ່ສຳເລັດ');
            return;
        }
        await Promise.all([reloadHome(), refreshBadges()]);
        if (response.item?.status === 'PENDING') navigateToPath('/authorization');
        else paid = `${money(Number(amount), 'LAK')} → ${pretty(digits)}`;
    }
</script>

<section class="space-y-4">
    <div class="ob-card p-5 tablet:p-6">
        <header class="mb-5 flex items-center gap-3">
            <img src="img/ob/sv-phone.svg" alt="" class="h-9 w-9 rounded-full bg-white p-1"/>
            <h1 class="text-lg font-semibold text-onebank-blue">{t('Top up a phone', 'ຕື່ມເງິນໂທລະສັບ')}</h1>
        </header>
        <SourceAccount {accounts} bind:value={fromId}>
            <div class="space-y-4">
                <label class="block"><span class="mb-1 block text-xs text-onebank-subtle">{t('Phone number', 'ເບີໂທລະສັບ')}</span>
                    <span class="flex h-11 items-center gap-2 overflow-hidden rounded-ob-sm border border-onebank-light-grey-4 bg-white pr-3 text-black">
                        <input class="min-w-0 flex-1 border-0 px-3 tabular-nums focus:ring-0" inputmode="tel" placeholder="020 5555 5555" bind:value={phone}/>
                        {#if carrier}
                            <span class="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white" style="background-color: {carrier.color}">{t(carrier.name[0], carrier.name[1])}</span>
                        {/if}
                    </span></label>

                <div>
                    <p class="mb-1.5 text-xs text-onebank-subtle">{t('Recent numbers', 'ເບີທີ່ໃຊ້ລ່າສຸດ')}</p>
                    <div class="flex flex-wrap gap-2">
                        {#each recent as number (number)}
                            {@const who = CARRIERS[number.replace(/^0?20/, '')[0]]}
                            <button type="button" class="rounded-ob-sm bg-onebank-page px-3 py-1.5 text-left text-xs text-black hover:bg-onebank-pink" onclick={() => (phone = pretty(number))}>
                                <span class="block font-semibold tabular-nums">{pretty(number)}</span>
                                <span class="text-onebank-subtle">{who ? t(who.name[0], who.name[1]) : ''} · {t('prepaid', 'ເບີຕື່ມເງິນ')}</span>
                            </button>
                        {/each}
                    </div>
                </div>

                <div>
                    <p class="mb-1.5 text-xs text-onebank-subtle">{t('Amount', 'ຈຳນວນເງິນ')}</p>
                    <div class="grid grid-cols-3 gap-2">
                        {#each AMOUNTS as value (value)}
                            <button type="button" aria-pressed={Number(amount) === value}
                                    class="h-10 rounded-ob-sm text-sm font-semibold tabular-nums {Number(amount) === value ? 'bg-onebank-red text-white' : 'bg-onebank-page text-black hover:bg-onebank-pink'}"
                                    onclick={() => (amount = String(value))}>{formatMoney(value, 0)} {t('LAK', 'ກີບ')}</button>
                        {/each}
                    </div>
                    <span class="mt-2 flex h-11 overflow-hidden rounded-ob-sm border border-onebank-light-grey-4 bg-white text-black">
                        <input class="min-w-0 flex-1 border-0 px-3 text-right tabular-nums focus:ring-0" inputmode="numeric"
                               placeholder={t('Or enter an amount', 'ປ້ອນຈຳນວນທີ່ຈະຈ່າຍ')} aria-label={t('Amount', 'ຈຳນວນເງິນ')} bind:value={amount}/>
                        <span class="flex items-center px-3 text-sm">LAK</span>
                    </span>
                </div>
            </div>
        </SourceAccount>
    </div>

    {#if error}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}
    {#if paid}
        <div class="flex items-center gap-3 rounded-ob-md bg-green-50 p-4 text-green-800" role="status"><Icon icon="mdi:check-circle" class="h-6 w-6"/>{t(`Topped up ${paid}.`, `ຕື່ມເງິນ ${paid} ສຳເລັດ.`)}</div>
    {/if}
    <div class="flex justify-center"><button type="button" class="onebank-primary-btn tablet:w-72" onclick={proceed}>{t('Pay', 'ຊຳລະ')}</button></div>
</section>

{#if confirming && from && carrier}
    <ConfirmTransfer fromName={from.alias || from.name} fromAccount={from.account} ccy={from.ccy} {busy} confirmLabel={t('Pay', 'ຊຳລະ')}
                     lines={[{name: t(carrier.name[0], carrier.name[1]), account: pretty(digits), amount: Number(amount), note: t('Phone top-up', 'ຕື່ມເງິນໂທລະສັບ')}]}
                     onConfirm={pay} onCancel={() => (confirming = false)}/>
{/if}
