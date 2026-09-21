<script lang="ts">
    /**
     * The confirmation card: the sender on the left, the receiver on the
     * right, the amount in red between — then cancel or send. The Figma draws
     * it black; it is a white card here, like every other surface.
     */
    import Icon from '@iconify/svelte';
    import {fade, scale} from 'svelte/transition';
    import {initials, maskAccount, money, t} from '../../lib/utils/helper';

    let {
        fromName,
        fromAccount,
        ccy,
        lines,
        fee = 0,
        schedule = '',
        busy = false,
        confirmLabel = t('Transfer', 'ໂອນເງິນ'),
        onConfirm,
        onCancel,
    }: {
        fromName: string
        fromAccount: string
        ccy: string
        lines: Array<{name: string; account: string; amount: number; note?: string}>
        fee?: number
        /** Shown when the transfer is scheduled rather than sent now. */
        schedule?: string
        busy?: boolean
        confirmLabel?: string
        onConfirm: () => void
        onCancel: () => void
    } = $props();

    const total = $derived(lines.reduce((sum, line) => sum + line.amount, 0) + fee * lines.length);
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape' && !busy) onCancel(); }}/>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" transition:fade={{duration: 150}}>
    <div class="w-full max-w-2xl" role="dialog" aria-modal="true" aria-label={t('Confirm the transfer', 'ຢືນຢັນການໂອນ')} transition:scale={{duration: 150, start: 0.96}}>
        <div class="ob-card p-8">
            <div class="flex items-start justify-between gap-6">
                <div class="flex min-w-0 flex-col items-center gap-2 text-center">
                    <span class="flex h-16 w-16 items-center justify-center rounded-full bg-onebank-light-grey-4 font-semibold text-black">{initials(fromName)}</span>
                    <p class="truncate text-sm font-semibold">{fromName}</p>
                    <p class="text-xs text-onebank-subtle">{ccy} {maskAccount(fromAccount)}</p>
                </div>
                <Icon icon="mdi:chevron-triple-right" class="mt-5 h-8 w-8 shrink-0 text-onebank-muted"/>
                <div class="flex min-w-0 flex-col items-center gap-2 text-center">
                    <span class="flex h-16 w-16 items-center justify-center rounded-full bg-onebank-light-grey-4 font-semibold text-black">
                        {lines.length === 1 ? initials(lines[0].name) : lines.length}
                    </span>
                    <p class="truncate text-sm font-semibold">{lines.length === 1 ? lines[0].name : t(`${lines.length} recipients`, `${lines.length} ບັນຊີ`)}</p>
                    {#if lines.length === 1}<p class="text-xs text-onebank-subtle">{lines[0].account}</p>{/if}
                </div>
            </div>
            <div class="mt-8 flex justify-between gap-6">
                <div>
                    <p class="text-xs text-onebank-subtle">{t('Amount', 'ຈຳນວນເງິນ')}</p>
                    <p class="text-2xl font-bold text-onebank-expense tabular-nums">{money(total, ccy)}</p>
                    {#if fee}<p class="text-xs text-onebank-subtle">{t('Includes a fee of', 'ລວມຄ່າທຳນຽມ')} {money(fee * lines.length, ccy)}</p>{/if}
                </div>
                <div class="text-right">
                    <p class="text-xs text-onebank-subtle">{schedule ? t('Scheduled for', 'ກຳນົດເວລາ') : t('Description', 'ຄຳອະທິບາຍ')}</p>
                    <p class="text-sm">{schedule || (lines.length === 1 ? lines[0].note || '—' : '—')}</p>
                </div>
            </div>
            {#if lines.length > 1}
                <ul class="mt-5 max-h-40 space-y-1 overflow-y-auto border-t border-onebank-row pt-3 text-xs">
                    {#each lines as line, index (index)}
                        <li class="flex justify-between gap-3"><span class="truncate">{line.name} · {line.account}</span><span class="tabular-nums">{money(line.amount, ccy)}</span></li>
                    {/each}
                </ul>
            {/if}
        </div>
        <div class="mt-4 flex gap-4">
            <button type="button" class="h-11 flex-1 rounded-ob-sm bg-onebank-light-grey-4 font-semibold disabled:opacity-50" disabled={busy} onclick={onCancel}>{t('Cancel', 'ຍົກເລີກ')}</button>
            <button type="button" class="h-11 flex-1 rounded-ob-sm bg-onebank-red font-semibold text-white disabled:opacity-50" disabled={busy} onclick={onConfirm}>
                {busy ? t('Sending…', 'ກຳລັງສົ່ງ…') : confirmLabel}
            </button>
        </div>
    </div>
</div>
