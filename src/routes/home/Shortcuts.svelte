<script lang="ts">
    /**
     * The user's shortcut row: up to ten menus as cards, plus an "add" tile.
     *
     * Harvested from onebank-ui `pages/HOME/components/Shortcuts.svelte`. That
     * file rebuilds the launch parameter bundle itself — one of four copies in
     * that repo that have already drifted apart — so this calls `openMenu`,
     * which builds it once. Its "add" tile pushed the in-page step router to
     * `CUSTOMIZE`; here it is a callback, so the route owns the modal.
     */
    import Icon from '@iconify/svelte';
    import MenuIcon from './MenuIcon.svelte';
    import {menus} from '../../lib/menus';
    import {sortSelected} from './quickAccess';
    import {isUsable, openMenu} from './openMenu';
    import {t} from '../../lib/utils/helper';
    import {loadHomeResult} from '../../stores/onebankGroups';

    let {onAdd}: {onAdd: () => void} = $props();

    const usablemenus = $derived($loadHomeResult?.usablemenus);
    const visible = $derived(
        sortSelected($loadHomeResult?.homemenus ?? [])
            .map((menu) => menu.name)
            .filter((name) => isUsable(usablemenus, name) && menus[name])
            .slice(0, 10),
    );
</script>

<div class="onebank-card flex h-full flex-col">
    <div class="flex flex-wrap items-start gap-2 overflow-y-auto">
        {#if visible.length === 0}
            <div class="flex h-full w-full items-center justify-center py-2 text-gray-500">
                {t('No quick access menu', 'ບໍ່ມີເມນູລັດ')}
            </div>
        {/if}
        {#each visible as name (name)}
            <div class="flex min-w-28 max-w-32 flex-col items-center justify-center rounded-lg border border-gray-100">
                <MenuIcon menu={menus[name]} large onclick={() => openMenu(name)}/>
            </div>
        {/each}
        <button
                class="flex min-w-28 max-w-32 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 p-2 text-gray-400 transition hover:bg-gray-50"
                onclick={onAdd}
        >
            <Icon icon="mdi:plus" class="h-12 w-12 tablet:h-14 tablet:w-14"/>
            <span class="text-center text-xs font-medium tablet:text-sm">{t('Add shortcut', 'ເພີ່ມຟັງຊັ່ນລັດ')}</span>
        </button>
    </div>
</div>
