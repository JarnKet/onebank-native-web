<script lang="ts">
    /**
     * Switching between OneBank groups, and creating, joining or leaving one.
     *
     * This replaces `MAIN.html`'s horizontal tab strip. The sidebar already
     * shows the active group's logo, name and members, so the switcher is a
     * disclosure on that card rather than a second navigation surface.
     *
     * It also absorbs the floating "Create / Join" pill that used to sit over
     * the content area in `FrameContainer`. The actions are unchanged — each
     * opens `GROUPMANAGEMENT.html` with the flag that page expects — only the
     * trigger moved.
     */
    import Icon from '@iconify/svelte';
    import {selectGroup, groups, groupsLoading} from '../stores/groups';
    import {currentGroup} from '../stores/onebankGroups';
    import {showPopup, t} from '../lib/utils/helper';
    import {goHome} from '../lib/utils/navigation';

    let {expand = true}: {expand?: boolean} = $props();

    let open = $state(false);

    const active = $derived($groups.find((group) => group.onebankid === $currentGroup));

    function choose(onebankid: string) {
        open = false;
        if (onebankid === $currentGroup) return;
        selectGroup(onebankid);
        // The new group's home is the only page guaranteed to make sense; a
        // routed page still showing the old group's data would be misleading.
        goHome();
    }

    function manage(flag: 'newgroup' | 'joingroup' | 'leavegroup') {
        open = false;
        showPopup('GROUPMANAGEMENT.html', {[flag]: 1});
    }
</script>

{#if !$groupsLoading}
    <div class="relative w-full">
        <button
                class="flex w-full items-center justify-between gap-1 rounded-lg px-2 py-1.5 text-left text-xs text-gray-600 transition-colors hover:bg-gray-100"
                onclick={() => (open = !open)}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={t('Switch group', 'ປ່ຽນກຸ່ມ')}
        >
            {#if expand}
                <span class="truncate">{active?.name ?? t('Select group', 'ເລືອກກຸ່ມ')}</span>
            {/if}
            <Icon icon={open ? 'mdi:chevron-up' : 'mdi:chevron-down'} class="flex-shrink-0"/>
        </button>

        {#if open}
            <!-- Click-away scrim. Sits below the menu but above everything else. -->
            <div
                    class="fixed inset-0 z-[19]"
                    role="button"
                    tabindex="-1"
                    onclick={() => (open = false)}
                    onkeydown={(e) => { if (e.key === 'Escape') open = false }}
            ></div>

            <div class="absolute left-0 top-full z-20 mt-1 w-56 overflow-hidden rounded-xl bg-white p-1 shadow-lg ring-1 ring-black/5">
                <ul role="listbox" class="max-h-56 overflow-y-auto">
                    {#each $groups as group (group.onebankid)}
                        <li>
                            <button
                                    class="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm transition-colors
                    {group.onebankid === $currentGroup ? 'bg-onebank-red text-white' : 'text-gray-700 hover:bg-gray-100'}"
                                    role="option"
                                    aria-selected={group.onebankid === $currentGroup}
                                    onclick={() => choose(group.onebankid)}
                            >
                                <img
                                        src={group.logoname || 'img/ic_onebank.svg'}
                                        alt=""
                                        class="h-6 w-6 flex-shrink-0 rounded-full object-cover"
                                />
                                <span class="truncate">{group.name ?? group.onebankid}</span>
                            </button>
                        </li>
                    {/each}
                    {#if $groups.length === 0}
                        <li class="px-2 py-2 text-sm text-gray-400">{t('No groups yet', 'ຍັງບໍ່ມີກຸ່ມ')}</li>
                    {/if}
                </ul>

                <div class="mt-1 border-t border-gray-100 pt-1">
                    <button class="w-full rounded-lg px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-100" onclick={() => manage('newgroup')}>
                        <Icon icon="mdi:plus" class="mr-1 inline"/>{t('Create new', 'ສ້າງກຸ່ມໃໝ່')}
                    </button>
                    <button class="w-full rounded-lg px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-100" onclick={() => manage('joingroup')}>
                        <Icon icon="mdi:account-plus" class="mr-1 inline"/>{t('Join group', 'ເຂົ້າຮ່ວມກຸ່ມ')}
                    </button>
                    {#if $groups.length > 0}
                        <button class="w-full rounded-lg px-2 py-2 text-left text-sm text-red-600 hover:bg-red-50" onclick={() => manage('leavegroup')}>
                            <Icon icon="mdi:exit-to-app" class="mr-1 inline"/>{t('Leave group', 'ອອກຈາກກຸ່ມ')}
                        </button>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
{/if}
