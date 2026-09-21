<script lang="ts">
    /**
     * An account you can pick: the card the design uses wherever accounts are
     * chosen (adding to a group, creating a OneBank, granting a member access).
     * Selected, it takes the red outline and the ticked box.
     */
    import Icon from '@iconify/svelte';
    import type {Account} from '../../definition';
    import {initials, maskAccount, money, t} from '../utils/helper';

    let {
        account,
        selected = false,
        multiple = true,
        name = 'account',
        onToggle,
    }: {
        account: Account
        selected?: boolean
        /** A checkbox when true, a radio in group `name` otherwise. */
        multiple?: boolean
        name?: string
        onToggle: () => void
    } = $props();

    const CCY_COLOR: Record<string, string> = {LAK: '#03a9f4', USD: '#00c853', THB: '#ff8f00', CNY: '#e53935'};
    const TYPE: Record<string, [string, string]> = {
        SAVING: ['Saving', 'Saving'],
        CURRENT: ['Current', 'Current'],
        VIRTUAL: ['Main', 'ບັນຊີຫຼັກ'],
        SHADOW: ['Shadow', 'ບັນຊີເງົາ'],
        STANDARD: ['Retirement', 'Retirement'],
    };
    const type = $derived(TYPE[account.type] ?? [account.type, account.type]);
</script>

<label class="relative flex cursor-pointer gap-3 rounded-ob-xl border-2 bg-white p-4 shadow-ob-card transition-colors
              {selected ? 'border-onebank-red' : 'border-transparent hover:border-onebank-pink-2'}">
    <input type={multiple ? 'checkbox' : 'radio'} {name} class="peer sr-only" checked={selected} onchange={onToggle}/>
    <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-onebank-light-grey-4 text-sm font-semibold text-white">
        {initials(account.alias || account.name)}
    </span>
    <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-bold">{maskAccount(account.account)}</span>
        <span class="block truncate text-xs">{account.name}</span>
        <span class="block text-xs tabular-nums">{money(account.availablebalance, account.ccy)}</span>
        <span class="mt-2 flex gap-2">
            <span class="inline-flex h-5 w-16 items-center justify-center rounded-full text-[11px] text-white"
                  style="background-color: {CCY_COLOR[account.ccy] ?? '#9d9fa3'}">{account.ccy}</span>
            <span class="inline-flex h-5 items-center justify-center rounded-full bg-onebank-light-grey-2 px-4 text-[11px]">{t(type[0], type[1])}</span>
        </span>
    </span>
    <span class="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-sm border
                 {selected ? 'border-onebank-red bg-onebank-red text-white' : 'border-onebank-muted bg-white'}
                 peer-focus-visible:ring-2 peer-focus-visible:ring-onebank-red" aria-hidden="true">
        {#if selected}<Icon icon="mdi:check-bold" class="h-3 w-3"/>{/if}
    </span>
</label>
