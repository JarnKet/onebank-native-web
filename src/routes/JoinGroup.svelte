<script lang="ts">
    /**
     * Joining a group: the user gets a code and gives it to the group's owner,
     * who adds them from "Add member". As in the design, that is all this page
     * does — plus, because a demo has no second person, a way to play the owner.
     */
    import {untrack} from 'svelte';
    import Icon from '@iconify/svelte';
    import {joinGroup, joinGroupRequest} from '../lib/api/commands';
    import {t} from '../lib/utils/helper';
    import {goHome} from '../lib/utils/navigation';
    import {refreshGroups, selectGroup} from '../stores/groups';

    let code = $state('');
    let error = $state('');
    let copied = $state(false);
    let joining = $state(false);

    $effect(() => {
        untrack(async () => {
            const response = await joinGroupRequest();
            if (response.result === 0) code = response.joingroupid;
            else error = response.message || t('Could not create a join code', 'ສ້າງລະຫັດບໍ່ໄດ້');
        });
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

    async function simulateOwner() {
        joining = true;
        error = '';
        const response = await joinGroup(code);
        joining = false;
        if (response.result !== 0) {
            error = response.message || t('Could not join', 'ເຂົ້າຮ່ວມບໍ່ໄດ້');
            return;
        }
        await refreshGroups(response.onebankid);
        selectGroup(response.onebankid);
        goHome();
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

    {#if error}<p class="mt-4 text-sm text-red-600" role="alert">{error}</p>{/if}

    {#if code}
        <div class="mt-10 rounded-ob-lg border border-dashed border-onebank-muted px-6 py-4 text-sm text-onebank-subtle">
            <p>{t('Demo mode: there is no other person to add you.', 'ໂໝດທົດລອງ: ບໍ່ມີເຈົ້າຂອງກຸ່ມຕົວຈິງມາເພີ່ມທ່ານ.')}</p>
            <button type="button" class="mt-2 font-semibold text-onebank-red underline disabled:opacity-50" disabled={joining} onclick={simulateOwner}>
                {joining ? t('Joining…', 'ກຳລັງເຂົ້າຮ່ວມ…') : t('Play the owner and let me in', 'ຈຳລອງເຈົ້າຂອງກຸ່ມອະນຸມັດ')}
            </button>
        </div>
    {/if}
</section>
