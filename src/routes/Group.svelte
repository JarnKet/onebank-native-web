<script lang="ts">
    /**
     * Editing the active group: logo, name, description.
     *
     * Harvested from onebank-ui `pages/GROUP` — `StepHome` plus its `WebHome`
     * arm, which between them are the whole page. Differences worth knowing:
     *
     * - onebank-ui refetches `loadhome` on mount purely to fill this form. The
     *   payload is already in `loadHomeResult` here, so the form seeds from the
     *   store and only fetches when there is nothing cached — a deep link
     *   straight to `#/group`.
     * - Its `StepHome` carries a ten-colour palette that neither the web nor
     *   the mobile arm ever renders. `color` is round-tripped untouched rather
     *   than ported as dead code, so saving cannot silently change it.
     * - Saving closes through `closePopup(result)`. With no overlay stacked
     *   that is the routed-page path, which patches the cached group detail and
     *   returns home — the same effect `closePopupWithResult` has on mobile.
     * - Its web title reads "Create Group"; this page only ever edits one.
     */
    import Icon from '@iconify/svelte';
    import {changeGroupDetail, loadHome} from '../lib/api/commands';
    import {closePopup, t} from '../lib/utils/helper';
    import {uploadPicture} from '../lib/utils/upload';
    import {adoptLoadHomeResult, currentGroup, loadHomeResult} from '../stores/onebankGroups';

    /** What the core stores when a group has no logo of its own. */
    const DEFAULT_LOGO = 'img/ic_onebank.svg';

    let name = $state('');
    let detail = $state('');
    let logo = $state(DEFAULT_LOGO);
    /** Round-tripped, not edited: nothing in either app offers a colour picker. */
    let color = $state('');

    let loading = $state(false);
    let saving = $state(false);
    let uploading = $state(false);
    let error = $state('');

    /** The group the form currently holds, so a group switch reseeds it. */
    let seededFor = $state('');
    let fileInput = $state<HTMLInputElement | null>(null);

    const group = $derived($loadHomeResult?.detail);

    /**
     * Fetches the payload when there is none — reaching `#/group` directly,
     * without passing through home first.
     */
    async function ensureLoaded(id: string) {
        if (!id || $loadHomeResult) return;
        loading = true;
        try {
            const response = await loadHome(id);
            if (response?.result === 0) adoptLoadHomeResult(response as any);
            else error = response?.message || t('Could not load this group', 'ໂຫຼດຂໍ້ມູນກຸ່ມບໍ່ໄດ້');
        } catch (e) {
            error = (e as Error)?.message || t('Could not load this group', 'ໂຫຼດຂໍ້ມູນກຸ່ມບໍ່ໄດ້');
        } finally {
            loading = false;
        }
    }

    $effect(() => {
        void ensureLoaded($currentGroup);
    });

    // Seeds once per group. Without the guard, any store write — a widget
    // refresh, a group reload — would throw away what the user has typed.
    $effect(() => {
        const id = $currentGroup;
        if (!group || seededFor === id) return;
        name = group.name ?? '';
        detail = group.detail ?? '';
        color = group.color ?? '';
        logo = group.logoname || DEFAULT_LOGO;
        seededFor = id;
    });

    async function pickLogo(event: Event) {
        const file = (event.target as HTMLInputElement).files?.item(0);
        if (!file) return;
        uploading = true;
        error = '';
        const result = await uploadPicture(file);
        uploading = false;
        // Clearing lets the same file be picked again after a failure.
        if (fileInput) fileInput.value = '';
        if (result.url) logo = result.url;
        else error = result.error || t('Could not upload that picture', 'ອັບໂຫຼດຮູບບໍ່ໄດ້');
    }

    async function save() {
        const trimmed = name.trim();
        if (!trimmed || saving) return;
        saving = true;
        error = '';
        try {
            const response = await changeGroupDetail({
                name: trimmed,
                detail,
                color,
                // An empty string is how the core is told to go back to the
                // default logo; sending the placeholder path would store it.
                logoname: logo === DEFAULT_LOGO ? '' : logo,
            });
            if (response?.result === 0) closePopup({name: trimmed, detail, color, logoname: logo});
            else error = response?.message || t('Could not save the group', 'ບັນທຶກບໍ່ໄດ້');
        } catch (e) {
            error = (e as Error)?.message || t('Could not save the group', 'ບັນທຶກບໍ່ໄດ້');
        } finally {
            saving = false;
        }
    }
</script>

<div class="h-full w-full overflow-y-auto p-4 tablet:p-6 desktop:p-8">
    <div class="mx-auto max-w-3xl">
        <h1 class="mb-3 text-xl font-semibold text-gray-800">{t('Edit group', 'ແກ້ໄຂຂໍ້ມູນກຸ່ມ')}</h1>

        {#if error}
            <div class="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        {/if}

        {#if loading}
            <div class="h-64 animate-pulse rounded-xl bg-gray-100" aria-busy="true"></div>
        {:else}
            <form class="space-y-6" onsubmit={(e) => { e.preventDefault(); void save() }}>
                <div class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div class="flex flex-col gap-8 tablet:flex-row tablet:items-start">
                        <div class="shrink-0">
                            <div class="flex flex-col items-center text-center">
                                <button
                                        type="button"
                                        class="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-gray-100 to-gray-200 shadow-lg tablet:h-48 tablet:w-48"
                                        onclick={() => fileInput?.click()}
                                        disabled={uploading}
                                        aria-label={t('Change group picture', 'ປ່ຽນຮູບກຸ່ມ')}
                                >
                                    <img src={logo} alt="" class="h-full w-full rounded-full object-cover p-1"/>
                                    <span class="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-1.5 shadow">
                                        <Icon icon={uploading ? 'mdi:progress-upload' : 'mdi:camera'} class="h-5 w-5 text-gray-600" width={20} height={20}/>
                                    </span>
                                </button>
                                <input
                                        type="file"
                                        accept="image/*"
                                        class="hidden"
                                        bind:this={fileInput}
                                        onchange={pickLogo}
                                />
                                <div class="mt-4 text-sm text-gray-500">
                                    {uploading
                                        ? t('Uploading…', 'ກຳລັງອັບໂຫຼດ…')
                                        : t('Click to change the group picture', 'ກົດເພື່ອປ່ຽນຮູບກຸ່ມ')}
                                </div>
                            </div>
                        </div>

                        <div class="flex-1 space-y-6">
                            <div class="space-y-2">
                                <label for="groupName" class="flex items-center gap-2 text-base font-semibold text-gray-700">
                                    <Icon icon="mdi:account-group" class="h-4 w-4 text-gray-600" width={16} height={16}/>
                                    {t('Group name', 'ຊື່ກຸ່ມ')}
                                </label>
                                <input
                                        id="groupName"
                                        name="groupName"
                                        type="text"
                                        bind:value={name}
                                        placeholder={t('Enter group name', 'ຊື່ກຸ່ມ')}
                                        class="w-full rounded-xl border border-gray-300 px-4 py-3 text-base shadow-sm placeholder:text-gray-400 focus:border-onebank-red focus:ring-2 focus:ring-onebank-red"
                                        required
                                />
                            </div>

                            <div class="space-y-2">
                                <label for="groupDetail" class="flex items-center gap-2 text-base font-semibold text-gray-700">
                                    <Icon icon="mdi:text-box-outline" class="h-4 w-4 text-gray-600" width={16} height={16}/>
                                    {t('Description', 'ຄຳອະທິບາຍກ່ຽວກັບກຸ່ມ')}
                                </label>
                                <textarea
                                        id="groupDetail"
                                        name="groupDetail"
                                        rows="4"
                                        bind:value={detail}
                                        placeholder={t('Enter description', 'ລາຍລະອຽດ')}
                                        class="w-full rounded-xl border border-gray-300 px-4 py-3 text-base shadow-sm placeholder:text-gray-400 focus:border-onebank-red focus:ring-2 focus:ring-onebank-red"
                                ></textarea>
                                <div class="flex items-center gap-2 text-sm text-gray-500">
                                    <Icon icon="mdi:information-outline" class="h-4 w-4" width={16} height={16}/>
                                    {t('Optional: add details about your group', 'ທາງເລືອກ: ເພີ່ມລາຍລະອຽດກ່ຽວກັບກຸ່ມຂອງທ່ານ')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col items-center justify-end gap-3 border-t border-gray-200 pt-6 tablet:flex-row tablet:gap-4">
                    <button type="button" class="onebank-secondary-btn" onclick={() => closePopup()}>
                        {t('Cancel', 'ຍົກເລີກ')}
                    </button>
                    <button type="submit" class="onebank-primary-btn" disabled={!name.trim() || saving || uploading}>
                        {saving ? t('Saving…', 'ກຳລັງບັນທຶກ…') : t('Save', 'ບັນທຶກ')}
                    </button>
                </div>
            </form>
        {/if}
    </div>
</div>

<style>
    textarea {
        resize: vertical;
        min-height: 100px;
        max-height: 300px;
    }
</style>
