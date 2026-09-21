> **Superseded (2026-09-21).** This plan describes porting the iframe-based app page by page. The app has since been rebuilt as a standalone front end on mock data, matching the Figma design, with no iframes and no core connection. Kept as history; see `PRODUCT.md`, `DESIGN.md` and `CLAUDE.md` for the current state.

# OneBank Web: fork from onebank-ui and build the web app natively here

## Context

`onebank-webapp` is a Svelte 5 + Vite shell that renders the OneBank desktop experience entirely out of iframes. Every menu click spawns a cross-document iframe; all backend access is tunnelled through `postMessage`. There is no router, no shared state, no shared component tree, and no browser history.

**The chosen direction:** stop treating `onebank-ui` as a dependency. It stays frozen as the **mobile** app, shipped inside the native Android/iOS wrappers, untouched. The **web** version gets built natively inside this project as a real SPA. Two codebases, two products, one backend.

Two scope decisions are settled:

- **Pages in scope:** the 9 corporate OneBank pages — `HOME`, `TRANSACTION`, `AUTHORIZATION`, `ROLE`, `ACCOUNT`, `MEMBER`, `GROUP`, `GROUPMANAGEMENT`, `REGISTERONEBANK`. OneBankKid and the transfer/statement family are out.
- **`MAIN.html` is dropped.** This app takes over group/tab management natively and iframes b1hybrid pages directly from its own overlay stack. b1hybrid's code is still never edited — it just gets loaded one level higher.

## Status

| Phase | State |
|---|---|
| 0 — Project hygiene | **Done** (commit `b152668`) |
| 1 — Foundation | **Done**, verified in the browser |
| 2 — Shell replaces `MAIN.html` | **Done** — `MAIN.html` no longer loaded; HOME is native |
| 3 — Simple pages | **In progress** — `GROUP` and `ACCOUNT` done, three to go |
| 4 — Complex pages | Not started |
| 5 — Cleanup, both repos | Not started |
| H — Hardening pass (deps, Tailwind 4, runes) | **Done** — see below |

Current gates: `build` ✓ · `290 tests` ✓ · `svelte-check` **0 errors** / 17 warnings
(down from 172 → 64 → 58 → 0) · `pnpm audit` 0 vulnerabilities.

**The hardening pass (phase H)** ran across the whole app rather than a page at a time:

- One lockfile. `package-lock.json` and `pnpm-lock.yaml` both existed and `node_modules` matched
  neither; pnpm won and `package-lock.json` is gitignored.
- Dependencies to latest — Vite 6→8, vite-plugin-svelte 5→7 (its peer forces the Vite major),
  Vitest 3→4, Tailwind 3→4, svelte 5.56, jsdom 26→29. **TypeScript stays on 5.9.3:** svelte-check
  tops out at 4.7.6 and peer-requires `typescript@^5 || ^6`, so TS 7 would break `check`.
  15 advisories (2 critical, 10 high) → 0.
- Tailwind 4: `tailwind.config.js` and `postcss.config.js` are gone; the theme is an `@theme`
  block in `src/app.css`.
- Every component the app owns is runes. `svelte-grid` is gone, replaced by a native grid whose
  collision maths lives in `gridLayout.ts` under test. `src/lib/modules/Calendar/**` stays legacy
  and vendored.

What Phase 1 actually shipped, beyond the plan below:

- `src/lib/api/` — 16 typed commands over an injectable transport, so tests never build an RSA keypair
- `src/lib/bridge/` — one message handler for both containers, origin-checked; `FrameContainer` 322 → 220 lines, `UnauthenticatedFrameContainer` 138 → 75
- `src/lib/routes.ts` + `src/routes/` — route table and outlet; every page has a URL, content still iframed
- `src/lib/utils/navigation.ts` — the routed-vs-overlay dispatcher
- `src/stores/route.ts` — see "Traps found" below
- `src/stores/onebankGroups.ts` — `adoptLoadHomeResult()`, which is what actually makes the sidebar work


---

## 1. Current Architecture Summary

### 1.1 The three codebases

| Codebase | Location | Stack | Role after this change |
|---|---|---|---|
| `onebank-webapp` | this repo | Svelte 5.20 + Vite 6 + Tailwind 3, SPA | **The web app.** Grows from shell into the whole product |
| `onebank-ui` | `/home/katai/IdeaProjects/onebank-ui` (sibling, **separate git repo**) | Svelte 5.38 + Vite 6, multi-page — 47 pages, ~55k LOC | **Mobile only.** Frozen w.r.t. this work; sheds its desktop code |
| `b1hybrid` | `onebank-webapp/b1hybrid/` → **symlink to `/var/www/html/b1hybrid`**, the copy Apache actually serves (`github.com/bcel-prd/b1hybrid.git`) | ZeptoJS + `script.js`, plus Svelte 4 + Rollup. 64 feature dirs → **190 flat `.html` pages at repo root** | **Unchanged.** Still iframed |

The shell is smaller than it looks: of 38,671 lines, **35,869 are the vendored Lao/Buddhist `Calendar` module** (`src/lib/modules/Calendar/calendar.ts` alone is 33,005 lines of generated data, used only by `Login.svelte`). Real hand-written shell code is **~2,900 lines**.

### 1.2 Frame topology today — three levels deep

```
onebank-webapp  (App.svelte → MainContent → Layout → FrameContainer)
│
├── iframe #ONEBANK_MAINFRAME ── b1hybrid/MAIN.html      ← the entire content area
│   │   (jQuery tab host, 1816 lines, itself an iframe manager + message relay)
│   ├── iframe ── onebank-ui HOME.html
│   ├── iframe ── onebank-ui ONEBANKKIDHOME.html
│   ├── iframe ── onebank-ui GROUPMANAGEMENT.html
│   └── iframe ── b1hybrid's own BCEL One pages
│
└── iframe frame-<timestamp>[] ── popup stack (onebank-ui OR b1hybrid)
```

`MAIN.html:888-898` (`loadFrame`) builds onebank-ui URLs from the `onebankpath` query param; `MAIN.html:1618` relays messages up to the shell (`to === "browser"`) and down to the active child. So today's most important onebank page, `HOME`, is a **grandchild** iframe.

### 1.3 Routing in the shell — there is none

Navigation is a `popups` array in `src/stores/popup.ts`:

- `Sidebar.handleMenuClick` (`Sidebar.svelte:16-27`) → `showPopup('<PAGE>.html', {onebankid})`
- `helper.ts:99-135` builds a URL and pushes a `PopupMetadata`, setting all previous entries `isVisible:false` rather than destroying them
- `FrameContainer.svelte:278-291` renders `{#each frames}` as stacked iframes toggled by `display:none`
- `closePopup()` (`helper.ts:196-282`) pops the stack and re-shows the previous frame

The URL never changes. No deep links, no back button, no refresh-in-place — `loggedIn` is a plain `writable(false)`, so a reload logs you out. That is why "logout" is implemented as `window.location.reload()`.

**~~A reload logs you out.~~ — fixed after Phase 3 started.** The core attaches a login to the
session key `getsession` negotiates, and `Connector` held that key and its password in memory
only. `src/lib/session.ts` now persists both, plus the login payload, to sessionStorage; `App.svelte`
adopts them on boot and validates with a real `loadgroups` before choosing the app over the login
screen. Logout became `logout()` — forget, clear, *then* reload. The reload-as-logout trick still
works, it just cannot resurrect the session any more.

### 1.4 Page → origin resolution

`helper.ts:51-82` `buildPopupUrl()`:

- `onebankPath` = `http://10.0.19.65:7000/` → onebank-ui (`stores/config.ts:13`)
- `payloadPath` = `http://10.0.19.65/b1hybrid/` → b1hybrid (`config.ts:11`)
- `MAIN.html`, the 61 `BCELONE_PAGES` (`lib/constant.ts:3-61`) and the 10 `specialPages` (`helper.ts:59-64`) → b1hybrid
- everything else → onebank-ui

Every URL carries `versioncode=320&isinbrowser=1&isdesktop=1&lang=&onebankpath=`. **`isinbrowser=1` is what switches onebank-ui out of native-bridge mode into postMessage mode.**

### 1.5 Auth / session — already owned by this app

This is the part that makes a native rewrite cheap. `src/lib/utils/connector.ts` already does the whole encrypted session **in this project**:

- RSA-2048 device keypair generated in-browser, persisted in `localStorage.devicekey-*`
- `getsession` handshake against `http://10.0.19.65/service3.php`, hardcoded server public key
- `sendMessage(service, data)` AES-encrypts each request with the negotiated session password
- `sessionKey`/`sessionPassword` held in private **static** fields, never exposed

The iframes have no network access of their own; every call is `postMessage({type:'sendMessage'})` → shell `Connector.sendMessage()` → reply by `callbackid`. **A natively-written page just calls `conn.sendMessage()` directly** — no bridge, no proxy hop, nothing to build.

Two login paths already work: QR (via SocketCluster `bcel.la:8872`, channel `LOGIN-<token>`) and a dev form login.

### 1.6 The backend contract for the 9 in-scope pages is small and fully enumerable

> **Phase 2 correction: it is 17 commands, not 16.** A native HOME needs
> `ONEBANKHOME/loadwidget`, with `widget: 'ACCOUNTBALANCES' | 'USAGEDAILY' | 'USAGESHARE'` —
> the three home widgets are the only callers, which is why iframing HOME hid it.

This is the finding that de-risks the rewrite. Across all 9 pages there are **46 `sendMessage` call sites hitting just 3 services and 16 commands**:

| Service | Commands |
|---|---|
| `ONEBANKHOME` | `loadhome`, `savehomemenus` |
| `ONEBANKGROUP` | `loadgroups`, `creategroup`, `joingrouprequest`, `leavegroup`, `changegroupdetail`, `changeaccounts`, `addmember`, `addmemberenquiry`, `removemember`, `getpermissions`, `removepermission` |
| `ONEBANKTRANSACTION` | `viewtransactions`, `getpendingapprovals`, `getapprovaldetail` |

Response shapes are already typed — `LoadHomeResult`, `Account`, `User`, `GroupDetail`, `Menu` in `src/definition.ts:1-100` (this repo) and in onebank-ui's `libs/definition.ts`. The "undocumented protocol" risk that normally sinks a rewrite does not apply here.

### 1.7 The decisive finding: the web UI is already ~6,300 lines written

onebank-ui already contains **desktop-specific component trees** for exactly the 9 in-scope pages, gated behind its `isDesktop` flag (`libs/utils/native.ts:65`):

| Page | Desktop files | Desktop LOC | Total page LOC |
|---|---|---|---|
| `ROLE` | 12 | 2,376 | 4,301 |
| `MEMBER` | 8 | 1,357 | 2,318 |
| `HOME` | 9 | 769 | 3,402 |
| `AUTHORIZATION` | 2 | 441 | 1,594 |
| `ACCOUNT` | 4 | 382 | 794 |
| `TRANSACTION` | 2 | 313 | 783 |
| `GROUPMANAGEMENT` | 5 | 292 | 548 |
| `REGISTERONEBANK` | 4 | 267 | 572 |
| `GROUP` | 1 | 99 | 356 |
| **Total** | **47 files** | **6,296** | **14,668** |

Plus `pages/DESKTOP/` (1,260 LOC) — an entire parallel desktop shell with its own `Login.svelte` and iframe host, duplicating what `onebank-webapp` does.

**So the "rewrite" is mostly a harvest.** The web UI has already been built; it is trapped in the mobile repo behind `isDesktop` branching in 14 files. This work lifts it out, gives it a real router and real data access, and lets onebank-ui delete it.

### 1.8 b1hybrid dependency of the 9 pages is far narrower than expected

Grepping every `showPopup`/`showPopupForResult` call site in the 9 pages:

- **`TWOFACTOR.html` (b1hybrid) — needed by `ROLE` only**, 2 call sites (`ROLE/components/StepNewRoleConfirm.svelte:47`, `ROLE/components/desktop/StepAddRole.svelte:104`)
- `ADDACCOUNT.html` (onebank-ui, out of scope) — 1 call site in `ACCOUNT` desktop
- `readBarcode` — 1 call site in `HOME/components/MainNav.svelte:39`; in browser mode it already degrades to `prompt('Enter QR code')` (`native.ts:462`)
- `HOME` is a **launcher**: `Shortcuts`, `Functions`, `QuickAccessMenu`, `MainNav`, `DesktopBottomNav` open `${pageName}.html` where the name comes from the server (`loadhome`'s `shortcutmenus` / `usablemenus` / `allmenus` / `homemenus`). Most of those targets are b1hybrid pages

That last point is the real design constraint, and it is handled rather than fought: **HOME's menu grid stays a launcher into b1hybrid iframes.** No change needed — that is exactly what the overlay stack is for.

---

## 1.9 Traps found while implementing (read before Phase 2)

Four things cost real time in Phase 1 and none were visible from reading the code:

**~~Nothing sends `updateTab`.~~ — WRONG, corrected in Phase 2.** `MAIN.html:988` fires
`window.parent.postMessage({type:'updateTab', onebankid}, '*')` at the end of *every* `loadFrame`.
This claim was written against the stale gitlab checkout §7 warns about, which is exactly the trap
that section describes — it caught us anyway.

What is true: `updateTab` fires with `onebankid: undefined` for every non-group frame
(`card`, `message`, `setting`, `service`, `newonebank`, `groupmanagement`), and the shell's handler
assigned that straight to `currentGroup`. So the active group was being *cleared*, not never set.
`adoptLoadHomeResult` worked around it by taking the group id off the `loadhome` response.

Phase 2 removes the path for the real reason: this app no longer loads `MAIN.html`, so the only
sender is gone. `src/stores/groups.ts` owns the group list now.

**svelte-spa-router 5 is runes-based, and this shell is legacy.** It exposes `router.location` as
`$derived` state, not a store. Svelte 5's legacy mode resolves `$:` dependencies *statically* from
referenced identifiers, and an imported binding is not one — so `$: x = router.location` runs once
and never updates. The sidebar highlight froze. `src/stores/route.ts` republishes the location over
the store contract, which both modes track. **Any legacy `$:` reading imported runes state has this
bug**; it will recur in Phase 2 as native components (runes) meet the existing shell (legacy).

**Route components must position themselves.** A wrapper `<div class="absolute … w-full">` around
the router outlet stays in the DOM on routes that render nothing, covers the main frame, and
silently eats every click. There is no wrapper now; each route owns its layout.

**The port collision is not theoretical.** With the shell on onebank-ui's port, Vite answers
`HOME.html` with its own `index.html`, so the shell renders *inside its own content frame* as a
login screen. The shell now runs on **7100**; 7000 belongs to onebank-ui, which pins it with
`strictPort`. `assertDistinctOrigins()` in `src/lib/env.ts` fails loudly if this recurs.

A fifth, softer lesson: all four were found by running the app, none by the test suite. The suite is
strong on pure logic and was blind to composition until `FrameContainer.overlay.test.ts` started
mounting real components with `Connector` stubbed. Phase 2 should lean on that pattern from the
start.

**Two more, from the hardening pass:**

**A green install says nothing about whether your config survived.** Vitest 4 moved
`poolOptions.<pool>.execArgv` to a top-level `test.execArgv` and *silently ignores* the old key.
The suite went from 271 passing to 172 failing on a config file that still parsed fine.

**The whole suite can be broken by a Node upgrade with no code change at all.** Node 22+ defines
`globalThis.localStorage`; Vitest's jsdom environment skips any global that already exists, so
jsdom's `Storage` never gets installed and every test file dies in `beforeEach`. The fix is
`--no-experimental-webstorage` in `vitest.config.ts`. This also means **the "271 tests ✓" gate
recorded above had been false for some time** — nobody had run it on a current Node.

**A racy test only looks like a version regression.** `navigation.test.ts` waited one macrotask
after `push()`, but jsdom assigns `location.hash` synchronously and dispatches `hashchange` a task
later. Assertions on the hash passed inside that window; the one assertion on listener-derived
state failed. It had always been racy — the framework timing beneath it just moved.

---

## 2. Feasibility Verdict

### ✅ **Yes — and this is the better of the two strategies.**

Building the web app natively here, with onebank-ui frozen as mobile, is feasible and lower-risk than sharing source. Five reasons:

1. **The session layer already lives here.** `Connector` does the RSA/AES handshake and `sendMessage` in this project today. Natively-written pages call it directly. There is no bridge to build, no transport to abstract, no `postMessage` protocol to preserve for onebank pages.
2. **The backend contract is 3 services / 16 commands** (§1.6), already typed. This is the thing that usually makes rewrites fail, and here it is a day of work to pin down, not a quarter.
3. **~6,300 lines of desktop UI already exist** (§1.7) as a starting point and an executable spec. This is a port, not a blank page.
4. **Zero risk to mobile.** The dominant risk of the shared-source approach — that refactoring `native.ts` or `libs/store.ts` breaks the native app — disappears entirely. onebank-ui is not touched.
5. **The two products genuinely want different shapes.** onebank-ui pages are phone-shaped step wizards (`Step.svelte`, swipe-back, forward/backward page transitions, a global `backStack`). A desktop banking app wants tables, multi-pane layouts, keyboard navigation, deep links. Porting mobile screens 1:1 would produce a bad desktop app. The team already knows this — hence the 47 desktop files and the `DESKTOP` page. **This split is already happening, messily, inside the mobile repo.** This work completes it cleanly.

### What this does not achieve

**It is not "no iframes".** b1hybrid stays iframed permanently:

- `TWOFACTOR` for role authorization (narrow — `ROLE` only)
- The BCEL One page universe that `HOME`'s server-driven menu grid launches into (broad — this is most of the 190 b1hybrid pages)

Realistic outcome: **onebank-ui iframes go to zero; b1hybrid iframes remain**, but flattened from three nesting levels to one, and driven by a real router instead of a jQuery tab host.

### The honest cost

**Permanent duplication of business logic across two codebases.** Every future OneBank feature must be built twice, and transaction validation, permission semantics and fee rules must stay behaviourally identical on web and mobile or users get different answers on different devices. In banking that is a real, ongoing tax — not a one-time migration cost. This is the price of the strategy, and it should be an explicit, accepted decision rather than a discovered surprise. Mitigations in §5.6.

---

## 3. Advantages

**Zero risk to the mobile app.** The single biggest hazard of sharing source — a refactor to `native.ts`'s three-way transport switch or to `libs/store.ts`'s module-level `currentPage`/`backStack` singletons regressing the native build — is eliminated by construction. No submodule, no version pinning, no coupled release train, no 47-page CI guard.

**Direct backend access.** Every call today is `postMessage` → shell → `axios` → shell → `postMessage`, serialised twice and correlated by a 6-digit `Math.random()` trace id with no collision check. Native pages call `Connector.sendMessage()` in-process: one round trip, typed, with a real stack trace on failure.

**A desktop-native UX, not a stretched phone.** Free of `Step.svelte`, swipe-back, and the mobile page-stack model, the web app can use tables with sorting and pagination for `TRANSACTION`/`AUTHORIZATION`, a master-detail split for `MEMBER`/`ROLE`, real modals that overlay the viewport, keyboard navigation, and multi-column forms.

**Real routing and history.** Deep links (`/transaction`, `/role/permissions`), working back/forward, refresh-in-place, bookmarkable pages, shareable URLs — none of which exist today.

**Shared state, no synchronisation.** `onebankGroups`, `currentGroup`, `loginData` become plain stores read directly by pages. The `updateTab` → clear-everything → reload dance (`FrameContainer.svelte:146-166`) and `reloadOnebank`'s postMessage round-trip (`helper.ts:156-177`) both disappear.

**Two nesting levels removed.** Dropping `MAIN.html` deletes ~1,820 lines of jQuery tab management and blind message relay from the hot path.

**Debuggable.** One component tree, one console, one source map, HMR that reloads what you edited, Svelte DevTools that sees the whole app. Today a single click crosses three browsing contexts.

**Performance.** Each iframe today boots its own Svelte runtime, Tailwind bundle and `@vitejs/plugin-legacy` polyfills. One app, shared chunks, route-level code splitting. Menu switches become component swaps, not document loads.

**Security posture improves sharply.** Today `FrameContainer.handleFrameMessage` validates neither `e.origin` nor `e.source` while exposing `sendMessage` (arbitrary authenticated backend calls), `loadAuthToken`/`saveAuthToken` (arbitrary `localStorage` read/write) and `showPopupExternal` (arbitrary iframe injection). Once onebank pages are native, that handler's surface shrinks to what b1hybrid actually needs and can be origin-locked.

**onebank-ui gets simpler too.** It can delete 47 desktop files (~6,300 LOC), the `DESKTOP` page (1,260 LOC), and `isDesktop` branching from 14 files — becoming a cleaner, purely mobile codebase.

---

## 4. Disadvantages / Risks

**Permanent duplication — the dominant cost.** Two implementations of the same banking domain, forever. Features and fixes land twice. Divergence is not hypothetical: it will happen the first time someone patches a validation rule under deadline pressure and forgets the other repo. See §5.6 for mitigations, but none of them eliminate this.

**Behavioural divergence in money-movement logic is high-severity.** `AUTHORIZATION` approval rules and `ROLE` permission semantics must match mobile exactly. A web-only bug here is a production incident, not a cosmetic issue. These two pages deserve the most careful porting and the most QA.

**~~Reimplementing `MAIN.html`'s responsibilities is the largest unknown.~~ — overstated, measured in Phase 2.**
`MAIN.html:1722` deletes the entire BCEL One half of the file when `isdesktop=1`
(`#bottomtab`, the four static frames, the `.app.bcelone` tab), `:1641` hides the hamburger, and
`rearrangeOnebankKidGroups` (`:1441`) filters every KID group out on desktop. What actually ran
under this app was: group tabs, `HOME.html`, and `GROUPMANAGEMENT.html`. The live desktop surface
was a couple of hundred lines, not 1,820, and Phase 2 did not overrun.

**`HOME` is a launcher into 190 b1hybrid pages.** Its menu grid is server-driven (`loadhome` returns `shortcutmenus`/`usablemenus`/`allmenus`/`homemenus`) and most targets are b1hybrid. The overlay stack must handle every one of them, including pages nobody has exercised in a desktop browser. Expect a long tail of "this BCEL One page renders wrong at desktop width" bugs that are **not fixable here** — b1hybrid is out of scope. Some may need a fixed phone-width frame, as `UnauthenticatedFrameContainer` already does with its `.mobile` class (`app.css:41-44`).

**Up-front investment before anything ships.** Router, layout, group/tab management and the data layer must all exist before the first page works. Unlike an incremental migration, there is a period with real cost and no user-visible progress. Phase ordering in §6 keeps this to two phases.

**The shell has no safety net.** No tests, no lint, no typecheck script, and **no `tsconfig.json` at all** despite ~30 `.ts` files — `jsconfig.json`'s `include` omits `**/*.ts`, so those files sit outside the declared project. onebank-ui has vitest but thin coverage. Fix this in Phase 0 or every later phase rests on manual QA.

**Dialect mismatch.** The shell runs Svelte 5 in **legacy/compat mode** — `svelte.config.js` sets no `compilerOptions.runes`, and every component uses Svelte 4 idioms (`export let`, `$:`, `createEventDispatcher`, `on:click`, `<slot/>`). The desktop components being harvested from onebank-ui are a mix, with newer ones using runes. Settle on runes for new code in Phase 0 and port harvested components as they land, rather than converting the existing shell wholesale.

**Harvested components carry mobile assumptions.** The 6,300 desktop lines still import from `$/libs/*` — `showPage`/`goBack` (`libs/utils/page.ts`), the PubSub popup layer (`libs/utils/popup.ts`), `Page.svelte`/`Step.svelte`, and `native.ts`'s `sendMessage`/`showPopup`. Each import is a small, mechanical substitution, but there are ~51 `native.ts` import sites across the 9 pages alone. Budget for it; do not assume copy-paste.

**CSS is a one-time copy, then a fork.** onebank-ui's `libs/css/app.scss` (188 lines) and its `tailwind.config.js` differ from the shell's. Copy once, reconcile once, then they diverge — which is fine, but visual drift between web and mobile becomes permanent and invisible.

**Duplicated bridge in the shell.** `FrameContainer.svelte` and `UnauthenticatedFrameContainer.svelte` are ~80% identical message switches. Any b1hybrid protocol change must be made twice. Deduplicate in Phase 1.

**Hardcoded config.** `config.ts:10-13` and `connector.ts:8` hardcode `10.0.19.65`; there is no `.env` and no `import.meta.env` usage anywhere. `FormLogin.svelte:28-62` exposes free-text Core IP / Onebank UI / production fields that reassign `$onebankPath` at runtime — a dev backdoor that should not survive to production.

---

## 5. Recommended Technical Approach

### 5.1 Relationship to onebank-ui: one-time copy, then no coupling

**No submodule, no package, no import.** Copy what is useful once, then the repos are independent:

| Copy from onebank-ui | To | Why |
|---|---|---|
| `src/libs/definition.ts` | merge into `src/definition.ts` | Service response types — the backend contract |
| `src/libs/constant.ts` | merge into `src/lib/constant.ts` | Menu keys, page-name constants |
| `src/libs/css/app.scss` + `tailwind.config.js` | `src/app.css`, `tailwind.config.js` | Design tokens, `onebank-*` palette |
| `src/libs/components/*` (the generic ones: `Button`, `TextInput`, `OBDialog`, `AccountList*`, `UserAvatar`, `Toggle`, …) | `src/lib/components/` | Reusable, not mobile-specific |
| `src/pages/<PAGE>/components/desktop/*` (47 files, 6,296 LOC) | `src/routes/<page>/` | **The web UI, already written** |
| `src/pages/<PAGE>/{helper,util,definition}.ts` | per-route modules | Business logic worth reading and porting |

Treat the mobile pages as **executable specification** for the 17 backend commands, then stop looking at them.

### 5.2 Routing

Add **`svelte-spa-router`** (hash-based). Hash routing is the right call here: no server rewrite rules needed, which matters because this app is served from a static host alongside b1hybrid's 190 `.html` files.

Two stacks, deliberately separate:

- **Router** — the 9 native pages. Real URLs (`#/`, `#/transaction`, `#/role`), real history, deep-linkable, with `onebankid` as a route param so a group is bookmarkable.
- **Overlay stack** — b1hybrid iframes only. Keeps today's `PopupMetadata` shape and `frame-<id>` rendering, layered above the router outlet, with a promise-based result API replacing the `callbackid` correlation.

`showPopup(pagename, params)` becomes a dispatcher:

```
showPopup(name) →
  isNativePage(name)   ? router.push(routeFor(name), params)
  : pushIframeOverlay(buildPopupUrl(name, params))   // b1hybrid, unchanged
```

`BCELONE_PAGES` + `specialPages` (`lib/constant.ts:3-61`, `helper.ts:59-64`) already encode the b1hybrid side — reuse them as-is. This same dispatcher is what lets `HOME`'s server-driven menu grid keep working: a native route if we own it, an iframe overlay otherwise.

### 5.3 State management

Stay with **Svelte stores** — already used throughout; a new state library is unjustified churn.

- Keep and extend the existing `onebankGroups`, `currentGroup`, `currentSidebarMenu`, `loginData` (`stores/onebankGroups.ts`, `stores/session.ts`)
- Add a **group/tab store** to replace `MAIN.html`'s tab management, fed by `ONEBANKGROUP/loadgroups`
- Add a thin **data layer** over `Connector` — one typed function per command (16 of them), so pages never hand-roll `sendMessage('ONEBANKGROUP', {command: '…'})`. This is the single highest-leverage piece of the rewrite: it makes the backend contract explicit, testable, and mockable
- Fix `sessionKey` (`stores/session.ts:4`) — it is `writable(null)` and never assigned, yet advertised to iframes as the session key

### 5.4 Replacing `MAIN.html`

Reimplement natively, reading `MAIN.html` as the spec:

| `MAIN.html` responsibility | Replacement |
|---|---|
| `loadFrame()` tab switching (`:888-989`) | Router navigation |
| `createOnebankTab` / `reloadOneBankGroup` (`:991-1075`) | Group tab bar component + group store |
| `loadData("ONEBANK")` on boot (`:1743`) | **A cache read, not a network call** — the bridge answers it from `loginData`, populated by the login response. Replaced by `seedFromLogin()` |
| `loadgroups` (`:1562`) | Fires only on an inbound `reloadonebank`, never at boot. Replaced by `refreshGroups()` |
| `idverified ∈ {N,P,V,F}` gate (`:1740`) | Reproduced in `seedFromLogin()`; an unverified account gets no OneBank |
| `visibilityChanged` relay (`:1469`, `:1528`) | `src/lib/bridge/visibility.ts` — the embedded pages' 30-minute idle logout is driven by it and nothing else sends it |
| BCEL One bottom-tab nav | Sidebar/nav entries opening b1hybrid overlays directly |
| Message relay (`:1618`) | Deleted — no nesting left to relay through |
| Kid-tab `localStorage` flags (`:1582-1593`, `:1745-1746`) | Out of scope (OneBankKid excluded) |

### 5.5 Handling the remaining b1hybrid seam

b1hybrid pages keep using the existing `postMessage` contract — **do not change it**, that would mean touching b1hybrid. Keep `FrameContainer`'s handler for them, but:

- Deduplicate `FrameContainer` / `UnauthenticatedFrameContainer` into one handler
- ✅ Add `e.origin` validation against the known b1hybrid origin (`src/lib/bridge/origin.ts`). Replies already target `e.origin`; the remaining `'*'` sends to child frames are still open
- Wrap `showPopupForResult` in a promise so native pages `await` a b1hybrid result (`ROLE` → `TWOFACTOR` is the one in-scope case) instead of registering callbacks — **deferred to Phase 4**, where the first native caller appears
- Consider a fixed phone-width frame for b1hybrid pages that assume mobile viewports — the `.mobile` class in `app.css:41-44` already does this

### 5.6 Living with duplication

Since divergence is the strategy's main cost, make it visible rather than hoping:

- **The data layer is the contract.** Keep the 16 typed command functions as the only place the wire format is expressed, and keep their types identical to onebank-ui's `libs/definition.ts`. Diff them periodically
- **A shared types package is the one exception worth considering later** — if the backend contract turns out to churn, a tiny published `@onebank/types` consumed by both repos costs little and catches the highest-consequence drift. Not needed for Phase 0
- **Document the fork point** in both repos: the onebank-ui commit the desktop components were harvested from, so future divergence can be diffed rather than guessed at
- **Delete the dead desktop code from onebank-ui** once web is live (47 files, `DESKTOP/`, `isDesktop` branches). Leaving it invites people to "fix it there" and wonder why nothing changes

---

## 6. Roadmap (phased plan)

### Phase 0 — Project hygiene (no user-visible change) — **DONE** (`b152668`)
- Add `tsconfig.json`; fix `include` to cover `**/*.ts`; add `check`, `lint`, `format` scripts
- Add vitest; establish the testing pattern for the data layer
- Extract config to `.env` / `import.meta.env` (`config.ts:10-13`, `connector.ts:8`, `socket.ts:13`); remove the runtime host-override fields from `FormLogin.svelte:28-62` behind a dev-only flag
- Decide and document: **runes for all new code**
- Copy design tokens: onebank-ui `app.scss` + `tailwind.config.js` → reconcile with the shell's
- **Exit criteria:** typecheck and tests run in CI; no behaviour change

### Phase 1 — Foundation — **DONE**
- ✅ `svelte-spa-router` added; navigation split into router + b1hybrid overlay stack (§5.2)
- ✅ **Data layer** (`src/lib/api/`): 16 typed commands over an injectable transport
- ✅ Wire types merged into `src/lib/api/types.ts` (onebank-ui's `Account` is the *card* shape and
  collides with ours — merged selectively, not wholesale as §5.1 assumed)
- ✅ Bridge deduplicated into `src/lib/bridge/`, origin-checked
- ✅ `sessionKey` assigned — `Connector` publishes it on handshake
- ⚠️ **`showPopupForResult` is not promise-wrapped yet.** Deferred to Phase 4, when `ROLE` →
  `TWOFACTOR` is the first native caller that needs it. The callback path still works for iframes.
- **Exit criteria met:** every page has a URL and content is still iframed, on a router, with a
  typed data layer and one deduplicated bridge

### Phase 2 — Shell replaces `MAIN.html` — **DONE**
- ✅ `src/stores/groups.ts` — seeded from the login payload, refreshed via `loadgroups`, with the
  `idverified` gate. Replaces `adoptLoadHomeResult`'s stopgap (§1.9)
- ✅ **Group switching lives in the sidebar** (`GroupSwitcher.svelte`), not a horizontal tab strip —
  the sidebar card already carried the group's identity, and a second surface would duplicate it.
  It absorbed the floating Create/Join pill that used to sit over the content area
- ✅ Native `HOME` route (`src/routes/home/*`) — banner, group actions, quick-access grid, the full
  menu catalogue, a customise panel that finally gives `savehomemenus` a caller, the transaction
  calendar, and the three widgets
- ✅ **Reworked into a draggable dashboard** after the fact (commit `83ed547`), matching what
  onebank-ui's desktop `HOME` had moved to in the meantime (its commit `adcdd80`). Six widgets on a
  `svelte-grid` — the two charts, balances, shortcuts, functions, the transaction calendar — that
  the user drags, resizes and keeps in `localStorage`; `src/routes/home/gridLayout.ts` holds the
  positions and the storage round trip, apart from the component so they are testable without a
  layout engine. The fixed widget row (`Widgets.svelte`) and the panel-swapping column
  (`QuickAccessMenu`, `AllMenus`) are gone; `CustomizeMenus` survives as a modal. Three deliberate
  departures from onebank-ui: the group banner stays above the grid (it carries the owner's only
  `GroupActionMenu`), a saved layout is validated by its widget id set rather than only its length,
  and `Functions` applies the `usablemenus` check the rest of the page applies
- ✅ 17th command `loadwidget` (§1.6 correction)
- ✅ `updateTab` retired — for the real reason, see the §1.9 correction
- ✅ Menu grid dispatches native route vs b1hybrid overlay via the existing `showPopup` seam;
  `src/routes/home/openMenu.test.ts` sweeps every registry key to prove no b1hybrid page gets routed
- ✅ `MAIN.html` removed, along with the `mainframe` store, `ONEBANK_MAINFRAME_ID`, and the 48px
  band every layout carried as clearance for its tab bar. `FrameContainer` 216 → 75 lines
- ✅ `visibilityChanged` relay added (`src/lib/bridge/visibility.ts`) — MAIN.html was the only
  sender and the embedded pages' 30-minute idle logout depends on it
- ✅ The `native` flag on `RouteDefinition` now drives `src/routes/index.ts` instead of being
  documentation; a route flagged native with no component throws rather than rendering blank
- **Two things to know before Phase 3:**
  - `DesktopTransactionCalendar` in onebank-ui is **100% fabricated data**
    (`generateRandomTransactions`). Only its layout was harvested; the data comes from
    `viewtransactions` and an empty day renders empty. Do not port the generator.
  - `@carbon/charts` is now a dependency. It cost **+410 kB raw / +124 kB gzip of JS and +227 kB of
    CSS**. If the bundle becomes a problem, the widgets are the thing to code-split.
  - `svelte-grid@5.1.2` is now a dependency, and it is Svelte-3 era: it compiles and runs under
    Svelte 5 only in legacy mode, and it hands its per-item drag and resize handles over as slot
    props. That is why `src/routes/home/HomeGrid.svelte` is the one new component written in
    Svelte 4 idiom. It also needs `ResizeObserver` — absent in jsdom, so `src/setupTests.ts`
    stubs one for every test that mounts a route, and `HomeGrid.test.ts` swaps in one that
    reports a width, without which the grid renders no cells at all.
- **Exit criteria met**, pending the runtime pass below.

### Phase 3 — Simple pages
`GROUP` (99 desktop LOC) → `TRANSACTION` (313) → `ACCOUNT` (382) → `GROUPMANAGEMENT` (292) → `REGISTERONEBANK` (267)

Establishes the repeatable harvest recipe on low-risk surfaces. `GROUP` first — smallest, no external dependencies.

**`GROUP` — done.** `src/routes/Group.svelte`, plus the 18th command (`USER/getuploadurlr2`) and
`src/lib/utils/upload.ts` for the logo, which is the one thing the page needs that the OneBank
services do not provide: compress, ask for a signed URL, PUT it at object storage, then build the
public URL from `env.uploadPublicPath` (`VITE_UPLOAD_PUBLIC_PATH`) — onebank-ui hardcodes that
base. `browser-image-compression` came along as a dependency, matching mobile's limits. Three
notes for the pages that follow: the form seeds from `loadHomeResult` and only fetches on a deep
link, saving closes through `closePopup(result)` whose no-overlay path already patches the cached
group and returns home, and onebank-ui's ten-colour palette in `GROUP/StepHome` is dead code
neither arm renders — `color` is round-tripped instead of ported.

**`ACCOUNT` — done.** `src/routes/Account.svelte` plus `src/routes/account/` (card, confirm dialog,
add-from-personal, open-new). Four more commands: `changeaccountstatus`, `changeaccountalias`,
`getavailableaccounts` on `ONEBANKGROUP`, and `opennewaccount` on the `ONEBANK` service — the fifth
service, and the only command on it. Cards come from the login payload (`USER.cards`), which is what
onebank-ui's `loadData('USER')` reads too, so no request. Three departures: every mutation in
onebank-ui ends in `closePopupWithResult({})`, which throws the user back to home for locking an
account — here the list reloads in place behind a banner; its `ADDACCOUNTCOMPLETE` step is a whole
screen that only says "done"; and its alias block is duplicated in two near-identical branches,
collapsed to one here. Its account-detail step is mobile-only, and the desktop card already carries
those actions.
- **Exit criteria:** each route deep-links, back works, and the corresponding `ONEBANKGROUP` commands are covered by tests

### Phase 4 — Complex pages
`MEMBER` (1,357 desktop LOC) → `AUTHORIZATION` (441) → `ROLE` (2,376)

The heavy ones. `ROLE` last: it is the largest and the only in-scope page needing `TWOFACTOR`, so it validates the promise-wrapped b1hybrid overlay end-to-end. Also fold in the shell's existing `src/components/addmemberdialog/*` — it duplicates `MEMBER` functionality and should be reconciled, not kept alongside.
- **Exit criteria:** role creation completes through a `TWOFACTOR` iframe overlay; approval flows verified against mobile behaviour

### Phase 5 — Cleanup, both repos
- Retire dead shell code: the old popup helpers, `lib/utils/native.ts` (dead in a desktop browser — only the `Calendar` widget referenced it)
- Tighten remaining `postMessage` origins
- **In onebank-ui:** delete the 47 desktop component files, `pages/DESKTOP/` (1,260 LOC), and `isDesktop` branching across 14 files. Record the fork point (§5.6)
- **Exit criteria:** no onebank-ui iframes remain in the web app; onebank-ui builds clean as a mobile-only codebase

---

## 7. Notes on b1hybrid — confirmed out of scope

**Nothing in this plan modifies `b1hybrid/`.**

- It is a **separate git repository**, gitignored here. `onebank-webapp/b1hybrid` is a **symlink to
  `/var/www/html/b1hybrid`** — the copy Apache serves at `VITE_PAYLOAD_PATH`, so what you read is
  what runs. Every `MAIN.html:NNN` reference in this plan is against that file (1816 lines,
  `github.com/bcel-prd/b1hybrid.git`, HEAD `a89d1c285`, with local uncommitted edits).
- **There was a trap here.** The repo previously nested its own checkout from a *different remote*
  (`gitlab.com/…`, HEAD `4bafa47ea`, MAIN.html 1701 lines, 261 differing lines). It was never what
  ran. Phase 2 reads `MAIN.html` as its specification, so reading the wrong one would have produced
  a faithful port of code nobody executes. That checkout has been deleted; it is recoverable from
  its gitlab remote if anyone ever wants it.
- The entire coupling surface from this app is **one variable**: `VITE_PAYLOAD_PATH`, surfaced via `src/lib/env.ts` — the only reference to b1hybrid anywhere in `src/`. (Was `stores/config.ts:11` before Phase 0 moved config to `.env`.)
- Its pages stay iframe-loaded via the existing unchanged path: `buildPopupUrl()` → `payloadPath + PAGE.html?versioncode=320&isinbrowser=1&…` → `<iframe>`. `BCELONE_PAGES` (61) and `specialPages` (10) keep routing there verbatim.
- Its `postMessage` protocol is **preserved exactly**. b1hybrid keeps sending the same messages and getting the same replies; only the listener's location and origin-checking change.
- **Origin checking has a dev-only relaxation.** A dev server on `0.0.0.0` answers to `localhost`,
  `127.0.0.1` and the LAN IP alike, and a frame reports whichever its URL used — so a strict
  allowlist rejects our own iframes. Loopback aliases of an allowed protocol+port are accepted, and
  that branch is compiled out of production. `VITE_EXTRA_FRAME_ORIGINS` covers split-host deploys.
- **Dropping `MAIN.html` is not a b1hybrid change.** `MAIN.html` is a b1hybrid *file* that this app currently chooses to load. After Phase 2 we stop loading it and load b1hybrid's leaf pages directly instead. The file is never edited, and it remains available to the native mobile app, which uses it independently.
- b1hybrid remains a **permanent runtime dependency**: `TWOFACTOR` for `ROLE`, and the broad BCEL One page universe that `HOME`'s server-driven menu launches into.
- **Known limitation, accepted:** b1hybrid pages were built for phone viewports. Some will look wrong at desktop width, and we cannot fix them here. Mitigation is presentational only — a fixed phone-width frame, as `app.css:41-44` already provides.

**Net effect on b1hybrid: zero code changes, zero behaviour changes.**

---

## Effort shape

| Phase | Nature | Relative size |
|---|---|---|
| 0 — Hygiene | Config, tooling, tests | Small |
| 1 — Foundation | Router, data layer, bridge cleanup | Medium |
| 2 — Replace `MAIN.html` + `HOME` | Reimplement tab host, harvest HOME | **Large, highest risk** |
| 3 — 5 simple pages | ~1,350 desktop LOC to harvest | Medium |
| 4 — 3 complex pages | ~4,200 desktop LOC to harvest | **Large** |
| 5 — Cleanup both repos | Deletion | Small |

Total desktop UI to harvest: **6,296 LOC across 47 files**, against a 14,668-LOC mobile reference. The work is dominated by Phases 2 and 4.

---

## Pre-existing defects worth fixing en route

These sit directly in the code being touched and are cheapest to fix while it is open:

| Defect | Location | Status |
|---|---|---|
| `sessionKey` store never assigned, yet advertised to iframes as the session key | `stores/session.ts:4` vs `FrameContainer.svelte:123` | Fixed (P1) |
| No `e.origin`/`e.source` validation on a handler proxying authenticated backend calls and arbitrary `localStorage` read/write | `FrameContainer.svelte:28-31`, `UnauthenticatedFrameContainer.svelte:19-22` | Fixed (P1) |
| `showPopupExternal` iframes an arbitrary iframe-supplied URL, no allowlist | `FrameContainer.svelte:87`, `helper.ts:179-194` | Open |
| `closePopup` dereferences `closingPopup.src` with no empty-stack guard (line 275 guards, 203 doesn't) | `helper.ts:201-203` | Fixed (P1) |
| `Date.now()` as `{#each}` key — collides on rapid popups; `number` in `loadUrl` vs `string` elsewhere, against `PopupMetadata.id: string` | `helper.ts:121,184`; `definition.ts:34` | Open — overlays only |
| `https://` popup URLs get concatenated onto the origin — only `http://` is special-cased | `helper.ts:71` | Open |
| Routing by substring match: `"GROUP"` also matches `GROUPMANAGEMENT` | `helper.ts:203,259-265` | Fixed (P1) |
| Menu branching on `menu.label === 'Home'` (English display copy) rather than `menu.id` | `Sidebar.svelte:19` | Fixed (P1) |
| SHA-1 + static pepper password hash persisted in `localStorage.password` and replayed as a credential | `helper.ts:288-292`, `FormLogin.svelte:85` | Open |
| RSA private key components in plaintext `localStorage`; session key/password and all payloads `console.log`ged | `connector.ts:41-49,126-127,144,192` | Partly (P1) — logging removed, storage unchanged | Partly (P1) — logging removed, storage unchanged |
| `Content-Type: multipart/form-data` set while posting a plain object (axios sends JSON) | `connector.ts:107,154` | Open |
| `X-Frame-Options: 'ALLOWALL'` is not a valid token; only the `frame-ancestors *` CSP takes effect | `vite.config.js:7-11` | Open |

Config is no longer hardcoded: everything comes from `src/lib/env.ts` via `VITE_*` variables, so
the old habit of editing `stores/config.ts` per environment is gone. The dead `host` and `coreip`
stores were deleted rather than migrated — nothing read them.

---

## Verification

Per phase, before merging:

1. **Typecheck + tests:** `npm run check && npm run test` (both added in Phase 0).
2. **Build:** `npm run build`.
3. **Data layer:** each of the 16 commands covered by a test against a recorded response, so backend-contract regressions surface without a live core.
4. **Runtime.** The shell runs on **7100**, onebank-ui on **7000** (it pins `strictPort`). Both must
   be running: serve onebank-ui with `npm run dev`, not its `dist/` — only 19 of 47 pages are built
   there, and `ROLE`, `MEMBER`, `GROUP` and `REGISTERONEBANK` are missing. Verify:
   - QR login and form login both reach the authenticated app
   - Group tabs load, switch, and create/join/leave works (Phase 2 onward, without `MAIN.html`)
   - Every migrated sidebar route deep-links, survives refresh, and back/forward behaves
   - `HOME`'s server-driven menu grid launches both native routes and b1hybrid overlays
   - `ROLE` completes role creation through a `TWOFACTOR` b1hybrid overlay and receives its result
   - b1hybrid overlays close cleanly and return results to the calling native route
5. **Console clean** of cross-origin and `postMessage` errors.
6. **Parity check against mobile** for `AUTHORIZATION` and `ROLE`: same input → same approval/permission outcome. This is the check that duplication makes necessary, and it should be run every release, not once.
7. **Mount a real component, not just pure functions.** Every bug that reached a user in Phase 1 was
   a composition failure the unit tests could not see (§1.9). `FrameContainer.overlay.test.ts` and
   `Sidebar.highlight.test.ts` are the pattern: mount the actual component with `Connector` stubbed
   and drive the hash. Confirm a new test fails against the unfixed code before trusting it — the
   first attempt at the click-blocking regression test passed against the bug.
