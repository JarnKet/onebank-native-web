<script lang="ts">
    /**
     * A dialog as the design draws them: a white 20px card, centred title,
     * over a dimmed page. Escape and the backdrop close it; focus moves into
     * it on open and back to whatever had it on close.
     */
    import type {Snippet} from 'svelte';
    import {fade, scale} from 'svelte/transition';
    import {t} from '../utils/helper';

    let {
        title = '',
        size = 'md',
        onClose,
        children,
        footer,
    }: {
        title?: string
        size?: 'sm' | 'md' | 'lg' | 'xl'
        onClose?: () => void
        children?: Snippet
        footer?: Snippet
    } = $props();

    const WIDTH = {sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl'};

    function focusFirst(node: HTMLElement) {
        const previous = document.activeElement as HTMLElement | null;
        const target = node.querySelector<HTMLElement>('[autofocus], input, textarea, select, button:not([data-close])') ?? node;
        target.focus();
        return () => previous?.focus?.();
    }
</script>

<svelte:window onkeydown={(event) => { if (event.key === 'Escape') onClose?.() }}/>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4" transition:fade={{duration: 150}}>
    <button type="button" data-close class="absolute inset-0 cursor-default bg-black/40" tabindex="-1"
            aria-label={t('Close', 'ປິດ')} onclick={() => onClose?.()}></button>
    <div class="relative flex max-h-[90vh] w-full {WIDTH[size]} flex-col overflow-hidden rounded-ob-xl bg-white shadow-ob-card"
         role="dialog" aria-modal="true" aria-label={title} tabindex="-1"
         transition:scale={{duration: 150, start: 0.96}} {@attach focusFirst}>
        {#if title}
            <h2 class="px-6 pt-6 text-center text-xl font-bold">{title}</h2>
        {/if}
        <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {@render children?.()}
        </div>
        {#if footer}
            <div class="flex flex-wrap justify-center gap-3 px-6 pb-6">
                {@render footer()}
            </div>
        {/if}
    </div>
</div>
