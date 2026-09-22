<script lang="ts">
    /**
     * Managing the group's members, as the design's "Manage member" frame:
     * search and a type filter on top, a two-column grid of member cards, and
     * the red "add member" button under it.
     *
     * Each card's first chip is the member's role, the second the accounts that
     * role reaches. Roles are read-only here: saving one is not in the core
     * contract yet, so changing it happens on "Manage permissions" (ROLE.html).
     */
    import Icon from '@iconify/svelte';
    import ConfirmDialog from './account/ConfirmDialog.svelte';
    import {getPermissions, removeMember} from '../lib/api/commands';
    import type {Permission} from '../lib/api/types';
    import type {User} from '../definition';
    import {initials, maskAccount, t} from '../lib/utils/helper';
    import {clickOutside} from '../lib/attachments/clickOutside';
    import {currentGroup, loadHomeResult} from '../stores/onebankGroups';
    import {reloadHome} from '../stores/home';
    import {openAddMemberDialog, showAddMemberDialog} from '../stores/ui';
    import {navigateToMenu} from '../lib/utils/navigation';

    let permissions = $state<Permission[]>([]);
    let search = $state('');
    let filter = $state<'ALL' | 'VIEW' | 'TRANSACT'>('ALL');
    let filterOpen = $state(false);
    let openMenu = $state<string | null>(null);
    let removing = $state<User | null>(null);
    let busy = $state(false);
    let error = $state('');
    let notice = $state('');

    const members = $derived($loadHomeResult?.users ?? []);
    const accounts = $derived($loadHomeResult?.accounts ?? []);
    const isOwner = $derived(['OWNER', 'ADMIN'].includes($loadHomeResult?.me?.role ?? ''));

    async function load(group: string) {
        if (!group) return;
        const response = await getPermissions(group);
        permissions = response.permissions ?? [];
    }

    // Reload when the group changes, and after the add-member dialog closes.
    $effect(() => {
        const group = $currentGroup;
        if (!$showAddMemberDialog) void load(group);
    });

    function roleOf(userid: string): Permission | undefined {
        return permissions.find((permission) => permission.userids.includes(userid));
    }

    const shown = $derived(
        members.filter((member) => {
            if (!member.name.toLowerCase().includes(search.trim().toLowerCase())) return false;
            if (filter === 'ALL') return true;
            const role = roleOf(member.userid);
            return filter === 'VIEW' ? role?.viewonly === true : role !== undefined && !role.viewonly;
        }),
    );

    async function confirmRemove() {
        if (!removing) return;
        busy = true;
        const response = await removeMember(removing.userid);
        busy = false;
        if (response.result !== 0) {
            error = response.message || t('Could not remove the member', 'ລຶບສະມາຊິກບໍ່ໄດ້');
            return;
        }
        notice = t(`${removing.name} was removed`, `ລຶບ ${removing.name} ອອກແລ້ວ`);
        removing = null;
        await Promise.all([reloadHome(), load($currentGroup)]);
    }

    const FILTERS: Array<{id: typeof filter; en: string; lo: string}> = [
        {id: 'ALL', en: 'Everyone', lo: 'ທັງໝົດ'},
        {id: 'VIEW', en: 'Can view', lo: 'ເບິ່ງໄດ້'},
        {id: 'TRANSACT', en: 'Can transact', lo: 'ເຄື່ອນໄຫວໄດ້'},
    ];
</script>

<div class="space-y-4">
    <div class="flex gap-3">
        <label class="relative block flex-1">
            <span class="sr-only">{t('Search members', 'ຄົ້ນຫາສະມາຊິກ')}</span>
            <Icon icon="mdi:magnify" class="pointer-events-none absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2"/>
            <input type="search" bind:value={search} placeholder={t('Enter a member name', 'ປ້ອນຊື່ສະມາຊິກ')}
                   class="h-12 w-full rounded-ob-xl border border-onebank-ink bg-white pl-12 pr-4 text-center text-base placeholder:text-onebank-muted focus:border-onebank-red focus:ring-onebank-red"/>
        </label>
        <div class="relative" {@attach clickOutside(() => (filterOpen = false))}>
            <button type="button" class="flex h-12 items-center gap-3 rounded-ob-xl bg-onebank-blue px-5 text-base text-white"
                    aria-haspopup="listbox" aria-expanded={filterOpen} onclick={() => (filterOpen = !filterOpen)}>
                <Icon icon="mdi:filter-variant" class="h-6 w-6"/>
                <span class="hidden tablet:inline">{filter === 'ALL' ? t('Filter', 'ຕົວກັ່ນຕອງ') : t(FILTERS.find((f) => f.id === filter)!.en, FILTERS.find((f) => f.id === filter)!.lo)}</span>
            </button>
            {#if filterOpen}
                <ul class="absolute right-0 top-14 z-20 w-44 rounded-ob-lg bg-white py-2 shadow-ob-card" role="listbox">
                    {#each FILTERS as option (option.id)}
                        <li>
                            <button type="button" role="option" aria-selected={filter === option.id}
                                    class="w-full px-4 py-2 text-left text-sm hover:bg-onebank-pink {filter === option.id ? 'font-semibold text-onebank-red' : ''}"
                                    onclick={() => { filter = option.id; filterOpen = false; }}>
                                {t(option.en, option.lo)}
                            </button>
                        </li>
                    {/each}
                </ul>
            {/if}
        </div>
    </div>

    {#if error}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}
    {#if notice}<div class="rounded-ob-sm bg-green-50 p-3 text-sm text-green-700" role="status">{notice}</div>{/if}

    <h1 class="pt-2 text-xl font-semibold">{t(`All members: ${members.length}`, `ສະມາຊິກທັງໝົດ ${members.length} ຄົນ`)}</h1>

    <div class="grid gap-3 desktop:grid-cols-2">
        {#each shown as member (member.userid)}
            {@const role = roleOf(member.userid)}
            {@const reach = accounts.filter((account) => role?.accountids.includes(account.accountid))}
            {@const owner = member.role === 'OWNER'}
            <article class="ob-card relative flex items-center gap-5 px-5 py-4">
                <span class="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-onebank-light-grey-4 font-semibold text-white">{initials(member.name)}</span>
                <div class="min-w-0 flex-1">
                    <h2 class="truncate text-lg font-bold">
                        {member.name}
                        {#if owner}<span class="ml-1 rounded-full bg-onebank-red px-2 py-0.5 align-middle text-[10px] font-semibold text-white">{t('Owner', 'ເຈົ້າຂອງ')}</span>{/if}
                        {#if member.role === 'ADMIN'}<span class="ml-1 rounded-full bg-onebank-blue px-2 py-0.5 align-middle text-[10px] font-semibold text-white">{t('Admin', 'ຜູ້ດູແລ')}</span>{/if}
                    </h2>
                    <div class="mt-1.5 flex flex-wrap gap-3">
                        <button type="button" disabled={!isOwner || owner}
                                class="flex h-7 items-center gap-2 rounded-full px-5 text-sm text-black disabled:cursor-default
                                       {role?.viewonly === false ? 'bg-[#c9a7f5]' : 'bg-[#a9e3fb]'}"
                                title={isOwner && !owner ? t('Change it on Manage permissions', 'ປ່ຽນໄດ້ໃນ ຈັດການສິດທິ') : undefined}
                                onclick={() => navigateToMenu('ROLE')}>
                            {owner ? t('Full access', 'ສິດທັງໝົດ') : role ? (role.viewonly ? t('Can view', 'ເບິ່ງໄດ້') : t('Can transact', 'ເຄື່ອນໄຫວໄດ້')) : t('No role', 'ບໍ່ມີສິດ')}
                        </button>
                        <div class="relative" {@attach clickOutside(() => { if (openMenu === `acct-${member.userid}`) openMenu = null; })}>
                            <button type="button" class="flex h-7 items-center gap-2 rounded-full bg-[#fbb074] px-5 text-sm text-white"
                                    aria-haspopup="true" aria-expanded={openMenu === `acct-${member.userid}`}
                                    onclick={() => (openMenu = openMenu === `acct-${member.userid}` ? null : `acct-${member.userid}`)}>
                                {role?.viewonly === false ? t('Transacts on', 'ເຄື່ອນໄຫວໄດ້') : t('Views', 'ເບິ່ງໄດ້')}
                                <span class="font-bold text-onebank-red">{owner ? accounts.length : reach.length}</span>
                                {t('accounts', 'ບັນຊີ')}
                                <Icon icon="mdi:menu-down" class="h-4 w-4"/>
                            </button>
                            {#if openMenu === `acct-${member.userid}`}
                                <ul class="absolute left-0 top-9 z-20 w-64 rounded-ob-lg bg-white py-2 shadow-ob-card">
                                    {#each owner ? accounts : reach as account (account.accountid)}
                                        <li class="px-4 py-1.5 text-sm">
                                            <span class="font-semibold">{maskAccount(account.account)}</span>
                                            <span class="block text-xs text-onebank-subtle">{account.alias || account.name} · {account.ccy}</span>
                                        </li>
                                    {:else}
                                        <li class="px-4 py-2 text-sm text-onebank-subtle">{t('No accounts', 'ບໍ່ມີບັນຊີ')}</li>
                                    {/each}
                                </ul>
                            {/if}
                        </div>
                    </div>
                </div>
                {#if isOwner && !owner}
                    <button type="button" class="absolute right-4 top-4 rounded-full hover:text-onebank-red" aria-label={t(`Remove ${member.name}`, `ລຶບ ${member.name}`)}
                            onclick={() => (removing = member)}>
                        <Icon icon="mdi:close-circle-outline" class="h-6 w-6"/>
                    </button>
                {/if}
            </article>
        {:else}
            <div class="ob-card p-8 text-center text-onebank-subtle desktop:col-span-2">{t('No member matches', 'ບໍ່ພົບສະມາຊິກ')}</div>
        {/each}
    </div>

    {#if isOwner}
        <div class="flex justify-center pt-10">
            <button type="button" class="onebank-primary-btn h-12 text-xl tablet:w-88" onclick={openAddMemberDialog}>
                <Icon icon="mdi:plus-circle" class="h-6 w-6"/>{t('Add member', 'ເພີ່ມສະມາຊິກ')}
            </button>
        </div>
    {/if}
</div>

<ConfirmDialog open={removing !== null}
               title={t('Remove this member?', 'ລຶບສະມາຊິກນີ້ອອກບໍ?')}
               content={t(`${removing?.name ?? ''} will lose access to this group and its accounts.`, `${removing?.name ?? ''} ຈະບໍ່ສາມາດເຂົ້າເຖິງກຸ່ມ ແລະ ບັນຊີນີ້ໄດ້ອີກ.`)}
               confirmLabel={t('Remove', 'ລຶບອອກ')} danger busy={busy}
               onConfirm={confirmRemove} onCancel={() => (removing = null)}/>
