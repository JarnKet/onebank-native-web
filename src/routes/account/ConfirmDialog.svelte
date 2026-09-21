<script lang="ts">
    /** A yes/no question over the page, in the design's dialog style. */
    import Modal from '../../lib/components/Modal.svelte';
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
        danger?: boolean
        busy?: boolean
        onConfirm: () => void
        onCancel: () => void
    } = $props();
</script>

{#if open}
    <Modal {title} size="sm" onClose={onCancel}>
        {#if content}<p class="text-center text-base text-onebank-subtle">{content}</p>{/if}
        {#snippet footer()}
            <button type="button" class="onebank-secondary-btn tablet:min-w-36" onclick={onCancel} disabled={busy}>{t('Cancel', 'ຍົກເລີກ')}</button>
            <button type="button" class="onebank-primary-btn tablet:min-w-36 {danger ? 'bg-onebank-dark-red' : ''}" onclick={onConfirm} disabled={busy}>
                {busy ? t('Working…', 'ກຳລັງດຳເນີນການ…') : confirmLabel}
            </button>
        {/snippet}
    </Modal>
{/if}
