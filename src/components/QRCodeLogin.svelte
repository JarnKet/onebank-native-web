<script lang="ts">
    import {untrack} from 'svelte';
    import Connector from "../lib/utils/connector";
    import SocketCluster from "../lib/socket";
    import {completeLogin} from "../lib/session";
    import {language} from "../stores/config";
    import QrCode from "../lib/components/QrCode.svelte";
    import Icon from "@iconify/svelte";

    /** `ONEBANK/getdesktoplogintoken`. Shape fixed by the core. */
    interface LoginTokenResult {
        result: number
        message: string
        logintoken: string
        servertime: number
        devicenumber: string
    }

    let loginQr = $state<string | null>(null)
    let servertime: number | null = null
    let deviceNumber = $state<string | null>(null)
    let stage = $state<'LOADQRCODE' | 'SCANQR' | 'LOGGINGIN'>('SCANQR')

    let tokenInterval: ReturnType<typeof setInterval> | undefined
    let logintoken: string | null = null

    const RELOAD_TOKEN_SECONDS = 300

    let conn: Connector

    // Mount and teardown in one place: the effect's return value is the
    // cleanup, which is what `onDestroy` used to do. `untrack` keeps this a
    // one-shot boot task rather than something that re-runs.
    $effect(() => {
        conn = new Connector()
        void untrack(() => start())

        return () => {
            void clearToken()
            clearInterval(tokenInterval)
        }
    })

    async function start(): Promise<void> {
        await getToken()
        tokenInterval = setInterval(() => {
            void clearToken()
            void getToken()
        }, RELOAD_TOKEN_SECONDS * 1000)
    }

    async function getToken(): Promise<void> {
        stage = 'LOADQRCODE'
        const tokenResult: LoginTokenResult = await conn.sendMessage('ONEBANK', {command: 'getdesktoplogintoken'})

        if (tokenResult.result !== 0) {
            // showError(tokenResult.message)
            return
        }

        logintoken = tokenResult.logintoken
        servertime = tokenResult.servertime
        deviceNumber = tokenResult.devicenumber
        SocketCluster.subscribe('LOGIN-' + tokenResult.logintoken, onLoginApproved)

        loginQr = JSON.stringify({logintoken, servertime})
        stage = 'SCANQR'
    }

    async function clearToken(): Promise<void> {
        if (logintoken) {
            SocketCluster.unsubscribe(logintoken)
            logintoken = null
            servertime = null
        }
    }

    async function onLoginApproved(): Promise<void> {
        if (!logintoken) return
        await SocketCluster.unsubscribe(logintoken)
        stage = 'LOGGINGIN'
        const loginResult = await conn.sendMessage('USER', {command: 'authen', logintoken})
        if (loginResult.result === 0) {
            completeLogin(loginResult.data)
        } else {
            // showError(loginResult.message)
            void getToken()
        }
    }

    const UILanguage = $derived(parseInt($language))

    /** Reactive translation, as in Login.svelte — see the note there. */
    function t(en: string, la: string | null = null, cn: string | null = null, vn: string | null = null): string {
        if (UILanguage === 0) return en
        else if (UILanguage === 1 && la) return la
        else if (UILanguage === 3 && cn) return cn
        else if (UILanguage === 2 && vn) return vn
        else return en
    }
</script>


<div class="flex flex-col items-center">
    {#if stage === "LOADQRCODE"}
        <div   class="w-full">
            <Icon icon="svg-spinners:eclipse-half" class="mx-auto my-6 h-32 w-32 text-gray-300"/>
        </div>
    {:else if stage === "SCANQR" && loginQr}
        <div class="relative">
            <p class=" text-center text-base text-gray-600  mb-3">
                {t('Scan QR code with your mobile device', 'ສະແກນ QR code ດ້ວຍໂທລະສັບມືຖືຂອງທ່ານ')}
            </p>
            <div class="overflow-hidden rounded-2xl  bg-white   flex flex-col items-center">
                <QrCode value={loginQr ?? "onebank"} errorCorrection="H" className="mx-auto" size={280}/>
            </div>
            {#if deviceNumber}
                <div class="device-number relative mx-auto mt-3 flex h-[56px] w-[56px] items-center justify-center rounded-full border-4 border-transparent bg-white text-2xl font-extrabold">
                    {deviceNumber}
                </div>
            {/if}
        </div>
    {/if}

</div>

<style>
  /*
   * Only the animation lives here. The static appearance is Tailwind utilities
   * on the element itself: a component <style> block is compiled on its own, so
   * an `@` + `apply` there needs an `@` + `reference` to the theme, and
   * svelte-check's CSS pass then reports both at-rules as unknown.
   */
  .device-number {
    animation: countdown 300s linear infinite;
  }

  .device-number::before {
    content: '';
    position: absolute;
    top: -0.25rem;
    left: -0.25rem;
    width: 56px;
    height: 56px;
    border: 4px solid transparent;
    border-radius: 9999px;
    animation: spin 300s linear infinite;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* The ring colour walks green -> yellow -> red across the QR code's lifetime,
     reading the theme variables Tailwind emits on `:root`. */
  @keyframes countdown {
    0% {
      border-color: var(--color-green-600);
    }
    40% {
      border-color: var(--color-green-600);
    }
    60% {
      border-color: var(--color-yellow-600);
    }
    80% {
      border-color: var(--color-yellow-600);
    }
    100% {
      border-color: var(--color-red-600);
    }
  }
</style>
