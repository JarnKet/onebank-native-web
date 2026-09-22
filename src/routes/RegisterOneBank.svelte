<script lang="ts">
    /**
     * Creating a OneBank group, in the design's four steps: what OneBank is,
     * the terms, which of your accounts it will hold, then its name and
     * picture. "Back" and "Next" sit together at the bottom of every step.
     */
    import Icon from '@iconify/svelte';
    import SelectableAccount from '../lib/components/SelectableAccount.svelte';
    import GroupProfileFields from '../lib/components/GroupProfileFields.svelte';
    import {changeGroupDetail, createGroup} from '../lib/api/commands';
    import {t} from '../lib/utils/helper';
    import {goHome} from '../lib/utils/navigation';
    import {refreshGroups, selectGroup} from '../stores/groups';
    import {cards} from './account/cards';

    type Step = 'intro' | 'terms' | 'accounts' | 'profile';
    const STEPS: Step[] = ['intro', 'terms', 'accounts', 'profile'];

    let step = $state<Step>('intro');
    let agreed = $state(false);
    let selected = $state<string[]>([]);
    let name = $state('OneBank');
    let detail = $state('');
    let logo = $state('');
    let saving = $state(false);
    let error = $state('');

    const accounts = $derived($cards.flatMap((card) => card.accounts));
    const index = $derived(STEPS.indexOf(step));

    const FEATURES: Array<[string, string]> = [
        ['Open accounts yourself', 'ເປີດບັນຊີດ້ວຍຕົນເອງ'],
        ['One account for several people', 'ບັນຊີສຳລັບຫຼາຍຄົນ'],
        ['Spending limits', 'ກຳນົດວົງເງິນການນຳໃຊ້'],
        ['Payroll and transfers from an Excel file', 'ຈ່າຍເງິນເດືອນ / ໂອນເງິນຈາກໄຟລ໌ Excel'],
        ['E-Cheque', 'E-Cheque'],
    ];
    const REQUIREMENTS: Array<[string, string]> = [
        ['Must have a savings or current account with BCEL.', 'ຕ້ອງມີບັນຊີເງິນຝາກປະຢັດ ຫຼື ກະແສລາຍວັນ ກັບ ທຄຕລ.'],
        ['Must have a valid email and phone number.', 'ຕ້ອງມີອີເມວ ແລະ ເບີໂທລະສັບທີ່ໃຊ້ງານໄດ້.'],
        ['Must have a device able to use online systems: internet access, a screen of 4 inches or larger, an up-to-date browser.', 'ຕ້ອງມີອຸປະກອນທີ່ໃຊ້ລະບົບອອນລາຍໄດ້: ອິນເຕີເນັດ, ໜ້າຈໍ 4 ນິ້ວຂຶ້ນໄປ, ບຣາວເຊີທີ່ອັບເດດ.'],
        ['Must be 18 or older and responsible for electronic transactions under the law.', 'ຕ້ອງມີອາຍຸ 18 ປີຂຶ້ນໄປ ແລະ ຮັບຜິດຊອບຕໍ່ທຸລະກຳເອເລັກໂຕຣນິກຕາມກົດໝາຍ.'],
    ];
    const AGREEMENT: Array<[string, string]> = [
        ['Any operation made in the BCEL i-Bank service with the correct user ID, password and OTP issued by BCEL is considered made by the user. The user is responsible for these transactions, and BCEL will process them without further confirmation.', 'ທຸກການດຳເນີນງານໃນບໍລິການ BCEL i-Bank ທີ່ໃຊ້ລະຫັດຜູ້ໃຊ້, ລະຫັດຜ່ານ ແລະ OTP ທີ່ຖືກຕ້ອງ ຖືວ່າຜູ້ໃຊ້ເປັນຜູ້ເຮັດ. ຜູ້ໃຊ້ຮັບຜິດຊອບຕໍ່ທຸລະກຳເຫຼົ່ານີ້ ແລະ ທຄຕລ ຈະດຳເນີນການໂດຍບໍ່ຕ້ອງຢືນຢັນເພີ່ມ.'],
        ['Users cannot cancel, modify or reject completed transactions through the BCEL i-Bank service.', 'ຜູ້ໃຊ້ບໍ່ສາມາດຍົກເລີກ, ແກ້ໄຂ ຫຼື ປະຕິເສດທຸລະກຳທີ່ສຳເລັດແລ້ວຜ່ານບໍລິການ BCEL i-Bank.'],
    ];

    const canContinue = $derived(
        step === 'intro' || (step === 'terms' && agreed) || (step === 'accounts' && selected.length > 0) || (step === 'profile' && name.trim() !== ''),
    );

    function back() {
        error = '';
        if (index === 0) goHome();
        else step = STEPS[index - 1];
    }

    async function next() {
        error = '';
        if (step !== 'profile') {
            step = STEPS[index + 1];
            return;
        }
        saving = true;
        try {
            // The core creates a group from accounts alone; its name, description
            // and logo are a second call on the new id.
            const response = await createGroup(selected);
            if (response?.result !== 0 || !response.onebankid) {
                error = response?.message || t('Could not create the group', 'ສ້າງກຸ່ມບໍ່ໄດ້');
                return;
            }
            const saved = await changeGroupDetail({name: name.trim(), detail, color: '', logoname: logo}, response.onebankid);
            if (saved?.result !== 0) {
                error = saved?.message || t('The group was created, but its details could not be saved', 'ສ້າງກຸ່ມແລ້ວ ແຕ່ບັນທຶກຂໍ້ມູນກຸ່ມບໍ່ໄດ້');
            }
            await refreshGroups(response.onebankid);
            selectGroup(response.onebankid);
            goHome();
        } catch (e) {
            error = (e as Error)?.message || t('Could not create the group', 'ສ້າງກຸ່ມບໍ່ໄດ້');
        } finally {
            saving = false;
        }
    }

    function toggle(accountid: string) {
        selected = selected.includes(accountid) ? selected.filter((id) => id !== accountid) : [...selected, accountid];
    }
</script>

<section class="mx-auto flex min-h-full max-w-4xl flex-col pb-4">
    <ol class="mb-6 flex justify-center gap-2" aria-label={t('Progress', 'ຂັ້ນຕອນ')}>
        {#each STEPS as item, position (item)}
            <li class="h-1.5 w-10 rounded-full {position <= index ? 'bg-onebank-red' : 'bg-onebank-light-grey-4'}"
                aria-current={position === index ? 'step' : undefined}></li>
        {/each}
    </ol>

    <div class="flex-1">
        {#if step === 'intro'}
            <div class="flex flex-col items-center">
                <img src="img/ob/logo-mark.png" alt="" class="h-40 w-40"/>
                <img src="img/ob/logo-wordmark.svg" alt="ONE BANK" width="183" height="43" class="mt-2 h-8 w-auto"/>
                <div class="mt-8 w-full max-w-xl overflow-hidden rounded-ob-md bg-white shadow-ob-card">
                    <h1 class="bg-linear-to-r from-onebank-expense to-onebank-main px-5 py-3 text-base font-semibold text-white">
                        {t('Register OneBank to use these features:', 'ລົງທະບຽນ OneBank ເພື່ອນຳໃຊ້ຄຸນສົມບັດເຫຼົ່ານີ້:')}
                    </h1>
                    <ul>
                        {#each FEATURES as feature (feature[0])}
                            <li class="flex items-center gap-3 border-b border-onebank-row px-5 py-3 text-sm last:border-0">
                                <Icon icon="mdi:check-circle" class="h-5 w-5 shrink-0 text-onebank-income"/>
                                {t(feature[0], feature[1])}
                            </li>
                        {/each}
                    </ul>
                </div>
            </div>
        {:else if step === 'terms'}
            <h1 class="mb-6 text-center text-xl font-semibold">{t('Terms and Conditions', 'ເງື່ອນໄຂ ແລະ ຂໍ້ກຳນົດ')}</h1>
            {#each [[t("User's requirements", 'ເງື່ອນໄຂຂອງຜູ້ໃຊ້'), REQUIREMENTS], [t('User agreement', 'ຂໍ້ຕົກລົງຂອງຜູ້ໃຊ້'), AGREEMENT]] as [heading, list] (heading)}
                <h2 class="mb-2 mt-5 font-semibold">{heading}</h2>
                <ol class="space-y-3 rounded-ob-md bg-white p-5 text-sm leading-relaxed shadow-ob-card">
                    {#each list as [en, lo], number (en)}
                        <li class="flex gap-3">
                            <span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-onebank-row text-[11px]">{number + 1}</span>
                            <span>{t(en, lo)}</span>
                        </li>
                    {/each}
                </ol>
            {/each}
            <label class="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-onebank-income">
                <input type="checkbox" bind:checked={agreed} class="h-4 w-4 rounded border-onebank-muted text-onebank-red focus:ring-onebank-red"/>
                {t('I agree to the terms and conditions', 'ຂ້ອຍຍອມຮັບເງື່ອນໄຂ ແລະ ຂໍ້ກຳນົດ')}
            </label>
        {:else if step === 'accounts'}
            <h1 class="mb-6 text-center text-xl font-semibold">{t('Choose the accounts to view or transact with', 'ເລືອກບັນຊີທີ່ຈະໃຊ້ເບິ່ງ ຫຼື ເຄື່ອນໄຫວ')}</h1>
            <div class="grid grid-cols-1 gap-4 tablet:grid-cols-2">
                {#each accounts as account (account.accountid)}
                    <SelectableAccount {account} selected={selected.includes(account.accountid)} onToggle={() => toggle(account.accountid)}/>
                {/each}
            </div>
        {:else}
            <h1 class="mb-6 text-center text-xl font-semibold">{t('Add group details', 'ເພີ່ມຂໍ້ມູນກຸ່ມ')}</h1>
            <GroupProfileFields bind:name bind:detail bind:logo/>
        {/if}
    </div>

    {#if error}<p class="mt-4 text-center text-sm text-red-600" role="alert">{error}</p>{/if}

    <div class="mt-10 flex justify-center">
        <div class="flex rounded-ob-md border-2 border-onebank-light-grey-4 bg-onebank-light-grey-4 p-0.5">
            {#if step !== 'intro'}
                <button type="button" class="h-10 w-36 rounded-ob-sm bg-white text-base font-bold text-onebank-blue hover:bg-onebank-blue-soft" onclick={back}>
                    {t('Back', 'ກັບຄືນ')}
                </button>
            {/if}
            <button type="button" class="h-10 w-36 rounded-ob-sm bg-onebank-red text-base font-bold text-white disabled:opacity-50"
                    disabled={!canContinue || saving} onclick={next}>
                {step === 'profile' ? (saving ? t('Creating…', 'ກຳລັງສ້າງ…') : t('Finish', 'ສຳເລັດ')) : t('Next', 'ຕໍ່ໄປ')}
            </button>
        </div>
    </div>
</section>
