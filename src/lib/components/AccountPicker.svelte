<script lang="ts">
    /**
     * Choosing one of the group's accounts: the rounded pill with a currency
     * chip and a masked number that sits in every chart header and form in the
     * design. A native <select> under the hood would not take the chip, so this
     * is a listbox with arrow-key support.
     */
    import Icon from '@iconify/svelte';
    import CcyBadge from './CcyBadge.svelte';
    import type {Account} from '../../definition';
    import {formatMoney, maskAccount, t} from '../utils/helper';
    import {clickOutside} from '../attachments/clickOutside';

    let {
        accounts,
        value = $bindable(''),
        showBalance = false,
        showName = false,
        size = 'md',
        label = t('Account', 'ບັນຊີ'),
    }: {
        accounts: Account[]
        value?: string
        showBalance?: boolean
        showName?: boolean
        size?: 'sm' | 'md'
        label?: string
    } = $props();

    let open = $state(false);
    const selected = $derived(accounts.find((account) => account.accountid === value));

    function pick(accountid: string) {
        value = accountid;
        open = false;
    }

    function onKey(event: KeyboardEvent) {
        if (event.key === 'Escape') open = false;
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const index = accounts.findIndex((account) => account.accountid === value);
        const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + accounts.length) % accounts.length;
        if (accounts[next]) value = accounts[next].accountid;
    }
</script>

<div class="relative" {@attach clickOutside(() => (open = false))}>
    <button type="button"
            class="flex w-full items-center gap-2 rounded-ob-sm border border-[#d9d9d9] bg-white text-left transition-colors hover:border-onebank-muted
                   {size === 'sm' ? 'h-8 px-2 text-xs' : 'h-11 px-3 text-base'}"
            aria-haspopup="listbox" aria-expanded={open} aria-label={label}
            onclick={() => (open = !open)} onkeydown={onKey}>
        {#if selected}
            <CcyBadge ccy={selected.ccy}/>
            <span class="min-w-0 flex-1">
                <span class="block truncate font-medium">{maskAccount(selected.account)}</span>
                {#if showName}<span class="block truncate text-xs text-onebank-subtle">{selected.alias || selected.name}</span>{/if}
            </span>
        {:else}
            <span class="flex-1 text-onebank-muted">{t('Choose an account', 'ເລືອກບັນຊີ')}</span>
        {/if}
        <Icon icon="mdi:chevron-down" class="h-5 w-5 shrink-0 text-onebank-subtle transition-transform {open ? 'rotate-180' : ''}"/>
    </button>

    {#if open}
        <ul class="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 min-w-64 overflow-y-auto rounded-ob-sm bg-white py-1 shadow-ob-card" role="listbox">
            {#each accounts as account (account.accountid)}
                <li>
                    <button type="button" role="option" aria-selected={account.accountid === value}
                            class="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-onebank-pink
                                   {account.accountid === value ? 'bg-onebank-pink' : ''}"
                            disabled={account.status === 'LOCKED'}
                            onclick={() => pick(account.accountid)}>
                        <CcyBadge ccy={account.ccy}/>
                        <span class="min-w-0 flex-1">
                            <span class="block truncate text-sm font-medium">{maskAccount(account.account)}</span>
                            <span class="block truncate text-xs text-onebank-subtle">
                                {account.alias || account.name}{account.status === 'LOCKED' ? ` · ${t('Locked', 'ລັອກ')}` : ''}
                            </span>
                        </span>
                        {#if showBalance}
                            <span class="text-right text-sm font-semibold tabular-nums">{formatMoney(account.availablebalance)}</span>
                        {/if}
                    </button>
                </li>
            {/each}
        </ul>
    {/if}
</div>
