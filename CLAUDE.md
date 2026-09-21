# onebank-webapp

The **web** OneBank app. Svelte 5 (runes) + Vite 8 + Tailwind 4, single page app.
Package manager is **pnpm** — `packageManager` in `package.json` pins it, and
`package-lock.json` is gitignored so a second lockfile cannot come back.

**This build is a standalone front end on mock data.** It does not talk to the
BCEL One core and loads no iframes. Every screen in the Figma design is a
native route, and every command is answered by an in-browser mock backend.
Read `PRODUCT.md` (what it does, demo behaviour) and `DESIGN.md` (tokens, shell,
patterns, Figma frame map) before changing a screen; `.impeccable.md` holds the
design principles.

Sibling products this repo deliberately does *not* share code with:

- **`onebank-ui`** (`../onebank-ui`, separate repo) — the **mobile** app. We harvest from it by
  one-time copy, never by import.
- **b1hybrid** — legacy BCEL One. Used to be iframed; nothing here references it any more.

`native-web-migration-plan.md` records how the iframe port was done and is **superseded**
by this build — history, not instructions.

## Commands

| | |
|---|---|
| `pnpm dev` | Dev server on **7001** — the only server needed |
| `pnpm build` | Production build |
| `pnpm run check` | `svelte-check` typecheck |
| `pnpm test` | Vitest (`pnpm test:watch` to watch) |
| `pnpm format` | Prettier |

## The mock backend

**Components call `src/lib/api/commands.ts` and nothing else.** Each function there is one typed
command; `client.ts` sends it through a single `Transport`, which is `mockTransport` from
`src/lib/api/mock` unless a test calls `setTransport`. Connecting a real backend is one more
`Transport` — no component changes.

- `mock/db.ts` — the seeded database: users, four groups (the user is in three; `G4` is the one
  the join flow joins), accounts, roles, transactions, messages, cheques, cheque books, drafts,
  recipients, billers. **Dates are generated relative to now** and the generator is seeded, so the
  demo always looks current and a reload does not reshuffle it. State persists in
  **sessionStorage**; `resetMockDb()` (logout, every mock test) throws it away.
- `mock/handlers.ts` — one handler per `SERVICE/command`, returning the envelope the core would
  (`result: 0`, or non-zero + `message`). A handler throwing `MockError` becomes a refusal.
  Responses are `structuredClone`d so a component can never mutate the database through them.
- `resolveApproval(tx)` in `handlers.ts` is the **approval policy**: one rejection ends a
  transaction; it executes once it has as many approvals as `requiredApprovals`, which
  `approvalsRequired` computes from the maker's roles (`ALL` counts every approver on a level,
  `ATLEAST` its `min`). Per-transaction limits on a role are enforced in `submit`.
- Demo-only commands, never to be wired to a real backend: `simulateapproval` (a pending
  transaction you made gets approved by the next approver) and the `pendingJoin` code in
  `joingrouprequest`/`joingroup`. They exist because a demo has no second person.
- `VITE_MOCK_DELAY_MS` (default 250, 0 in tests) delays every answer so loading states are real.

**Adding a command** means: a type in `api/types.ts`, a function in `commands.ts`, a handler in
`handlers.ts`, and a case in `mock/handlers.test.ts`.

**Never write `new Promise(async (resolve) => ...)`.** An async executor that throws returns a
rejected promise which `new Promise` discards, so the promise never settles. If a cached
in-flight promise is involved, clear it in `finally` (as `loadGroupHome` in `stores/home.ts` does).

## Conventions

**Svelte 5 runes everywhere.** `$state`, `$derived`, `$props`, `$effect`, `onclick`,
callback props, `{#snippet}` / `{@render}`. The Svelte 4 idiom (`export let`, `$:`,
`createEventDispatcher`, `on:click`, `<slot/>`) does not appear anywhere — do not reintroduce it.

**Prefer the modern API to a hand-rolled one**: `svelte/reactivity/window`, `{@attach}` for DOM
behaviour (`src/lib/attachments/clickOutside.ts`), `<svelte:window>`, `<svelte:boundary>` around
the dashboard charts so one failing widget does not take the page down.

**`{@attach}` is reactive, unlike `use:`** — it re-runs when state it reads changes. Right for
lifecycle-bound behaviour, wrong for a gesture in progress. And Svelte flushes effects
synchronously inside a trusted event handler, so a click-outside listener on `click` would catch
the click that opened its popup: `clickOutside` listens for `pointerdown`. A trigger button and
its menu must share **one** `clickOutside` wrapper, or pressing the trigger counts as "outside".

**Assigning state inside an `$effect` needs a reason.** A one-shot boot task wraps its body in
`untrack()`.

**Config comes from `src/lib/env.ts`.** Add a `VITE_*` variable, type it in `src/vite-env.d.ts`,
expose it through `env`, document it in `.env.example`.

**Types are imported with `import type`** (`verbatimModuleSyntax` is on).

**Styling is Tailwind 4, configured in CSS.** Tokens are the `@theme` block in `src/app.css`
(see `DESIGN.md` for what each is for). Breakpoints *replace* Tailwind's defaults: only
`mobile` / `tablet` / `laptop` / `desktop` exist. Avoid `@apply` in a component `<style>` block.
**Do not change the brand colours** — `#c11111` UI red, `#DD2319` logo red, `#133D6B` navy come
from the Figma file and are fixed.

**Two `t()` helpers, still not duplicates.** `src/lib/utils/helper.ts`'s `t()` resolves the
language **once at module load** — `?lang=` URL param, else the stored `lang`, else Lao (1) —
because `lib/menus.ts` translates labels at import time. The top bar's language pill calls
`setLanguage()`, which stores the choice and reloads. The login screen (`Login`, `FormLogin`,
`QRCodeLogin`) has local `t()`s reading the `language` **store** so it re-renders live. Do not
merge them by accident.

**Money is formatted with `money()` / `formatMoney()` from `helper.ts`**, dates with
`splitTime()` — the design writes `99,999,999.99 ກີບ` and `14/07/2025 09:51:31`. Transaction
words (service names, statuses, statement filter categories) live in `src/lib/transactions.ts`.

**Navigation goes through `src/lib/utils/navigation.ts`.** Every screen is a hash route in
`src/lib/routes.ts` (path, sidebar entry, `menuKeys`, `fullWidth`) mapped to a component in
`src/routes/index.ts`. A home tile's menu key opens `pathForMenuKey(key)` — its route, or the
`/service/:key` coming-soon page. `src/lib/menus.ts` stays a superset of what can be sent;
`menus.registry.test.ts` pins that.

**Read the active route from `routeLocation` (`src/stores/route.ts`)**, never from
svelte-spa-router's internals — for the path *and* the querystring (`$routeLocation.query`).

**Group state:** `src/stores/groups.ts` (the list, seeded from login then refreshed),
`onebankGroups.ts` (`currentGroup`, cached `loadHomeResult` per group), `home.ts`
(`loadGroupHome` — the shell loads the active group's home on every group change;
`reloadHome()` after a mutation), `badges.ts` (unread / to-approve counts).

**Commit messages carry no co-author or tool attribution trailers.** Subject in the imperative,
lowercase; add a body only when the *why* isn't obvious from the diff.

**Never key a test on a style class.** Use roles and ARIA: the active nav entry carries
`aria-current="page"`, the active group tab `aria-current="true"`.

## Gates

| Gate | State |
|---|---|
| `pnpm test` | **171 passing** — a passing gate |
| `pnpm run check` | **0 errors, 0 warnings** — a passing gate; do not add either |
| `pnpm build` | passing gate |
| `pnpm format:check` | failing, pre-existing — not a gate until someone runs `pnpm format` in a commit of its own |

## Testing

**`localStorage` in tests needs a Node flag.** Node 22+ defines its own `globalThis.localStorage`
and Vitest's jsdom skips existing globals, so `vitest.config.ts` runs workers with
`--no-experimental-webstorage`. Permanent, not a stopgap.

**`src/setupTests.ts` pins English** (`localStorage.lang = '0'` at top level, before any import)
because `t()` resolves at import time and the app defaults to Lao. It also stubs `ResizeObserver`,
`matchMedia` and `Element.prototype.animate` (Svelte transitions call it; jsdom lacks it).

**Waiting for a hash change takes two macrotasks, not one.** jsdom assigns the hash synchronously
but dispatches `hashchange` a task later.

**Component tests inject their own transport** with `setTransport(async (service, data) => …)`;
integration and mock tests use the real mock with `resetMockDb(fixedDate)`.

## Known sharp edges

- **The Figma MCP Starter plan has a low call limit** and it was hit mid-build. `DESIGN.md` lists
  which screens were built from full frame context and which from the saved metadata only —
  re-verify the latter against their frames.
- **QR codes are decorative** (`lib/components/FauxQr.svelte`) — they encode nothing.
- **Salary upload reads CSV only** (`routes/money/salary.ts`, with its own tests).
- Icons other than the Figma's own SVGs come from `@iconify/svelte`, which fetches icon data from
  the Iconify API at runtime; offline, those icons render empty.
- Old `.env` files may still carry the retired `VITE_SERVICE_URL`/`VITE_PAYLOAD_PATH`/… keys;
  they are ignored.
