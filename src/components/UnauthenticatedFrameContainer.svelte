<script lang="ts">
    import { untrack } from 'svelte';
    import { sessionKey } from '../stores/session';
    import Connector from "../lib/utils/connector";
    import { closeUnauthenticatedPopup, loadUrl, showUnauthenticatedPopup } from '../lib/utils/helper';
    import {logout} from '../lib/session';
    import { unauthenticatedPopups } from '../stores/popup';
    import { createFrameMessageHandler } from "../lib/bridge/frameBridge";

    const frames = $derived($unauthenticatedPopups);
    let conn: Connector;
    let handleFrameMessage: ReturnType<typeof createFrameMessageHandler>;

    // One-shot wiring of the bridge; nothing here may become a dependency.
    $effect(() => untrack(() => {
        conn = new Connector();
        // Same protocol as the authenticated container, minus the handlers that
        // need a logged-in session (loadData/saveData, tabs, group management).
        handleFrameMessage = createFrameMessageHandler({
            connector: conn,
            sessionKey: () => $sessionKey,
            handlers: {
                showPopup: (pagename, param, from, callbackid) =>
                    showUnauthenticatedPopup(pagename, param as any, from, callbackid),
                showPopupExternal: (url) => loadUrl(url),
                closePopup: (result) => closeUnauthenticatedPopup(result),
                logout: () => logout(),
            },
        });
        window.addEventListener('message', handleFrameMessage);
        return () => {
            window.removeEventListener('message', handleFrameMessage);
        };
    }));

</script>

<div id="framecontainer">
    {#each frames as frame (frame.id)}
        <iframe
                id="frame-{frame.id}"
                class={frame.isBcelOne ? 'mobile' : 'desktop'}
                width='100%'
                height='100%'
                src={frame.src}
                allow="camera"
                style="display: {frame.isVisible ? 'block' : 'none'}"
                title="B3 Frame"
        ></iframe>
    {/each}
</div>

<style>
  #framecontainer {
    width: 100%;
    height: 100vh;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: white;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  iframe.desktop {
    width: 100%;
    height: 100%;
    border: none;
  }

  /* Plain CSS rather than `@apply`: a component <style> block is compiled on
     its own, so `@apply` there needs an `@reference` to the theme, and
     svelte-check's CSS pass then reports both at-rules as unknown. The
     breakpoint is `tablet` (768px) from the theme in `src/app.css`. */
  iframe.mobile {
    width: 100%;
    height: 100vh;
    margin: auto;
    border-radius: 0.25rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  @media (width >= 768px) {
    iframe.mobile {
      width: 768px;
      height: 100%;
    }
  }
</style>