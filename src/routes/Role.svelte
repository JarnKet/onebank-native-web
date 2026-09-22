<script lang="ts">
    /**
     * Managing the group's roles ("ຈັດການສິດທິ"): each role as a card with what
     * it covers at a glance — accounts, members, approval levels, functions,
     * limits — and the full editor for creating or changing one.
     */
    import Icon from '@iconify/svelte';
    import PermissionEditor from '../lib/components/PermissionEditor.svelte';
    import ConfirmDialog from './account/ConfirmDialog.svelte';
    import {getPermissions, removePermission} from '../lib/api/commands';
    import {savePermission} from '../lib/api/unmapped';
    import type {Permission} from '../lib/api/types';
    import {initials, t} from '../lib/utils/helper';
    import {currentGroup, loadHomeResult} from '../stores/onebankGroups';
    import {menus, offeredMenus} from '../lib/menus';

    let permissions = $state<Permission[]>([]);
    let loading = $state(false);
    let error = $state('');
    let notice = $state('');
    let editing = $state<Permission | null>(null);
    let saving = $state(false);
    let removing = $state<Permission | null>(null);
    let removeBusy = $state(false);

    const accounts = $derived($loadHomeResult?.accounts ?? []);
    const members = $derived($loadHomeResult?.users ?? []);
    // What a role can grant is what the group can be offered, iBank included.
    const functions = $derived(offeredMenus($loadHomeResult?.allmenus));
    const isOwner = $derived(['OWNER', 'ADMIN'].includes($loadHomeResult?.me?.role ?? ''));

    async function load(group: string) {
        if (!group) return;
        loading = true;
        error = '';
        try {
            const response = await getPermissions(group);
            if (response.result === 0) permissions = response.permissions ?? [];
            else error = response.message || t('Could not load the roles', 'ໂຫຼດສິດທິບໍ່ໄດ້');
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        void load($currentGroup);
    });

    function startNew() {
        notice = '';
        editing = {name: '', accountids: [], userids: [], allowedfunctions: '*', viewonly: false, approverlevels: []};
    }

    async function save() {
        if (!editing) return;
        if (!editing.name?.trim()) {
            error = t('Give the role a name', 'ກະລຸນາຕັ້ງຊື່ສິດທິ');
            return;
        }
        if (editing.accountids.length === 0) {
            error = t('Choose at least one account', 'ກະລຸນາເລືອກຢ່າງໜ້ອຍໜຶ່ງບັນຊີ');
            return;
        }
        saving = true;
        error = '';
        const response = await savePermission($state.snapshot(editing) as Permission);
        saving = false;
        if (response.result !== 0) {
            error = response.message || t('Could not save the role', 'ບັນທຶກສິດທິບໍ່ໄດ້');
            return;
        }
        editing = null;
        notice = t('Role saved', 'ບັນທຶກສິດທິແລ້ວ');
        await load($currentGroup);
    }

    async function confirmRemove() {
        if (!removing?.permissionid) return;
        removeBusy = true;
        const response = await removePermission(removing.permissionid);
        removeBusy = false;
        if (response.result !== 0) {
            error = response.message || t('Could not delete the role', 'ລຶບສິດທິບໍ່ໄດ້');
            return;
        }
        removing = null;
        notice = t('Role deleted', 'ລຶບສິດທິແລ້ວ');
        await load($currentGroup);
    }

    function functionCount(permission: Permission): string {
        if (!permission.allowedfunctions || permission.allowedfunctions === '*') return t('Every function', 'ໃຊ້ໄດ້ທຸກຟັງຊັ່ນ');
        const count = permission.allowedfunctions.split(',').filter(Boolean).length;
        return t(`${count} functions`, `ໃຊ້ໄດ້ ${count} ຟັງຊັ່ນ`);
    }
</script>

<div class="space-y-4">
    {#if error}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}
    {#if notice}<div class="rounded-ob-sm bg-green-50 p-3 text-sm text-green-700" role="status">{notice}</div>{/if}

    {#if editing}
        <div class="flex items-center gap-2">
            <button type="button" class="rounded-full p-1 hover:bg-white" aria-label={t('Back', 'ກັບຄືນ')} onclick={() => (editing = null)}>
                <Icon icon="mdi:arrow-left" class="h-6 w-6"/>
            </button>
            <h1 class="text-2xl font-semibold">{editing.permissionid ? t('Edit role', 'ແກ້ໄຂສິດທິ') : t('New role', 'ສ້າງສິດທິໃໝ່')}</h1>
        </div>
        <PermissionEditor bind:permission={editing} {accounts} {members} {functions}/>
        <div class="flex justify-center gap-3 pt-4">
            <button type="button" class="onebank-secondary-btn" onclick={() => (editing = null)} disabled={saving}>{t('Cancel', 'ຍົກເລີກ')}</button>
            <button type="button" class="onebank-primary-btn" onclick={save} disabled={saving}>{saving ? t('Saving…', 'ກຳລັງບັນທຶກ…') : t('Save', 'ບັນທຶກ')}</button>
        </div>
    {:else}
        <div class="flex flex-wrap items-center gap-3">
            <h1 class="mr-auto text-2xl font-semibold">{t('Manage permissions', 'ຈັດການສິດທິ')}</h1>
            {#if isOwner}
                <button type="button" class="onebank-primary-btn" onclick={startNew}>
                    <Icon icon="mdi:plus-circle" class="h-5 w-5"/>{t('New role', 'ສ້າງສິດທິໃໝ່')}
                </button>
            {/if}
        </div>

        {#if loading && permissions.length === 0}
            <div class="grid gap-3 desktop:grid-cols-2">{#each [0, 1] as i (i)}<div class="h-44 animate-pulse rounded-ob-xl bg-white"></div>{/each}</div>
        {:else if permissions.length === 0}
            <div class="ob-card p-8 text-center text-onebank-subtle">{t('This group has no roles yet.', 'ກຸ່ມນີ້ຍັງບໍ່ມີສິດທິ.')}</div>
        {:else}
            <div class="grid gap-3 desktop:grid-cols-2">
                {#each permissions as permission (permission.permissionid)}
                    {@const holders = members.filter((member) => permission.userids.includes(member.userid))}
                    <article class="ob-card flex flex-col gap-4 p-5">
                        <header class="flex items-start gap-3">
                            <span class="flex h-12 w-12 items-center justify-center rounded-full {permission.viewonly ? 'bg-onebank-blue-soft text-onebank-blue' : 'bg-onebank-pink text-onebank-red'}">
                                <Icon icon={permission.viewonly ? 'mdi:eye-outline' : 'mdi:security-account'} class="h-6 w-6"/>
                            </span>
                            <div class="min-w-0 flex-1">
                                <h2 class="truncate text-lg font-bold">{permission.name || t('Account access', 'ສິດນຳໃຊ້ບັນຊີ')}</h2>
                                <p class="text-sm text-onebank-subtle">{permission.viewonly ? t('View accounts', 'ເບິ່ງບັນຊີໄດ້') : t('Transact on accounts', 'ເຄື່ອນໄຫວບັນຊີໄດ້')}</p>
                            </div>
                            {#if isOwner}
                                <button type="button" class="rounded-full p-1 hover:bg-onebank-page" aria-label={t('Edit role', 'ແກ້ໄຂສິດທິ')}
                                        onclick={() => (editing = structuredClone($state.snapshot(permission)) as Permission)}>
                                    <Icon icon="mdi:pencil" class="h-5 w-5"/>
                                </button>
                                <button type="button" class="rounded-full p-1 hover:bg-onebank-page" aria-label={t('Delete role', 'ລຶບສິດທິ')}
                                        onclick={() => (removing = permission)}>
                                    <Icon icon="mdi:close-circle-outline" class="h-5 w-5"/>
                                </button>
                            {/if}
                        </header>
                        <ul class="flex flex-wrap gap-2 text-xs font-medium">
                            <li class="rounded-full bg-onebank-blue-soft px-3 py-1 text-onebank-blue">{t(`${permission.accountids.length} accounts`, `${permission.accountids.length} ບັນຊີ`)}</li>
                            <li class="rounded-full bg-onebank-blue-soft px-3 py-1 text-onebank-blue">{t(`${permission.userids.length} members`, `ສະມາຊິກ ${permission.userids.length} ຄົນ`)}</li>
                            {#if !permission.viewonly}
                                <li class="rounded-full bg-onebank-blue-soft px-3 py-1 text-onebank-blue">{functionCount(permission)}</li>
                                {#if permission.approverlevels?.length}
                                    <li class="rounded-full bg-onebank-pink px-3 py-1 text-onebank-red">{t(`${permission.approverlevels.length} approval levels`, `ອະນຸມັດ ${permission.approverlevels.length} ຂັ້ນ`)}</li>
                                {/if}
                                {#if permission.limit?.pertransaction || permission.limit?.daily}
                                    <li class="rounded-full bg-onebank-pink px-3 py-1 text-onebank-red">{t('Has spending limits', 'ມີການຈຳກັດວົງເງິນ')}</li>
                                {/if}
                            {/if}
                        </ul>
                        {#if holders.length}
                            <div class="flex items-center -space-x-1.75">
                                {#each holders.slice(0, 6) as holder (holder.userid)}
                                    <span class="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-onebank-light-grey-2 text-[10px] font-semibold ring-2 ring-white" title={holder.name}>{initials(holder.name)}</span>
                                {/each}
                                {#if holders.length > 6}<span class="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-[#e8e8f0] text-xs ring-2 ring-white">+{holders.length - 6}</span>{/if}
                            </div>
                        {/if}
                    </article>
                {/each}
            </div>
        {/if}
    {/if}
</div>

<ConfirmDialog open={removing !== null}
               title={t('Delete this role?', 'ລຶບສິດທິນີ້ບໍ?')}
               content={t('Members holding only this role will lose access to its accounts.', 'ສະມາຊິກທີ່ມີແຕ່ສິດນີ້ ຈະບໍ່ສາມາດເຂົ້າເຖິງບັນຊີເຫຼົ່ານີ້ໄດ້ອີກ.')}
               confirmLabel={t('Delete role', 'ລຶບສິດທິ')} danger busy={removeBusy}
               onConfirm={confirmRemove} onCancel={() => (removing = null)}/>
