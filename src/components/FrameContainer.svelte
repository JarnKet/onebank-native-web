<script lang="ts">
    import {untrack} from 'svelte';
    import {loginData, sessionKey} from '../stores/session';
    import Connector from "../lib/utils/connector";
    import {closePopup, loadUrl, showPopup} from '../lib/utils/helper';
    import {logout} from '../lib/session';
    import {popups} from '../stores/popup';
    import {adoptLoadHomeResult} from "../stores/onebankGroups";
    import {openAddMemberDialog} from "../stores/ui";
    import {createFrameMessageHandler} from "../lib/bridge/frameBridge";
    import {startVisibilityRelay} from "../lib/bridge/visibility";
    import Router from "svelte-spa-router";
    import routes from "../routes";

    const frames = $derived($popups);
    let conn: Connector;
    let handleFrameMessage: ReturnType<typeof createFrameMessageHandler>;

    // One-shot wiring of the bridge; nothing here may become a dependency.
    $effect(() => untrack(() => {
        conn = new Connector();
        handleFrameMessage = createFrameMessageHandler({
            connector: conn,
            sessionKey: () => $sessionKey,
            handlers: {
                showPopup: (pagename, param, from, callbackid) => showPopup(pagename, param as any, from, callbackid),
                showPopupExternal: (url) => loadUrl(url),
                closePopup: (result) => closePopup(result),
                logout: () => logout(),

                loadData: (service) => $loginData[service as keyof typeof $loginData],
                saveData: (service, data) => loginData.update(current => ({...current, [service]: data})),

                onLoadHome: (response) => adoptLoadHomeResult(response),

                openAddMemberDialog: () => openAddMemberDialog(),

                groupManagement: (param) => {
                    $popups = [];
                    showPopup('GROUPMANAGEMENT.html', {[param]: 1});
                },
            },
        });
        window.addEventListener('message', handleFrameMessage);
        // MAIN.html used to relay this; the embedded pages' idle logout needs it.
        const stopVisibilityRelay = startVisibilityRelay();
        return () => {
            window.removeEventListener('message', handleFrameMessage);
            stopVisibilityRelay();
        };
    }));
</script>


<div class="relative h-full w-full z-10">
    <!-- The routed page fills the container. b1hybrid overlays stack above it.
         Each route positions itself — a wrapper here would cover the page even
         when a route renders nothing and swallow every click. -->
    <Router {routes}/>

    {#each frames as frame (frame.id)}
        <div class="popup-container absolute top-0 w-full z-[1]">
            <iframe
                    id="frame-{frame.id}"
                    width='100%'
                    height='100%'
                    src={frame.src}
                    allow="camera; clipboard-read; clipboard-write"
                    style="display: {frame.isVisible ? 'block' : 'none'}"
                    title="B3 Frame"
            ></iframe>
        </div>
    {/each}
</div>

<style lang="scss">
  /* Full height now that MAIN.html's 48px tab bar is gone. */
  .popup-container {
    height: 100%;
  }
</style>
