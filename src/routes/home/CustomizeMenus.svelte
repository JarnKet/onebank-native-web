<script lang="ts">
    /**
     * Choosing which menus appear in the quick-access grid.
     *
     * Replaces onebank-ui's `StepCustomize`. Selection is capped at ten, and
     * position in the list becomes `rank`, which is what the grid sorts by.
     *
     * On success the cached home payload is patched in place rather than
     * re-fetched — same as mobile, and it keeps the grid from flickering. On
     * failure nothing is patched and the error is shown; the mobile version
     * originally left its loading overlay up forever on this path.
     */
    import MenuIcon from './MenuIcon.svelte';
    import {menus} from '../../lib/menus';
    import {availableMenuGroups} from './menuGroups';
    import {isUsable} from './openMenu';
    import {saveHomeMenus} from '../../lib/api/commands';
    import {t} from '../../lib/utils/helper';
    import {currentGroup, loadHomeResult, onebankGroups} from '../../stores/onebankGroups';
    import type {Menu} from '../../definition';

    let {onClose}: {onClose: () => void} = $props();

    const MAX_QUICK_ACCESS = 10;

    /** Selected menu names, in the order that becomes their rank. */
    let selected = $state<string[]>(
        [...($loadHomeResult?.homemenus ?? [])]
            .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
            .map((menu) => menu.name),
    );
    let saving = $state(false);
    let error = $state('');

    const usablemenus = $derived($loadHomeResult?.usablemenus);
    const groups = $derived(availableMenuGroups($loadHomeResult?.allmenus));
    const full = $derived(selected.length >= MAX_QUICK_ACCESS);

    function toggle(key: string) {
        error = '';
        if (selected.includes(key)) {
            selected = selected.filter((name) => name !== key);
        } else if (!full) {
            selected = [...selected, key];
        }
    }

    async function save() {
        saving = true;
        error = '';
        // Rank is 1-based and mirrors the order shown, so the grid's sort
        // reproduces exactly what the user arranged here.
        const payload: Menu[] = selected.map((name, index) => {
            const existing = $loadHomeResult?.homemenus?.find((menu) => menu.name === name);
            return {name, rank: index + 1, count: existing?.count ?? 0, groupName: existing?.groupName};
        });
        try {
            const response = await saveHomeMenus(payload);
            if (response?.result === 0) {
                const group = $currentGroup;
                onebankGroups.update((all) => {
                    const entry = all[group];
                    if (!entry?.loadHomeResult) return all;
                    return {...all, [group]: {...entry, loadHomeResult: {...entry.loadHomeResult, homemenus: payload}}};
                });
                onClose();
            } else {
                error = response?.message || t('Something went wrong', 'ມີບາງຢ່າງຜິດພາດ');
            }
        } catch (e) {
            error = (e as Error)?.message || t('Something went wrong', 'ມີບາງຢ່າງຜິດພາດ');
        } finally {
            saving = false;
        }
    }
</script>

<div class="flex flex-col">
    <div class="mb-3 flex items-center justify-between gap-2">
        <p class="text-sm text-onebank-subtle">{t('Pick up to ten', 'ເລືອກໄດ້ເຖິງ 10')} · {selected.length}/{MAX_QUICK_ACCESS}</p>
        <div class="flex gap-2">
            <button type="button" class="h-10 rounded-ob-xl border-2 border-onebank-blue bg-white text-onebank-blue hover:bg-onebank-blue-soft px-5 text-sm font-bold" onclick={onClose}>{t('Cancel', 'ຍົກເລີກ')}</button>
            <button type="button" class="h-10 rounded-ob-xl bg-onebank-red px-5 text-sm font-bold text-white disabled:opacity-50" onclick={save} disabled={saving}>
                {saving ? t('Saving…', 'ກຳລັງບັນທຶກ…') : t('Save', 'ບັນທຶກ')}
            </button>
        </div>
    </div>

    {#if error}
        <div class="mx-3 mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</div>
    {/if}

    <div>
        {#each groups as group (Object.keys(group)[0])}
            {@const name = Object.keys(group)[0]}
            {@const keys = Object.values(group)[0]}
            <div class="mb-4">
                <div class="mb-1 text-sm font-medium text-gray-600">{name}</div>
                <div class="grid grid-cols-4 gap-1 tablet:grid-cols-5">
                    {#each keys as key (key)}
                        {#if menus[key]}
                            {@const chosen = selected.includes(key)}
                            <div class="relative">
                                <MenuIcon
                                        menu={menus[key]}
                                        hasPin={chosen}
                                        usable={isUsable(usablemenus, key) && (chosen || !full)}
                                        onclick={() => { if (isUsable(usablemenus, key)) toggle(key) }}
                                />
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
        {/each}
    </div>
</div>
