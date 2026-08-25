<script lang="ts">
    /**
     * Edit / Account / Permissions / Members for the active group.
     *
     * Harvested from onebank-ui `DesktopGroupActionMenu.svelte`. All four
     * targets are pages this app routes, so they open as URLs rather than
     * popups-for-result: `showPopup` dispatches, and `closePopup`'s routed-page
     * path already applies the edited group detail and refreshes on the way
     * back. That replaces the callback the mobile version registers.
     *
     * The original's `onMount` cleanup called `addEventListener` a second time
     * instead of removing the listener; fixed here.
     */
    import Icon from '@iconify/svelte';
    import {onMount} from 'svelte';
    import {quintOut} from 'svelte/easing';
    import {fade, fly} from 'svelte/transition';
    import {showPopup, t} from '../../lib/utils/helper';

    let isOpen = $state(false);

    const groupMenus = [
        {text: t('Edit', 'ແກ້ໄຂ'), icon: 'mdi:pencil', page: 'GROUP', separator: true},
        {text: t('Account', 'ບັນຊີ'), icon: 'mdi:account', page: 'ACCOUNT', separator: false},
        {text: t('Permissions', 'ສິດທິ'), icon: 'mdi:shield-account', page: 'ROLE', separator: false},
        {text: t('Members', 'ສະມາຊິກກຸ່ມ'), icon: 'mdi:account-group', page: 'MEMBER', separator: false},
    ];

    function select(page: string) {
        isOpen = false;
        showPopup(`${page}.html`, {});
    }

    onMount(() => {
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        const collapseOnNarrow = (e: MediaQueryListEvent) => {
            if (e.matches) isOpen = false;
        };
        mediaQuery.addEventListener('change', collapseOnNarrow);
        return () => mediaQuery.removeEventListener('change', collapseOnNarrow);
    });
</script>

<div class="dropdown z-10 tablet:hidden">
    <div class="relative mb-2">
        <div class="flex flex-col items-end">
            <button
                    class="flex items-center space-x-1 rounded-lg bg-gray-300 bg-opacity-30 p-2 px-3 text-xs"
                    onclick={() => (isOpen = !isOpen)}
                    aria-haspopup="true"
                    aria-expanded={isOpen}
            >
                <div class="text-sm">{t('Group', 'ເມນູກຸ່ມ')}</div>
                <Icon icon="mdi:dots-vertical" width={16} height={16}/>
            </button>
        </div>
        {#if isOpen}
            <div
                    class="fixed inset-0 z-40 bg-black bg-opacity-10"
                    role="button"
                    tabindex="-1"
                    onclick={() => (isOpen = false)}
                    onkeydown={(e) => { if (e.key === 'Escape') isOpen = false }}
                    transition:fade={{duration: 200}}
            ></div>
            <ul
                    transition:fly={{y: -5, duration: 200, easing: quintOut}}
                    class="absolute right-0 z-50 mt-2 w-40 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5"
                    role="menu"
            >
                {#each groupMenus as item (item.page)}
                    <li class:border-b={item.separator}>
                        <button
                                class="flex w-full items-center px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                                role="menuitem"
                                onclick={() => select(item.page)}
                        >
                            <Icon icon={item.icon} class="mr-2" width={16} height={16}/>
                            <span class="font-medium">{item.text}</span>
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</div>

<div class="hidden text-center tablet:block">
    <div>{t('Group', 'ເມນູກຸ່ມ')}</div>
    <div class="my-2 border-b border-gray-300"></div>
    <ul class="flex" role="menu">
        {#each groupMenus as item (item.page)}
            <li>
                <button
                        class="flex w-full items-center rounded-lg px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                        role="menuitem"
                        onclick={() => select(item.page)}
                >
                    <Icon icon={item.icon} class="mr-2" width={16} height={16}/>
                    <span class="font-medium">{item.text}</span>
                </button>
            </li>
        {/each}
    </ul>
</div>
