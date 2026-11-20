# MallByte design system — "Ink & Ember"

MallByte reads as an editorial marketplace: warm paper surfaces, near-black ink for structure and primary actions, and a single ember accent for brand moments, discounts and the active indicator. Product imagery carries colour; the interface stays quiet around it. Published CMS content remains authoritative; presentation must not invent currencies, delivery promises, testimonials, or operational capabilities.

## Tokens

`src/app/globals.css` is the single token source.

| Token | Value | Purpose |
| --- | --- | --- |
| `background` | `#f7f5f0` | Warm page canvas |
| `surface` / `sunken` | `#ffffff` / `#f1efea` | Cards and panels / image wells, quiet groups |
| `foreground` / `muted` | `#1c1b19` / `#6b675f` | Body text / supporting text (5.3:1 on white) |
| `line` / `line-strong` | `#e4e1da` / `#cfcbc2` | Dividers / control borders |
| `ink` / `ink-hover` | `#121211` / `#2a2926` | Primary buttons, active navigation, dark panels |
| `brand` / `brand-hover` / `brand-soft` | `#c93d0b` / `#a8340d` / `#fff4ed` | Ember accent (5.05:1 with white text) |
| `danger`, `success`, `warning` | — | Semantic states; always paired with text/icons |

The neutral `slate-*` (and `gray-*`, `zinc-*`) scales are remapped to the warm ink scale and `cyan-*`/`teal-*` to the ember scale, so legacy utility classes inherit the identity. `ember-*` is available as a first-class scale. `slate-400` (`#8b877e`) is for icons and decorative strokes only; text starts at `slate-500`.

Radii: controls 12px (`rounded-xl`), cards 14px (`rounded-2xl`), large media 18–28px. Shadows are layered and low-contrast (`shadow-xs` … `shadow-2xl`); prefer a border plus `shadow-sm`.

## Typography

Fonts are self-hosted via `next/font/local` (SIL OFL, see `src/app/fonts/LICENSE-fonts.txt`); no runtime font CDN.

- **Geist** (variable) — all UI text. Body 14–16px, workspace headings semibold with tight tracking.
- **Instrument Serif** — editorial display only: storefront section titles, hero, product names, customer account titles (`.mb-display`, `font-display`). Use the italic for a single emphasised word, not whole sentences.
- **Geist Mono** — order numbers and codes.

Numbers in tables and stats use tabular figures (`data-numeric` or any `table`).

## Components

`src/components/ui`:

- `Button` / `buttonStyles` — `primary` (ink), `accent` (ember), `secondary`, `quiet`, `danger`, `inverse`; sizes `default`, `small`, `large`, `icon`. All ≥44px high except `mb-btn-sm` (36px). `loading` keeps the label and sets `aria-busy`.
- `Input`, `Select`, `Textarea`, `Field` — shared control recipe (`controlStyles`), visible focus ring, `aria-invalid` styling.
- `Badge`, `StatusBadge`, `statusTone` — maps API lifecycle values (order, payment, shipment, return, seller, CMS) to tones, label from the API's display text.
- `Card`, `CardHeader`, `StatCard`, `PageHeader`, `Breadcrumbs`.
- `Skeleton`, `EmptyState`, `Notice` (danger → `role="alert"`, others → `role="status"`).
- `Price`, `Rating`, `formatAmount`, `discountPercent` — amounts are shown as plain numbers because catalog endpoints return no currency; currencies appear only where the API supplies them (payments, finance).

Legacy markup uses the CSS recipes `.mb-control`, `.mb-select`, `.mb-btn` (`-primary`, `-secondary`, `-danger`, `-success`, `-sm`), `.mb-card`, `.mb-eyebrow`, `.mb-table`, `.mb-skeleton`, `.mb-container`. New code should prefer the React components.

## Layout and frames

- Storefront pages use `.mb-container` (88rem max, 16/24/32px gutters).
- `ShellFrame` (inside `SiteShell`) chooses the frame from the route: customer account routes get the account sidebar (horizontal rail below `lg`); seller workspace routes and admin/warehouse routes get `WorkspaceShell` with grouped navigation from `workspace-nav.ts`. Chrome is only shown to identities whose role matches; route guards and the API still make every access decision.
- Inside frames, the frame owns spacing; legacy page `<main>` padding is neutralised in CSS.
- Wide tables scroll inside their own container; on small screens they keep a 42rem minimum rather than crushing columns.
- Workspaces use a quiet utility footer; the storefront uses the full ink footer.

## Interaction and accessibility

- Visible 2px ember focus outline on every interactive element; skip link to `#main-content`.
- Mobile header menu is an inline disclosure (Escape closes and restores focus). Catalog filters collapse behind a disclosure below `lg`; sorting applies immediately; applied filters appear as removable chips.
- Motion is limited to short transitions and image hover scale; `prefers-reduced-motion` disables them.
- Loading, empty and error states are distinct: skeletons with `role="status"`, empty states with a next action, errors with recovery actions.
- `color-scheme: light` in both OS preferences so native controls stay readable.

## Verification

Before/after evidence for this redesign lives in `docs/ui-evidence/redesign/` (captured against a local `mallbyte-api` on SQLite with seeded demo data and procedurally generated product illustrations — not production content). Validate unit tests, TypeScript, lint, Playwright (mocked API) and a production build before merging.
