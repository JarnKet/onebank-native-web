<script lang="ts">
    /**
     * QR login, simulated.
     *
     * The real flow shows a token as a QR code, and the BCEL One app on the
     * user's phone approves it over a socket. There is no socket and no phone
     * here, so the code is drawn from the mock token and "I've scanned it"
     * stands in for the approval.
     */
    import {untrack} from 'svelte';
    import Icon from '@iconify/svelte';
    import FauxQr from '../lib/components/FauxQr.svelte';
    import {authenticateToken, getLoginToken} from '../lib/api/commands';
    import {completeLogin} from '../lib/session';
    import {language} from '../stores/config';

    let token = $state('');
    let deviceNumber = $state('');
    let stage = $state<'LOADING' | 'SCAN' | 'LOGGINGIN'>('LOADING');
    let error = $state('');

    const UILanguage = $derived(parseInt($language));

    /** Reactive translation, as in Login.svelte — see the note there. */
    function t(en: string, la: string | null = null, cn: string | null = null, vn: string | null = null): string {
        if (UILanguage === 0) return en;
        else if (UILanguage === 1 && la) return la;
        else if (UILanguage === 3 && cn) return cn;
        else if (UILanguage === 2 && vn) return vn;
        else return en;
    }

    async function refresh(): Promise<void> {
        stage = 'LOADING';
        error = '';
        const response = await getLoginToken();
        if (response.result !== 0 || !response.logintoken) {
            error = response.message || t('Could not create a login code', 'ສ້າງລະຫັດເຂົ້າສູ່ລະບົບບໍ່ໄດ້');
            return;
        }
        token = response.logintoken;
        deviceNumber = response.devicenumber ?? '';
        stage = 'SCAN';
    }

    async function approve(): Promise<void> {
        stage = 'LOGGINGIN';
        const response = await authenticateToken(token);
        if (response.result === 0 && response.data) completeLogin(response.data as any);
        else {
            error = response.message || t('Login failed. Please try again.', 'ເຂົ້າສູ່ລະບົບບໍ່ສຳເລັດ. ກະລຸນາລອງໃໝ່.');
            void refresh();
        }
    }

    $effect(() => {
        void untrack(() => refresh());
    });
</script>

<div class="flex flex-col items-center gap-3">
    <p class="text-center text-base text-gray-600">
        {t('Scan QR code with your mobile device', 'ສະແກນ QR code ດ້ວຍໂທລະສັບມືຖືຂອງທ່ານ')}
    </p>
    {#if stage === 'LOADING'}
        <Icon icon="svg-spinners:eclipse-half" class="my-6 h-32 w-32 text-gray-300"/>
    {:else}
        <FauxQr value={token} label={t('Login QR code', 'QR code ເຂົ້າສູ່ລະບົບ')}/>
        {#if deviceNumber}
            <div class="flex h-14 w-14 items-center justify-center rounded-full border-4 border-green-600 bg-white text-2xl font-extrabold">
                {deviceNumber}
            </div>
        {/if}
        <button type="button" class="onebank-primary-btn" disabled={stage === 'LOGGINGIN'} onclick={approve}>
            {stage === 'LOGGINGIN' ? t('Signing in...', 'ກຳລັງເຂົ້າສູ່ລະບົບ...') : t("I've scanned it (demo)", 'ສະແກນແລ້ວ (ທົດລອງ)')}
        </button>
    {/if}
    {#if error}
        <p class="text-sm text-red-600" role="alert">{error}</p>
    {/if}
</div>
