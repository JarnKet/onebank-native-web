<script lang="ts">
    /** Widget-sized failure state with a retry. From onebank-ui. */
    import Icon from '@iconify/svelte';
    import {t} from '../../lib/utils/helper';

    let {onRetry}: {onRetry: () => void} = $props();
</script>

<div class="absolute inset-0 z-[8] flex h-full items-center justify-center">
    <div class="flex h-full w-full items-center rounded-xl bg-onebank-base-50 p-4">
        <div class="flex w-full flex-col items-center justify-center text-center">
            <div class="mb-3 flex-shrink-0">
                <Icon icon="mdi:alert-circle" class="text-3xl text-onebank-red"/>
            </div>
            <div class="flex-grow">
                <h2 class="mb-1 text-sm font-semibold text-gray-800">{t('Unable to load data', 'ບໍ່ສາມາດໂຫລດຂໍ້ມູນໄດ້')}</h2>
                <p class="mb-3 text-xs text-gray-600">{t('Please try again', 'ກະລຸນາລອງໃຫມ່ອີກຄັ້ງ')}</p>
                <button class="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500/90" onclick={onRetry}>
                    {t('Try Again', 'ລອງອີກຄັ້ງ')}
                </button>
            </div>
        </div>
    </div>
</div>
