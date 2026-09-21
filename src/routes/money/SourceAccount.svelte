<script lang="ts">
    /**
     * "Transfer from": the chosen account, big and pink with its balance, and
     * the group's other accounts beside it to switch to — the left and right
     * halves of the design's black transfer panel.
     */
    import type {Snippet} from 'svelte';
    import type {Account} from '../../definition';
    import {formatMoney, initials, maskAccount, t} from '../../lib/utils/helper';

    let {
        accounts,
        value = $bindable(''),
        children,
    }: {
        accounts: Account[]
        value?: string
        /** The form under "Transfer to", beside the account list. */
        children?: Snippet
    } = $props();

    const usable = $derived(accounts.filter((account) => account.status !== 'LOCKED' && !account.viewonly));
    const selected = $derived(usable.find((account) => account.accountid === value));

    $effect(() => {
        if (!usable.some((account) => account.accountid === value)) value = usable[0]?.accountid ?? '';
    });

    const TYPE: Record<string, [string, string]> = {VIRTUAL: ['main', 'ບັນຊີຫຼັກ'], SHADOW: ['shadow', 'ບັນຊີເງົາ']};
    const SYMBOL: Record<string, string> = {LAK: '₭', USD: '$', THB: '฿', CNY: '¥'};
</script>

<div class="grid gap-5 laptop:grid-cols-[minmax(0,1fr)_280px]">
    <div class="min-w-0 space-y-5">
        <div>
            <p class="mb-2 text-sm">{t('Transfer from', 'ໂອນຈາກ')}</p>
            {#if selected}
                <div class="flex items-center gap-4 rounded-ob-md bg-onebank-pink p-4 text-black">
                    <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-onebank-light-grey-4 text-sm font-semibold text-white">{initials(selected.name)}</span>
                    <div class="min-w-0 flex-1">
                        <p class="truncate font-bold">{selected.name}
                            {#if TYPE[selected.type]}<span class="ml-2 text-xs font-normal">({t(TYPE[selected.type][0], TYPE[selected.type][1])})</span>{/if}
                        </p>
                        <p class="text-sm">{selected.ccy} {maskAccount(selected.account)}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-xs text-onebank-subtle">{t('Available balance', 'ຍອດເງິນທີ່ໃຊ້ໄດ້')}</p>
                        <p class="text-lg font-bold tabular-nums">{SYMBOL[selected.ccy] ?? selected.ccy} {formatMoney(selected.availablebalance, selected.ccy === 'LAK' ? 0 : 2)}</p>
                    </div>
                </div>
            {:else}
                <p class="rounded-ob-md bg-onebank-page p-4 text-sm">{t('This group has no account you can move money from.', 'ກຸ່ມນີ້ບໍ່ມີບັນຊີທີ່ສາມາດໂອນເງິນໄດ້.')}</p>
            {/if}
        </div>
        {@render children?.()}
    </div>

    <ul class="space-y-2.5" aria-label={t('Choose the source account', 'ເລືອກບັນຊີຕົ້ນທາງ')}>
        {#each usable as account (account.accountid)}
            {@const on = account.accountid === value}
            <li>
                <button type="button" aria-pressed={on} onclick={() => (value = account.accountid)}
                        class="flex w-full items-center gap-3 rounded-ob-md border-2 p-3 text-left text-black transition-colors
                               {on ? 'border-onebank-red bg-onebank-pink' : 'border-transparent bg-onebank-page hover:bg-onebank-pink/60'}">
                    <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-onebank-light-grey-4 text-[11px] font-semibold text-white">{initials(account.alias || account.name)}</span>
                    <span class="min-w-0 flex-1">
                        <span class="block truncate text-xs font-bold">{maskAccount(account.account)}</span>
                        <span class="block truncate text-[11px]">{account.alias || account.name}</span>
                        <span class="block text-[11px] tabular-nums">{account.ccy} {formatMoney(account.availablebalance)}</span>
                    </span>
                </button>
            </li>
        {/each}
    </ul>
</div>
