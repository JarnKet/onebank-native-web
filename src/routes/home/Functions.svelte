<script lang="ts">
    /**
     * Every menu the group can reach, searchable.
     *
     * Harvested from onebank-ui `pages/HOME/components/Functions.svelte`.
     *
     * Like onebank-ui, this adds `ALWAYS_OFFERED` to whatever the server
     * returned — the iBanking family and the OneBank utilities are reachable
     * even when `allmenus` omits them, and dropping that was why this grid
     * showed far fewer menus than the mobile app.
     *
     * Unlike onebank-ui, the `usablemenus` check the rest of the page applies is
     * kept: an appended menu the group has no permission for is greyed out and
     * inert rather than offered as if it worked. Its console logging of the
     * whole menu list on every reactive pass is also not copied.
     */
    import Icon from '@iconify/svelte';
    import MenuIcon from './MenuIcon.svelte';
    import {menus} from '../../lib/menus';
    import {isUsable, openMenu} from './openMenu';
    import {t} from '../../lib/utils/helper';
    import {loadHomeResult} from '../../stores/onebankGroups';

    let search = $state('');

    /**
     * Menus offered regardless of `allmenus`, matching onebank-ui's own list.
     * The core does not enumerate these, but the pages exist and are reachable;
     * `usablemenus` still decides whether each one is live or greyed out.
     */
    const ALWAYS_OFFERED = [
        'ONEBANKSTATEMENT',
        'ONEBANKTRANSFER',
        'ONEBANKUTILITIES',
        'IBANKSALARY',
        'IBANKACCOUNTDETAIL',
        'IBANKNOTIFICATIONSETTING',
        'IBANKEXCHANGERATES',
        'IBANKINTERESTRATES',
        'IBANKSLIP',
        'IBANKDESTINATIONACCOUNT',
        'IBANKTERMDEPOSITACCOUNT',
        'IBANKLOANACCOUNT',
        'IBANKINTERNATIONALTRANSFER',
        'IBANKTRANFERIDCARD',
    ];

    const usablemenus = $derived($loadHomeResult?.usablemenus);
    // `Set` de-duplicates: the core does send some of these for some groups, and
    // a repeated key would render the same tile twice.
    const all = $derived(
        [...new Set([...($loadHomeResult?.allmenus ?? []), ...ALWAYS_OFFERED])].filter((key) => menus[key]),
    );
    const query = $derived(search.trim().toLowerCase());

    const shown = $derived(
        query === '' ? all : all.filter((key) => key.toLowerCase().includes(query) || menus[key].name.toLowerCase().includes(query)),
    );
</script>

<div class="onebank-card flex h-full flex-col gap-2">
    <div class="relative mx-2">
        <Icon icon="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width={20} height={20}/>
        <input
                type="search"
                bind:value={search}
                placeholder={t('Search menu', 'ຄົ້ນຫາເມນູ')}
                class="h-[42px] w-full rounded-lg border border-gray-300 pl-10 text-sm placeholder:text-gray-400 focus:border-onebank-red focus:ring-2 focus:ring-onebank-red"
        />
    </div>

    <div class="flex-1 overflow-y-auto px-2">
        {#if shown.length === 0}
            <div class="py-8 text-center text-sm text-gray-400">{t('Nothing matches', 'ບໍ່ພົບ')}</div>
        {/if}
        <div class="grid grid-cols-3 items-start justify-items-center gap-2 mobile:grid-cols-4 laptop:grid-cols-6">
            {#each shown as key (key)}
                <MenuIcon
                        menu={menus[key]}
                        large
                        usable={isUsable(usablemenus, key)}
                        onclick={() => { if (isUsable(usablemenus, key)) openMenu(key) }}
                />
            {/each}
        </div>
    </div>
</div>
