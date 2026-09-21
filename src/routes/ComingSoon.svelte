<script lang="ts">
    /**
     * Where a menu tile goes when its service has no screen in this app.
     *
     * BCEL One offers dozens of services (leasing, insurance, taxes...) that
     * the web design does not cover. Their tiles still open *something*: a
     * plain page saying so, with a way back, never a blank frame.
     */
    import Icon from '@iconify/svelte';
    import {menus} from '../lib/menus';
    import {goHome} from '../lib/utils/navigation';
    import {t} from '../lib/utils/helper';

    let {params = {}}: {params?: {key?: string}} = $props();

    const entry = $derived(params.key ? menus[decodeURIComponent(params.key)] : undefined);
</script>

<section class="flex h-full flex-col items-center justify-center gap-4 rounded-ob-lg bg-white p-10 text-center">
    {#if entry}
        <img src="img/{entry.filename}" alt="" class="h-16 w-16"/>
    {:else}
        <Icon icon="mdi:tools" class="h-16 w-16 text-onebank-grey-2"/>
    {/if}
    <h1 class="text-xl font-semibold text-gray-900">{entry?.name ?? t('Service', 'ບໍລິການ')}</h1>
    <p class="max-w-md text-sm text-gray-500">
        {t('This service is not available on OneBank web yet. Use the BCEL One app for now.', 'ບໍລິການນີ້ຍັງບໍ່ທັນເປີດໃຫ້ໃຊ້ໃນ OneBank ເວັບ. ກະລຸນາໃຊ້ແອັບ BCEL One ໄປກ່ອນ.')}
    </p>
    <button type="button" class="onebank-primary-btn" onclick={goHome}>{t('Back to home', 'ກັບໜ້າຫຼັກ')}</button>
</section>
