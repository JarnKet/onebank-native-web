<script lang="ts">
    /**
     * Editing the active group: its picture, name and description, as the
     * design's "Edit group" frame lays them out, with one Save under the card.
     *
     * `color` is round-tripped untouched — nothing in either app offers a
     * colour picker, and saving must not silently change it.
     */
    import GroupProfileFields from '../lib/components/GroupProfileFields.svelte';
    import {changeGroupDetail, loadHome} from '../lib/api/commands';
    import {t} from '../lib/utils/helper';
    import {goHome} from '../lib/utils/navigation';
    import {refreshGroups} from '../stores/groups';
    import {adoptLoadHomeResult, currentGroup, loadHomeResult, patchGroupDetail} from '../stores/onebankGroups';

    let name = $state('');
    let detail = $state('');
    let logo = $state('');
    let color = $state('');

    let loading = $state(false);
    let saving = $state(false);
    let error = $state('');

    /** The group the form currently holds, so a group switch reseeds it. */
    let seededFor = $state('');

    const group = $derived($loadHomeResult?.detail);

    /** Fetches the payload when there is none, as on a deep link to `#/group`. */
    async function ensureLoaded(id: string) {
        if (!id || $loadHomeResult) return;
        loading = true;
        try {
            const response = await loadHome(id);
            if (response?.result === 0) adoptLoadHomeResult(response as any);
            else error = response?.message || t('Could not load this group', 'ໂຫຼດຂໍ້ມູນກຸ່ມບໍ່ໄດ້');
        } catch (e) {
            error = (e as Error)?.message || t('Could not load this group', 'ໂຫຼດຂໍ້ມູນກຸ່ມບໍ່ໄດ້');
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        void ensureLoaded($currentGroup);
    });

    // Seeds once per group. Without the guard, any store write — a widget
    // refresh, a group reload — would throw away what the user has typed.
    $effect(() => {
        const id = $currentGroup;
        if (!group || seededFor === id) return;
        name = group.name ?? '';
        detail = group.detail ?? '';
        color = group.color ?? '';
        logo = group.logoname ?? '';
        seededFor = id;
    });

    async function save() {
        const trimmed = name.trim();
        if (!trimmed || saving) return;
        saving = true;
        error = '';
        try {
            // An empty logoname is how the backend is told to use the default.
            const response = await changeGroupDetail({name: trimmed, detail, color, logoname: logo});
            if (response?.result === 0) {
                patchGroupDetail($currentGroup, {name: trimmed, detail, color, logoname: logo});
                goHome();
                // The tab bar reads the group list, not the cached home.
                void refreshGroups($currentGroup);
            } else {
                error = response?.message || t('Could not save the group', 'ບັນທຶກບໍ່ໄດ້');
            }
        } catch (e) {
            error = (e as Error)?.message || t('Could not save the group', 'ບັນທຶກບໍ່ໄດ້');
        } finally {
            saving = false;
        }
    }
</script>

<div class="w-full space-y-4">
    <h1 class="sr-only">{t('Edit group', 'ແກ້ໄຂກຸ່ມ')}</h1>
    {#if error}
        <div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>
    {/if}

    {#if loading}
        <div class="h-66 animate-pulse rounded-ob-xl bg-white" aria-busy="true"></div>
    {:else}
        <form class="space-y-19" onsubmit={(e) => { e.preventDefault(); void save(); }}>
            <GroupProfileFields bind:name bind:detail bind:logo/>
            <div class="flex justify-center">
                <button type="submit" class="onebank-primary-btn text-xl tablet:w-56" disabled={!name.trim() || saving}>
                    {saving ? t('Saving…', 'ກຳລັງບັນທຶກ…') : t('Save', 'ບັນທຶກ')}
                </button>
            </div>
        </form>
    {/if}
</div>
