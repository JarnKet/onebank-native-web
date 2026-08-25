<script lang="ts">
    /**
     * The native home page.
     *
     * Until Phase 2 this route rendered nothing and `b1hybrid/MAIN.html` — an
     * iframe holding another iframe of onebank-ui's `HOME.html` — was the home
     * screen. Now this app loads the group's home itself and renders it in
     * process, so `loadhome` is a direct `Connector` call rather than a
     * postMessage round trip through two documents.
     *
     * The menu grid stays a launcher: `openMenu` hands the page name to
     * `showPopup`, which opens a native route when we own the page and a
     * b1hybrid iframe overlay when we do not. That is what lets the server keep
     * driving the grid without this app knowing the whole page universe.
     */
    import Icon from '@iconify/svelte';
    import GroupBanner from './home/GroupBanner.svelte';
    import CustomizeMenus from './home/CustomizeMenus.svelte';
    import HomeGrid from './home/HomeGrid.svelte';
    import {loadHome} from '../lib/api/commands';
    import {t} from '../lib/utils/helper';
    import {showPopup} from '../lib/utils/helper';
    import {adoptLoadHomeResult, currentGroup, loadHomeResult} from '../stores/onebankGroups';
    import {groups, groupsLoading, idVerified} from '../stores/groups';

    let loading = $state(false);
    let error = $state('');

    /**
     * The quick-access customiser. It was a panel swapped into the old
     * two-column layout; the dashboard has no spare column, so it opens over
     * the grid instead.
     */
    let customizing = $state(false);

    /**
     * Loads the active group's home.
     *
     * Keyed on the group id so switching groups reloads, and so a group whose
     * payload is already cached still refreshes rather than showing stale
     * balances.
     */
    async function load(group: string) {
        if (!group) return;
        loading = true;
        error = '';
        try {
            const response = await loadHome(group);
            if (response?.result === 0) adoptLoadHomeResult(response as any);
            else error = response?.message || t('Could not load this group', 'ໂຫຼດຂໍ້ມູນກຸ່ມບໍ່ໄດ້');
        } catch (e) {
            error = (e as Error)?.message || t('Could not load this group', 'ໂຫຼດຂໍ້ມູນກຸ່ມບໍ່ໄດ້');
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        void load($currentGroup);
    });

    const isOwner = $derived($loadHomeResult?.me?.role === 'OWNER');
    // Distinguishes "still finding out" from "genuinely has no groups", so the
    // create-a-group prompt does not flash during boot.
    const hasNoGroups = $derived(!$groupsLoading && $groups.length === 0);
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') customizing = false }}/>

<div class="h-full w-full overflow-y-auto">
    {#if !$idVerified}
        <!-- Parity with MAIN.html:1740: an unverified, pending, under-review or
             failed account gets no OneBank at all. -->
        <div class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-gray-500">
            <Icon icon="mdi:account-alert-outline" width={40} height={40}/>
            <div class="max-w-sm">{t('Your account is not verified yet. OneBank is unavailable until verification completes.', 'ບັນຊີຂອງທ່ານຍັງບໍ່ທັນຢືນຢັນ')}</div>
        </div>
    {:else if hasNoGroups}
        <div class="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <Icon icon="mdi:account-group-outline" width={40} height={40} class="text-gray-400"/>
            <div class="text-gray-600">{t('You are not in a OneBank group yet.', 'ທ່ານຍັງບໍ່ມີກຸ່ມ OneBank')}</div>
            <button class="onebank-primary-btn" onclick={() => showPopup('GROUPMANAGEMENT.html', {newonebank: 1})}>
                {t('Create a group', 'ສ້າງກຸ່ມ')}
            </button>
        </div>
    {:else}
        <div class="bg-gradient-to-tr from-[#ffdedc] via-[#fff2e3] to-[#c8f2fe] bg-[length:100%_66.666%] bg-no-repeat">
            <GroupBanner showGroupMenu={isOwner}/>
        </div>

        {#if error}
            <div class="mx-3 mt-2 flex items-center justify-between gap-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 tablet:mx-6">
                <span>{error}</span>
                <button class="underline" onclick={() => load($currentGroup)}>{t('Retry', 'ລອງໃໝ່')}</button>
            </div>
        {/if}

        {#if loading && !$loadHomeResult}
            <div class="grid grid-cols-1 gap-3 px-3 pt-2 tablet:grid-cols-3 tablet:px-6 desktop:px-8" aria-busy="true">
                {#each Array(3) as _, i (i)}
                    <div class="h-56 animate-pulse rounded-xl bg-gray-100"></div>
                {/each}
            </div>
        {:else}
            <HomeGrid onCustomizeMenus={() => (customizing = true)}/>
        {/if}

        {#if customizing}
            <!-- The customiser is a whole screen on mobile; here it is a dialog
                 so the dashboard behind it keeps its scroll position. The
                 backdrop is a button rather than a div with a click handler, so
                 dismissing it works from the keyboard too. -->
            <div class="fixed inset-0 z-40 flex items-center justify-center p-4">
                <button type="button" class="absolute inset-0 bg-black/40" aria-label={t('Close', 'ປິດ')} onclick={() => (customizing = false)}></button>
                <div class="relative flex h-full max-h-[80vh] w-full max-w-3xl flex-col">
                    <CustomizeMenus onClose={() => (customizing = false)}/>
                </div>
            </div>
        {/if}
    {/if}
</div>
