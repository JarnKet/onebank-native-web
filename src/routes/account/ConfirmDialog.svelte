<script lang="ts">
    /**
     * Yes/no confirmation over the page.
     *
     * Stands in for onebank-ui's `OBDialog`, which is wired to that app's
     * global popup machinery. Escape and the backdrop both cancel, and the
     * backdrop is a button so that works from the keyboard too.
     */
    import {t} from '../../lib/utils/helper';

    let {
        open = false,
        title,
        content = '',
        confirmLabel,
        danger = false,
        busy = false,
        onConfirm,
        onCancel,
    }: {
        open?: boolean
        title: string
        content?: string
        confirmLabel: string
        /** Paints the confirm button red: the action destroys something. */
        danger?: boolean
        busy?: boolean
        onConfirm: () => void
        onCancel: () => void
    } = $props();
</script>

<svelte:window onkeydown={(e) => { if (open && e.key === 'Escape') onCancel() }}/>

{#if open}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <button type="button" class="absolute inset-0 bg-black/40" aria-label={t('Cancel', 'ຍົກເລີກ')} onclick={onCancel}></button>
        <div class="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true">
            <h2 class="text-lg font-semibold text-gray-900">{title}</h2>
            {#if content}
                <p class="mt-2 text-sm text-gray-600">{content}</p>
            {/if}
            <div class="mt-6 flex justify-end gap-3">
                <button type="button" class="onebank-secondary-btn" onclick={onCancel} disabled={busy}>
                    {t('Cancel', 'ຍົກເລີກ')}
                </button>
                <button
                        type="button"
                        class="onebank-primary-btn {danger ? '!bg-red-600 hover:!bg-red-700' : ''}"
                        onclick={onConfirm}
                        disabled={busy}
                >
                    {busy ? t('Working…', 'ກຳລັງດຳເນີນການ…') : confirmLabel}
                </button>
            </div>
        </div>
    </div>
{/if}
