<script lang="ts">
    import FormLogin from './components/FormLogin.svelte';
    import {loggedIn} from "./stores/session";
    import {unauthenticatedPopups} from "./stores/popup";
    import UnauthenticatedFrameContainer from "./components/UnauthenticatedFrameContainer.svelte";
    import Login from "./components/Login.svelte";
    import QRCodeLogin from "./components/QRCodeLogin.svelte";
    import MainContent from "./components/MainContent.svelte";
    import SecondaryLoadingSpinner from "./components/SecondaryLoadingSpinner.svelte";
    import {restoreSession} from "./lib/session";
    import {untrack} from "svelte";

    let isQrLogin = $state(true);

    // A login survives a reload now, so boot cannot decide between the login
    // screen and the app until it knows whether the stored session is still
    // one the core honours. Showing the login form first and swapping it out
    // would flash a form at every reload.
    let restoring = $state(true);

    // A one-shot boot task, not a reaction: `untrack` guarantees that whatever
    // `restoreSession` touches on its way to its first await cannot become a
    // dependency and re-run the login check. `restoring` is only ever assigned
    // from the settled promise, which is outside the effect's tracked run.
    $effect(() => {
        untrack(() => restoreSession()).finally(() => {
            restoring = false;
        });
    });
</script>

<!--
    A boundary at the root, because every failure mode of this app looks the
    same from the outside: a blank white page. The shell is the only thing
    between the user and `#app`, so an error thrown while it renders leaves
    nothing at all on screen and nothing in the console worth reading.
-->
<svelte:boundary onerror={(error) => console.error('[onebank] the app failed to render', error)}>
    {#if restoring}
        <div class="flex h-screen w-screen items-center justify-center">
            <!-- The secondary (grey) spinner, not the primary one: that is
                 white, meant for the red button, and invisible against this
                 page's near-white background — a blank screen by another name. -->
            <SecondaryLoadingSpinner/>
        </div>
    {:else if $unauthenticatedPopups && $unauthenticatedPopups.length > 0}
        <UnauthenticatedFrameContainer/>
    {:else if $loggedIn}
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
