<script lang="ts">
    /** Placeholder shown in a hidden widget's slot, restoring it on click. */
    import Icon from '@iconify/svelte';
    import {t} from '../../lib/utils/helper';

    let {onRestore}: {onRestore: () => void} = $props();
</script>

<button onclick={onRestore} class="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl bg-onebank-base-50">
    <span class="flex items-center gap-2">
        <Icon icon="mdi:eye-off" class="h-5 w-5 text-gray-600"/>
        <span class="font-medium text-gray-700">{t('Hidden', 'ເຊື່ອງໄວ້')}</span>
    </span>
    <span class="text-sm text-gray-800">{t('Tap to view', 'ແຕະເພື່ອເບິ່ງ')}</span>
</button>
