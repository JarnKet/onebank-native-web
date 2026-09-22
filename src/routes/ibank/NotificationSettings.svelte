<script lang="ts">
    /**
     * Which alerts the group sends: one switch per kind, saved together.
     * Unsaved changes are kept on screen and "Save" only lights up once there
     * are some. Replaces IBANKNOTIFICATIONSETTING.
     */
    import Icon from '@iconify/svelte';
    import {loadNotificationSettings, saveNotificationSettings} from '../../lib/api/unmapped';
    import type {NotificationSetting} from '../../lib/api/types';
    import {t} from '../../lib/utils/helper';
    import {currentGroup} from '../../stores/onebankGroups';

    let settings = $state<NotificationSetting[]>([]);
    /** What the bank last confirmed, to tell whether anything changed. */
    let saved = $state<Record<string, boolean>>({});
    let loading = $state(true);
    let error = $state('');
    let saving = $state(false);
    let notice = $state('');

    const snapshot = (list: NotificationSetting[]) => Object.fromEntries(list.map((setting) => [setting.id, setting.enabled]));

    function load(group: string) {
        loading = true;
        error = '';
        notice = '';
        loadNotificationSettings(group)
            .then((response) => {
                if (response?.result === 0) {
                    settings = response.settings ?? [];
                    saved = snapshot(settings);
                } else error = response?.message || t('Could not load the alert settings', 'ໂຫຼດການຕັ້ງຄ່າແຈ້ງເຕືອນບໍ່ໄດ້');
            })
            .catch((e) => (error = (e as Error)?.message || t('Could not load the alert settings', 'ໂຫຼດການຕັ້ງຄ່າແຈ້ງເຕືອນບໍ່ໄດ້')))
            .finally(() => (loading = false));
    }

    $effect(() => {
        if ($currentGroup) load($currentGroup);
    });

    const dirty = $derived(settings.some((setting) => saved[setting.id] !== setting.enabled));
    const onCount = $derived(settings.filter((setting) => setting.enabled).length);

    function flip(setting: NotificationSetting) {
        setting.enabled = !setting.enabled;
        notice = '';
    }

    async function save() {
        saving = true;
        error = '';
        try {
            const choices = snapshot(settings);
            const response = await saveNotificationSettings(choices, $currentGroup);
            if (response?.result === 0) {
                saved = choices;
                notice = t('Alert settings saved', 'ບັນທຶກການຕັ້ງຄ່າແຈ້ງເຕືອນແລ້ວ');
            } else error = response?.message || t('Could not save the alert settings', 'ບັນທຶກການຕັ້ງຄ່າບໍ່ໄດ້');
        } catch (e) {
            error = (e as Error)?.message || t('Could not save the alert settings', 'ບັນທຶກການຕັ້ງຄ່າບໍ່ໄດ້');
        } finally {
            saving = false;
        }
    }
</script>

<div class="space-y-4">
    <div>
        <h1 class="text-lg font-semibold text-onebank-blue">{t('Notification settings', 'ຈັດການການແຈ້ງເຕືອນ')}</h1>
        <p class="text-sm text-onebank-subtle">{t('Choose which alerts the group’s members receive. Several can be on at once.', 'ເລືອກການແຈ້ງເຕືອນທີ່ສະມາຊິກໃນກຸ່ມຈະໄດ້ຮັບ. ເປີດໄດ້ຫຼາຍລາຍການພ້ອມກັນ.')}</p>
    </div>
    {#if error}<div class="rounded-ob-sm bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}
    {#if notice}<div class="rounded-ob-sm bg-green-50 p-3 text-sm text-green-800" role="status">{notice}</div>{/if}

    <section class="ob-card p-2 tablet:p-3">
        {#if loading && settings.length === 0}
            {#each [0, 1, 2, 3, 4] as i (i)}<div class="m-2 h-14 animate-pulse rounded-ob-md bg-onebank-row"></div>{/each}
        {:else if settings.length === 0}
            <p class="p-8 text-center text-onebank-subtle">{t('No alerts are available for this group', 'ບໍ່ມີການແຈ້ງເຕືອນສຳລັບກຸ່ມນີ້')}</p>
        {:else}
            <ul class="divide-y divide-onebank-row">
                {#each settings as setting (setting.id)}
                    <li>
                        <button type="button" role="switch" aria-checked={setting.enabled}
                                class="flex w-full items-center gap-4 rounded-ob-md px-3 py-3.5 text-left transition-colors hover:bg-onebank-page"
                                onclick={() => flip(setting)}>
                            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full {setting.enabled ? 'bg-onebank-pink text-onebank-red' : 'bg-onebank-page text-onebank-muted'}">
                                <Icon icon={setting.enabled ? 'mdi:bell-ring-outline' : 'mdi:bell-off-outline'} class="h-5 w-5"/>
                            </span>
                            <span class="min-w-0 flex-1">
                                <span class="block font-semibold">{t(setting.titleEn, setting.titleLo)}</span>
                                <span class="block text-sm text-onebank-subtle">{t(setting.descriptionEn, setting.descriptionLo)}</span>
                            </span>
                            <span class="sr-only">{setting.enabled ? t('On', 'ເປີດ') : t('Off', 'ປິດ')}</span>
                            <span aria-hidden="true" class="relative h-7 w-12 shrink-0 rounded-full transition-colors {setting.enabled ? 'bg-onebank-red' : 'bg-onebank-light-grey-4'}">
                                <span class="absolute top-1 h-5 w-5 rounded-full bg-white shadow-ob-card transition-all {setting.enabled ? 'left-6' : 'left-1'}"></span>
                            </span>
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </section>

    {#if settings.length > 0}
        <div class="flex flex-wrap items-center justify-end gap-4">
            <p class="text-sm text-onebank-subtle">{t(`${onCount} of ${settings.length} on`, `ເປີດ ${onCount} ຈາກ ${settings.length}`)}</p>
            <button type="button" class="onebank-secondary-btn h-11 px-6" disabled={!dirty || saving} onclick={() => (settings = settings.map((setting) => ({...setting, enabled: saved[setting.id] ?? setting.enabled})))}>
                {t('Undo changes', 'ຍົກເລີກການປ່ຽນແປງ')}
            </button>
            <button type="button" class="onebank-primary-btn h-11 px-8" disabled={!dirty || saving} onclick={save}>{t('Save', 'ບັນທຶກ')}</button>
        </div>
    {/if}
</div>
