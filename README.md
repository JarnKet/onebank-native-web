# OneBank Web

BCEL OneBank's web app: shared group accounts, roles and approvals, transfers, bills, salary
and e-cheques, on the BCEL One core. Figma screens are native where the core contract allows,
legacy b1hybrid / onebank-ui pages in an iframe otherwise. See `PRODUCT.md` for what is which,
`DESIGN.md` for how it is designed, and `CLAUDE.md` for how the code is organised — including the
two dev servers it needs.

```bash
pnpm install
pnpm dev        # http://localhost:7001 (onebank-ui must be on :7000)
pnpm test
pnpm run check
pnpm build
```
