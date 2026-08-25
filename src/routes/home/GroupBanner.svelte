<script lang="ts">
    /**
     * The group header: logo, name, members, and the owner's group menu.
     *
     * Merges onebank-ui's `DesktopBanner` and `MobileBanner`, which differed
     * only in padding and a logout hotspot the sidebar already provides here.
     * `Member` is the shell's own component, which already reads the active
     * group's loadhome payload.
     */
    import Member from '../../components/Member.svelte';
    import GroupActionMenu from './GroupActionMenu.svelte';
    import {loadHomeResult} from '../../stores/onebankGroups';

    let {showGroupMenu = false}: {showGroupMenu?: boolean} = $props();

    const group = $derived($loadHomeResult?.detail);
</script>

<div class="p-5 pb-4 tablet:p-8 tablet:pb-5 tablet:pt-6">
    <div class="relative flex justify-between">
        <div class="flex items-center gap-3">
            <div class="h-16 w-16 rounded-full border-2 border-white drop-shadow-md tablet:h-20 tablet:w-20">
                <img
                        src={group?.logoname || 'img/ic_onebank.svg'}
                        alt={group?.name ?? 'OneBank'}
                        class="h-full w-full rounded-full object-cover"
                />
            </div>
            <div>
                <div class="text-lg font-bold text-base-900">{group?.name ?? 'OneBank'}</div>
                <Member/>
            </div>
        </div>
        {#if showGroupMenu}
            <div class="absolute -right-2 top-0">
                <GroupActionMenu/>
            </div>
        {/if}
    </div>
</div>
