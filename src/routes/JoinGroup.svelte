<script lang="ts">
    /**
     * Joining a group: the user gets a code (`joingrouprequest`) and gives it
     * to the group's owner, who adds them from "Add member". The core announces
     * the approval on the socket channel `JOINEDGROUP-<code>`; when it arrives
     * the group list is refreshed and the user lands in the new group.
     */
    import {untrack} from 'svelte';
    import Icon from '@iconify/svelte';
    import {joinGroupRequest} from '../lib/api/commands';
    import SocketCluster from '../lib/socket';
    import {t} from '../lib/utils/helper';
    import {goHome} from '../lib/utils/navigation';
    import {groups, refreshGroups, selectGroup} from '../stores/groups';

    let code = $state('');
    let error = $state('');
    let copied = $state(false);
    let joined = $state(false);

    async function onJoined(): Promise<void> {
        joined = true;
        const before = new Set($groups.map((group) => group.onebankid));
        // No preference: a refresh with none falls back to the last group,
        // which is where the core puts a newly joined one.
        const active = await refreshGroups();
        const fresh = $groups.find((group) => !before.has(group.onebankid))?.onebankid ?? active;
        if (fresh) selectGroup(fresh);
        goHome();
    }

    $effect(() => {
        let channel = '';
        untrack(async () => {
            try {
                const response = await joinGroupRequest();
                if (response?.result !== 0 || !response.joingroupid) {
                    error = response?.message || t('Could not create a join code', 'ສ້າງລະຫັດບໍ່ໄດ້');
                    return;
                }
                code = response.joingroupid;
                channel = `JOINEDGROUP-${code}`;
                void SocketCluster.subscribe(channel, () => void onJoined());
            } catch (e) {
                error = (e as Error)?.message || t('Could not create a join code', 'ສ້າງລະຫັດບໍ່ໄດ້');
            }
        });
        return () => {
            if (channel) void SocketCluster.unsubscribe(channel);
        };
    });

    async function copy() {
        try {
            await navigator.clipboard.writeText(code);
            copied = true;
            setTimeout(() => (copied = false), 1500);
        } catch {
            // The code is on screen; a denied clipboard is not an error.
        }
    }
</script>

<section class="mx-auto flex max-w-md flex-col items-center pt-10 text-center">
    <h1 class="sr-only">{t('Join a group', 'ເຂົ້າຮ່ວມກຸ່ມ')}</h1>
    <img src="img/ob/join-illustration.png" alt="" width="160" height="136" class="mb-10"/>

    <div class="w-full overflow-hidden rounded-ob-md bg-white shadow-ob-card">
        <p class="border-b border-onebank-row px-6 py-5 text-base font-semibold text-onebank-expense">
            {t('Share this code with the group owner to join', 'ສົ່ງລະຫັດນີ້ໃຫ້ເຈົ້າຂອງກຸ່ມ ເພື່ອເຂົ້າຮ່ວມ')}
        </p>
        <div class="relative flex h-18 items-center justify-center">
            {#if code}
                <span class="font-mono text-2xl font-bold tracking-widest" aria-live="polite">{code}</span>
                <button type="button" class="absolute right-6 text-onebank-muted hover:text-black"
                        aria-label={copied ? t('Copied', 'ສຳເນົາແລ້ວ') : t('Copy code', 'ສຳເນົາລະຫັດ')} onclick={copy}>
                    <Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} class="h-5 w-5"/>
                </button>
            {:else if !error}
                <span class="h-7 w-40 animate-pulse rounded bg-onebank-row"></span>
            {/if}
        </div>
    </div>

    {#if code && !joined}
        <p class="mt-6 flex items-center gap-2 text-sm text-onebank-subtle" role="status">
            <Icon icon="svg-spinners:3-dots-fade" class="h-5 w-5"/>
            {t('Waiting for the owner to add you…', 'ກຳລັງລໍຖ້າເຈົ້າຂອງກຸ່ມເພີ່ມທ່ານ…')}
        </p>
    {/if}
    {#if joined}<p class="mt-6 text-sm text-green-700" role="status">{t('You have been added — opening the group…', 'ທ່ານຖືກເພີ່ມແລ້ວ — ກຳລັງເປີດກຸ່ມ…')}</p>{/if}
    {#if error}<p class="mt-4 text-sm text-red-600" role="alert">{error}</p>{/if}
</section>
