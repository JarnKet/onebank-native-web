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
    import {closeOverlays, navigateToPath} from "../lib/utils/navigation";
    import {routeLocation} from "../stores/route";
    import {usingLocalData} from "../stores/localData";
    import LocalDataNotice from "../lib/components/LocalDataNotice.svelte";
    import routes from "../routes";

    const frames = $derived($popups);
    const overlayShown = $derived(frames.some(frame => frame.isVisible));

    // A route change the app did not start — back/forward, an edited URL, a
    // framed page setting the hash — must close the overlays too, or the new
    // page renders underneath them. Only a change of path counts: the initial
    // run, and a querystring-only change, leave the stack alone.
    let shownPath = untrack(() => $routeLocation.path);
    $effect(() => {
        const path = $routeLocation.path;
        if (path === shownPath) return;
        shownPath = path;
        untrack(() => {
            closeOverlays();
            // The notice belongs to the screen that raised it; the next screen
            // raises its own if it too is answered locally.
            $usingLocalData = false;
        });
    });
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

                // Group management is native now: the flag an embedded page
                // sends picks the screen. Anything unrecognised still gets the
                // legacy page, so an unknown flag degrades instead of breaking.
                groupManagement: (param) => {
                    $popups = [];
                    const native: Record<string, string> = {
                        newgroup: '/register',
                        newonebank: '/register',
                        joingroup: '/group/join',
                        leavegroup: '/group/leave',
                    };
                    if (native[param]) navigateToPath(native[param]);
                    else showPopup('GROUPMANAGEMENT.html', {[param]: 1});
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


<div class="relative h-full min-h-full w-full">
    <!-- The routed page fills the container; b1hybrid overlays stack above it.
         While one is showing, the page is hidden (still mounted, so it keeps its
         state): a page taller than the column — Home is — would otherwise
         scroll out from under the overlay, which only covers one screenful.
         The wrapper is in flow, never positioned, so it cannot cover anything. -->
    <div class="h-full" hidden={overlayShown}>
        {#if $usingLocalData}<LocalDataNotice/>{/if}
        <Router {routes}/>
    </div>

    {#each frames as frame (frame.id)}
        <div class="popup-container ob-card absolute inset-0 z-[5] overflow-hidden">
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

<style>
  /* Full height now that MAIN.html's 48px tab bar is gone. */
  .popup-container {
    height: 100%;
  }
</style>
