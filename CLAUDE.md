# onebank-webapp

The **web** OneBank app. Svelte 5 (runes) + Vite 8 + Tailwind 4, single page app.
Package manager is **pnpm** — `packageManager` in `package.json` pins it, and
`package-lock.json` is gitignored so a second lockfile cannot come back.

Sibling products this repo deliberately does *not* share code with:

- **`onebank-ui`** (`../onebank-ui`, separate repo) — the **mobile** app, shipped inside the
  native Android/iOS wrappers. Frozen with respect to the web migration. We harvest from it
  by one-time copy, never by import. See `native-web-migration-plan.md`.
- **`b1hybrid/`** — legacy BCEL One. A **symlink to `/var/www/html/b1hybrid`**, the copy Apache
  serves, so what you read is what runs. Gitignored. **Never edited from here.** Its pages stay
  iframe-loaded; the whole coupling surface is `VITE_PAYLOAD_PATH` plus the page allowlists in
  `src/lib/constant.ts`. As of Phase 2 its `MAIN.html` is **no longer loaded** — leaf pages are
  iframed directly from the overlay stack, one level deep instead of three.

## Commands

| | |
|---|---|
| `pnpm dev` | Dev server on **7001** |
| `pnpm build` | Production build |
| `pnpm run check` | `svelte-check` typecheck |
| `pnpm test` | Vitest (`pnpm test:watch` to watch) |
| `pnpm format` | Prettier |

**Running it needs two servers.** onebank-ui must be serving the pages this app still iframes:

```bash
cd ../onebank-ui && npm run dev   # 7000, pinned by strictPort — do not serve its dist/,
                                  # only 19 of 47 pages are built there
pnpm dev                          # 7001
```

If the two land on the same origin, Vite answers `HOME.html` with this app's own `index.html` and
the shell renders inside its own content frame as a login screen. `assertDistinctOrigins()` in
`src/lib/env.ts` logs an error when that happens.

## Conventions

**Svelte 5 runes everywhere.** `$state`, `$derived`, `$props`, `$effect`, `onclick`,
callback props, `{#snippet}` / `{@render}`. The Svelte 4 idiom (`export let`, `$:`,
`createEventDispatcher`, `on:click`, `<slot/>`) is gone from every component the app
owns — do not reintroduce it, and bring harvested onebank-ui components over as runes.

**The one exception is `src/lib/modules/Calendar/**`,** which is vendored (see "Typecheck
baseline") and stays in legacy mode: 546 lines of imperative DOM work with eight `bind:this`
refs and no tests. It interoperates fine — Svelte's compatibility boundary is per component,
so a runes parent can render a legacy child, and `Calendar` talks to `WeekDays` through
`on:click` internally.

**Prefer the modern API to a hand-rolled one.** Several already earn their keep here:
`svelte/reactivity/window`'s `innerWidth.current` instead of a `resize` listener
(`Layout.svelte`), `{@attach}` for DOM behaviour (`src/lib/attachments/clickOutside.ts`, and
the `ResizeObserver` in `HomeGrid.svelte`), `<svelte:window>` for global events, and
`<svelte:boundary>` to keep one failing dashboard widget from taking the page down.

**Two things about `{@attach}` that cost real time here — read before writing one.**

*It is reactive, unlike `use:`.* The expression re-runs whenever state it reads changes, tearing
the attachment down and rebuilding it. That is right for lifecycle-bound behaviour and wrong for
a transient gesture: `{@attach startMove(item)}` on a drag handle was destroyed on every
pointermove, because moving is what rewrites `items`, so a drag stopped tracking after the first
move. Gestures start from a plain `onpointerdown` attribute instead — an event attribute is not
an effect, so a re-render swaps the listener without disturbing a gesture already running in a
closure (`src/lib/utils/pointerDrag.ts`). A single-move test cannot see this; `HomeGrid.drag.test.ts`
now drives two.

*Svelte flushes effects synchronously inside a trusted event handler.* An element mounted by a
click handler is in the DOM — and its attachment registered — while that same click is still
bubbling. A click-outside attachment listening for `click` therefore receives the click that
opened the popup and closes it again immediately. `clickOutside` listens for `pointerdown`, which
has already fired by then.

**Assigning state inside an `$effect` needs a reason.** Where an effect is a one-shot boot
task rather than a reaction — restoring a session, wiring the bridge — wrap the body in
`untrack()` so nothing it touches can become a dependency and re-run it.

**Config comes from `src/lib/env.ts`.** Never hardcode a host, port, or endpoint. Add a
`VITE_*` variable, type it in `src/vite-env.d.ts`, expose it through `env`, and document it in
`.env.example`. `.env` holds shared dev defaults and is committed; `.env.local` is yours and is not.

**Types are imported with `import type`.** `verbatimModuleSyntax` is on, so a value-style import
of an interface breaks the build.

**The design system came from the `dev` branch.** Brand red is `#b11111`
(`--color-onebank-red`), with `onebank-light-red` / `onebank-dark-red` either
side of it and `.ob-gradient` running between all three — that gradient is the
active sidebar entry, the rail's collapse toggle and the bottom nav's selected
tab. Radii are `rounded-ob-sm|md|lg` (10/12/16px). The type is Noto Sans Lao
Looped, self-hosted from `public/` as one variable file and set as
`--font-sans`, so unstyled text picks it up. `dev` is otherwise an older line
that branched before the native migration: it has no router, dashboard or menu
registry, and its `FrameContainer` restyles the `MAIN.html` frame this app no
longer loads — do not port that one.

**`OBButton` and `BottomNav` are ported but unwired**, as they were on `dev`.
`BottomNav` is a mobile tab bar for the unauthenticated screens; `OBButton`
wraps the two `onebank-*-btn` classes with a loading state.

**Styling is Tailwind 4, configured in CSS.** There is no `tailwind.config.js`; the theme —
colours, the four custom breakpoints, shadows — lives in the `@theme` block in `src/app.css`,
and the plugin is wired through `@tailwindcss/vite`. The breakpoints deliberately *replace*
Tailwind's defaults (`--breakpoint-*: initial` clears them first), so `sm:`/`md:`/`lg:` do not
exist — only `mobile` / `tablet` / `laptop` / `desktop`. Avoid `@apply` in a component
`<style>` block: each is compiled separately and would need an `@reference` to the theme,
which svelte-check's CSS pass then reports as an unknown at-rule. Put utilities in the `class`
attribute and keep the `<style>` block for what utilities cannot express.

**There are two `t()` translation helpers, and they are not duplicates.** The one in
`src/lib/utils/helper.ts` reads the `lang` **URL parameter**, captured once at module load, so
it never changes. `Login.svelte`, `FormLogin.svelte` and `QRCodeLogin.svelte` each define a
local one that reads the `language` **store**, so the login screen re-renders when the language
selector is used. Unifying them is a real decision about where the app's language lives, not a
tidy-up — do not merge them by accident.

**Path alias `$/*` → `src/*`,** matching onebank-ui so harvested files need fewer import rewrites.

**Commit messages carry no co-author or tool attribution trailers.** No
`Co-Authored-By`, no "generated with" lines. Subject in the imperative, lowercase; add a
body only when the *why* isn't obvious from the diff.

**Every call to the core carries a timeout.** `Connector.post()` is the single
place that talks to `service3.php`, so a new call site cannot forget one — axios
defaults to *no* timeout, and a host that accepts the connection then never
answers would leave the request, and whatever UI awaits it, pending forever.
Tune with `VITE_REQUEST_TIMEOUT_MS` (default 20000). Transport failures are
rethrown with a message fit to show a user rather than axios's own
`timeout of 20000ms exceeded`.

**Never write `new Promise(async (resolve) => ...)`.** An async executor that
throws returns a rejected promise which `new Promise` discards, so `reject` is
never called and the promise *never settles*. `getSession` was written this way:
a failed handshake logged an unhandled rejection to the console while the login
form waited forever. If a cached in-flight promise is involved, clear it in
`finally` — clearing on success only means one failure wedges every later
attempt until a page reload. `src/lib/utils/connector.session.test.ts` pins both.

**Backend calls go through `src/lib/api`,** not `Connector.sendMessage` directly. Twenty-two typed
functions across five services — three OneBank services, `USER/getuploadurlr2` for the group-logo
upload (`src/lib/utils/upload.ts` does the PUT that follows) and `ONEBANK/opennewaccount` — that is
the whole contract. It is the single place the wire
format is expressed and the thing that keeps web and mobile behaviourally aligned.

**Navigation goes through `src/lib/utils/navigation.ts`.** `showPopup(page)` dispatches: a page in
`src/lib/routes.ts` becomes a URL, anything else opens as a b1hybrid iframe overlay. Migrating a
page means adding its component to `nativeComponents` in `src/routes/index.ts` and flipping its
`native` flag in `src/lib/routes.ts` — the path, the sidebar wiring and the deep link do not move.
A route must never claim a b1hybrid page; `src/lib/routes.test.ts` and
`src/routes/home/openMenu.test.ts` both enforce that.

**Group state lives in `src/stores/groups.ts`.** Seeded from the login payload on mount, refreshed
through `ONEBANKGROUP/loadgroups`. Anything acting on "the current group" reads `currentGroup`;
`src/lib/api/commands.ts` defaults every `onebankid` to it.

**Read the active route from `routeLocation` (`src/stores/route.ts`), never from
svelte-spa-router's `router.location`.** The store is the app's own view of the hash and does
not depend on the library's internals. `src/components/Sidebar.highlight.test.ts` pins this.

> The original reason was that legacy `$:` could not track imported runes state. Every
> component is runes now, so that specific hazard is gone — but the indirection stays, because
> it is also what lets the sidebar, navigation and tests agree on one source of truth.
> Converting the store to `createSubscriber` from `svelte/reactivity` is a reasonable follow-up.

**Waiting for a hash change in a test takes two macrotasks, not one.** jsdom assigns
`window.location.hash` synchronously but dispatches `hashchange` in a later task, so there is a
window where the hash already reads `#/role` while `routeLocation` and `router.location` still
report the old path. `settle()` in `src/lib/utils/navigation.test.ts` documents this; a test that
waits only one macrotask passes on hash assertions and fails on anything listener-derived.

**The iframe bridge lives in `src/lib/bridge`.** One handler for both containers, origin-checked
against b1hybrid and onebank-ui. Its message protocol is fixed by those two repos — do not change
the shapes.

## Gates

| Gate | State |
|---|---|
| `pnpm test` | **290 passing** — a passing gate |
| `pnpm run check` | **0 errors**, 17 warnings — errors are a passing gate |
| `pnpm build` | passing gate |
| `pnpm audit` | **0 vulnerabilities** |
| `pnpm format:check` | **failing on 107 files, pre-existing.** The repo has never been fully
  Prettier-formatted. Not a gate until someone runs `pnpm format` in a commit of its own |

The typecheck went 172 → 64 → 58 → **0** errors. Errors are now a **gate, not a ratchet**: do not
add one. The 17 remaining warnings are all a11y findings inside the vendored
`src/lib/modules/Calendar/Calendar.svelte`.

Vendored code is out of scope and carries `@ts-nocheck`: `src/lib/modules/Calendar/**` (including
a 33k-line generated Lao calendar table) and `src/lib/utils/rsakey.ts`. `rsakey.ts` is the one
place a `@ts-nocheck` file still carries type annotations — its eight public key components are
declared `BigInteger | null`, because the suppression stops errors being *reported* there while
the inferred types still leak out to `connector.ts`.

**`jsbn` has no types and no `@types/jsbn`.** `src/jsbn.d.ts` declares the small surface
`rsakey.ts` actually uses.

## Testing

**`localStorage` in tests needs a Node flag.** Node 22+ defines its own
`globalThis.localStorage`, and Vitest's jsdom environment skips any global that already exists —
so jsdom's `Storage` is never installed and every test file dies in `beforeEach` with
`localStorage.clear is not a function`. `vitest.config.ts` runs the workers with
`--no-experimental-webstorage` to keep the field clear. Vitest 4 did **not** fix this; the flag is
permanent, not a stopgap. Note also that Vitest 4 moved `poolOptions.<pool>.execArgv` to a
top-level `test.execArgv`, and ignores the old key silently.

## Environment

Everything runs on this box; `10.0.19.65` is its LAN address.

| Piece | Where | Served by |
|---|---|---|
| BCEL One core | `VITE_SERVICE_URL` → `/var/www/html/service3.php` | Apache 2.4 on :80 |
| b1hybrid pages | `VITE_PAYLOAD_PATH` → `/var/www/html/b1hybrid/` | Apache 2.4 on :80 |
| onebank-ui pages | `VITE_ONEBANK_PATH` → `../onebank-ui` | its own Vite dev server, :7000 |
| this app | — | Vite dev server, :7001 |

**b1hybrid exists in three places on this machine and only one of them runs.** Apache serves
`/var/www/html/b1hybrid` (github remote, MAIN.html 1816 lines, carries local uncommitted edits).
`onebank-webapp/b1hybrid` is a symlink to it, so reading through the repo is safe. A stale checkout
from a *different* remote sits at `/home/katai/IdeaProjects/b1hybrid-gitlab-checkout` (gitlab,
MAIN.html 1701 lines) and another unversioned copy at `/home/katai/IdeaProjects/b1hybrid` — neither
is what executes. This matters because Phase 2 reads `MAIN.html` as its specification.

A fresh clone on another machine gets none of this: b1hybrid is gitignored, onebank-ui is a separate
repo, and the Apache paths are local. Set the `VITE_*` variables to wherever those live there.

## Where the migration is

Phases 0, 1 and 2 are done. **Phase 3 is under way:** `GROUP` (`src/routes/Group.svelte`) and
`ACCOUNT` (`src/routes/Account.svelte` + `src/routes/account/`) are native; `TRANSACTION`,
`GROUPMANAGEMENT` and `REGISTERONEBANK` are still iframed.
`native-web-migration-plan.md` is the source of truth — read its Status block and §1.9 ("Traps
found while implementing") before starting. Note that §1.9's `updateTab` entry is **struck through
and corrected**: it was written against a stale b1hybrid checkout and was wrong.

**The home page is a hand-written dashboard grid.** Six widgets — the two charts, balances,
shortcuts, functions, the transaction calendar — that the user drags, resizes and keeps.
`src/routes/home/gridLayout.ts` owns the positions, the `localStorage` round trip and the
collision maths (`moveItem`, `resizeItem`, `compact`), apart from the component so it is
testable without a layout engine; `HomeGrid.svelte` owns the markup and turns pointer offsets
into cell coordinates through the `pointerDrag` attachment. It matches onebank-ui's
`DesktopHome.svelte`, minus its mock data and plus the group banner, which stays above the grid
because it carries the owner's `GroupActionMenu`.

> This replaced `svelte-grid`, which was last published in August 2023 and delivered its drag
> and resize handles as `let:` slot props — the one thing that kept a component in Svelte 4
> legacy mode. The saved layout shape is unchanged, so an arrangement stored by the old
> implementation still loads.

## Known sharp edges

- `helper.ts` — only `http://` is special-cased when building popup URLs.
- **The vendored Lao calendar data ends at `2026-01-07`.** `calendar.ts` is a
  generated table with no entry past that date, so `buildMonth` reads
  `undefined` and `Calendar.svelte` throws
  `Cannot read properties of undefined (reading 'sin')` on every load from
  January 2026 onward. The fix is regenerating the table, not patching the
  component.
- **A launched page is configured entirely by its querystring, so
`buildUrlParam` must JSON-encode objects.** Every page opened from the menu grid
is handed an `accounts` array; `encodeURIComponent(value)` alone coerces it with
`String()` to the literal `[object Object]`, and the page then fails to parse its
own parameters and renders an empty iframe with nothing in the console. That is
what made every menu tile open a blank overlay.

**A page name must resolve to an origin that serves it.** `buildPopupUrl`
defaults to onebank-ui and only uses b1hybrid for `BCELONE_PAGES`, so a page in
neither place loads a 404 into the overlay — blank again, silently. This bites
hardest through `PAGE_RENAMES` in `src/routes/home/openMenu.ts`: `LANDTAX` opens
`LANDTAXNEW`, which is not an onebank-ui page and had to be added to the
allowlist. `PHONE` renames to `NEWPHONE`, which is absent from **both** repos'
allowlists and from onebank-ui's pages — unverified here, and worth checking
against b1hybrid.

**`src/lib/menus.ts` must stay a superset of what the core can send.**
`Functions.svelte` renders `allmenus.filter((key) => menus[key])`, so a key the
core sends but the registry lacks is *silently dropped* — no error, no blank
tile, just a shorter grid. The first harvest from onebank-ui missed eighteen
entries, eleven of them the `IBANK*` family, and the only symptom was that the
mobile app showed more menus than this one. The grid also appends
`ALWAYS_OFFERED` (the iBanking pages and the OneBank utilities) exactly as
onebank-ui does, because the core never enumerates those; unlike onebank-ui, an
appended menu outside `usablemenus` is greyed out rather than offered as if it
worked. `src/lib/menus.registry.test.ts` pins both halves.

**Never key a test on a style class.** `Sidebar.highlight.test.ts` used to
  find the active entry by filtering for `bg-onebank-red`, so applying the brand
  gradient broke all eight of its cases without changing a behaviour. The active
  entry carries `aria-current="page"`, which is both the correct a11y attribute
  and immune to a retheme.
- **Nothing may render as a blank white page.** Two routes to one existed:
  `App.svelte` checks `$unauthenticatedPopups` *before* `$loggedIn`, so a
  pre-login helper popup (Customer Support) left open replaced the whole shell
  with a fixed, white `#framecontainer`; and the boot spinner was
  `PrimaryLoadingSpinner`, which is `border-white` and meant for the red button,
  invisible against the `#f9fafb` page. `completeLogin` now retires those
  popups, boot uses the grey spinner, and a `<svelte:boundary>` at the root
  turns a render error into a message instead of nothing.
  `src/App.blank.test.ts` pins all of it.
- **A saved password is only written after the core accepts it.** It used to be
  stored on every attempt, so one wrong password was persisted, auto-filled on
  the next load with `isPasswordSaved` set, and replayed on every attempt after
  that — the form reported bad credentials for good ones until the user happened
  to focus the password field, which is the one thing that clears it. A stored
  hash the core refuses is now dropped rather than replayed.
  `src/components/FormLogin.password.test.ts` pins this. If a user is stuck in
  the old state, `localStorage.removeItem('password')` clears it.
- **The login form's "Core IP" field does nothing.** `coreip` is bound and
  written to `localStorage`, but nothing reads it back: the endpoint is
  `env.serviceUrl`, fixed at build time. Either wire it through or drop the
  field — right now it invites someone to think they have repointed the app.
- Password hashing is SHA-1 with a static pepper, persisted to `localStorage` and replayed as a
  credential (`helper.ts`, `FormLogin.svelte`).
- RSA private key components sit in plaintext `localStorage` (`connector.ts`).
- A login now survives a reload: `src/lib/session.ts` keeps the negotiated session key and its
  password in **sessionStorage** and `App.svelte` adopts them on boot, validating with a real
  `loadgroups` before opening the app. That is a live credential at rest, readable by any script
  on the page — scoped to one tab, cleared on logout, and bounded by the core's own session
  timeout. Logout goes through `logout()`, which forgets before it reloads; a bare
  `window.location.reload()` would restore the session it meant to end.

Fixed in Phase 1: the unassigned `sessionKey`, the duplicated bridge, missing origin validation,
`closePopup` crashing on an empty stack, and session key/password logging to the console.

Fixed in the hardening pass: overlay ids were `Date.now()` and collided when two opened in the
same millisecond, so two frames shared an `{#each}` key — `nextPopupId()` in `helper.ts` is a
counter now. `QRCodeLogin` logged the full `getdesktoplogintoken` response, login token included,
to the console on every refresh.
