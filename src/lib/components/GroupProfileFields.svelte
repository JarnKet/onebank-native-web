<script lang="ts">
    /**
     * A group's picture, name and description — the card shared by "Edit
     * group" and the last step of "Create OneBank". The picture is read
     * locally and downscaled (`readPicture`); there is no upload bucket.
     */
    import Icon from '@iconify/svelte';
    import {initials, t} from '../utils/helper';
    import {readPicture} from '../utils/picture';

    let {
        name = $bindable(''),
        detail = $bindable(''),
        logo = $bindable(''),
        maxName = 30,
    }: {
        name?: string
        detail?: string
        /** A data URL or path; empty means the default picture. */
        logo?: string
        maxName?: number
    } = $props();

    let reading = $state(false);
    let error = $state('');
    let fileInput = $state<HTMLInputElement | null>(null);

    async function pick(event: Event) {
        const file = (event.target as HTMLInputElement).files?.item(0);
        if (!file) return;
        reading = true;
        error = '';
        const result = await readPicture(file);
        reading = false;
        // Clearing lets the same file be picked again after a failure.
        if (fileInput) fileInput.value = '';
        if (result.url) logo = result.url;
        else error = result.error || t('Could not use that picture', 'ໃຊ້ຮູບນັ້ນບໍ່ໄດ້');
    }
</script>

<div class="ob-card flex flex-col gap-8 p-7 tablet:flex-row tablet:items-start">
    <div class="flex shrink-0 flex-col items-center gap-3 text-center">
        <button type="button" class="relative h-41.5 w-41.5 rounded-full" disabled={reading}
                aria-label={t('Change group picture', 'ປ່ຽນຮູບກຸ່ມ')} onclick={() => fileInput?.click()}>
            {#if logo}
                <img src={logo} alt="" class="h-full w-full rounded-full object-cover"/>
            {:else}
                <span class="flex h-full w-full items-center justify-center rounded-full bg-onebank-light-grey-4 text-4xl font-semibold text-white">
                    {name ? initials(name) : ''}
                </span>
            {/if}
            <span class="absolute -right-1 bottom-2">
                <Icon icon={reading ? 'mdi:progress-upload' : 'mdi:camera'} class="h-8 w-8 text-onebank-ink"/>
            </span>
        </button>
        <input type="file" accept="image/*" class="hidden" bind:this={fileInput} onchange={pick}/>
        <p class="max-w-44 text-xs text-onebank-subtle">{t('Click to change the profile picture', 'ກົດເພື່ອປ່ຽນຮູບໂປຣໄຟລ໌')}</p>
        {#if logo}
            <button type="button" class="text-xs text-onebank-red underline" onclick={() => (logo = '')}>{t('Use the default picture', 'ໃຊ້ຮູບເລີ່ມຕົ້ນ')}</button>
        {/if}
        {#if error}<p class="max-w-44 text-xs text-red-600" role="alert">{error}</p>{/if}
    </div>

    <div class="flex-1 space-y-6">
        <div>
            <label for="groupName" class="mb-2 block text-base">{t('Group name', 'ຊື່ກຸ່ມ')}</label>
            <div class="relative">
                <input id="groupName" name="groupName" type="text" bind:value={name} maxlength={maxName} required
                       placeholder={t('Enter group name', 'ປ້ອນຊື່ກຸ່ມ')}
                       class="h-11.5 w-full rounded-ob-sm border border-black px-7 pr-20 text-base focus:border-onebank-red focus:ring-onebank-red"/>
                <span class="pointer-events-none absolute right-7 top-1/2 -translate-y-1/2 text-sm text-onebank-muted">{name.length}/{maxName}</span>
            </div>
        </div>
        <div>
            <label for="groupDetail" class="mb-2 block text-base">{t('Description', 'ຄຳອະທິບາຍກ່ຽວກັບກຸ່ມ')}</label>
            <textarea id="groupDetail" name="groupDetail" rows="3" bind:value={detail} maxlength="200"
                      placeholder={t('Optional: add details about your group', 'ບໍ່ບັງຄັບ: ເພີ່ມລາຍລະອຽດກ່ຽວກັບກຸ່ມ')}
                      class="min-h-20 w-full resize-y rounded-ob-sm border border-black px-7 py-3 text-base focus:border-onebank-red focus:ring-onebank-red"></textarea>
        </div>
    </div>
</div>
