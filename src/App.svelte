<script lang="ts">
    import FormLogin from './components/FormLogin.svelte';
    import {loggedIn} from "./stores/session";
    import Login from "./components/Login.svelte";
    import QRCodeLogin from "./components/QRCodeLogin.svelte";
    import MainContent from "./components/MainContent.svelte";
    import {restoreSession} from "./lib/session";

    let isQrLogin = $state(true);

    // A login survives a reload. Adopting it is synchronous — there is no core
    // to re-validate against — so it runs before the first render and the
    // login form never flashes.
    restoreSession();
</script>

<!--
    A boundary at the root, because every failure mode of this app looks the
    same from the outside: a blank white page. The shell is the only thing
    between the user and `#app`, so an error thrown while it renders leaves
    nothing at all on screen and nothing in the console worth reading.
-->
<svelte:boundary onerror={(error) => console.error('[onebank] the app failed to render', error)}>
    {#if $loggedIn}
        <MainContent/>
    {:else}
        <Login onLoginTypeChange={() => (isQrLogin = !isQrLogin)}>
            {#if isQrLogin}
                <QRCodeLogin/>
            {:else}
                <FormLogin/>
            {/if}
        </Login>
    {/if}

    {#snippet failed(error, reset)}
        <div class="flex h-screen w-screen flex-col items-center justify-center gap-4 p-8 text-center">
            <div class="text-lg font-semibold text-gray-800">Something went wrong</div>
            <div class="max-w-md text-sm text-gray-600">
                {(error as Error)?.message ?? 'The app could not be displayed.'}
            </div>
            <div class="flex gap-3">
                <button class="onebank-primary-btn" onclick={reset}>Try again</button>
                <button class="onebank-secondary-btn" onclick={() => location.reload()}>Reload</button>
            </div>
        </div>
    {/snippet}
</svelte:boundary>
