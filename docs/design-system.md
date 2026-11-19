# MallByte design foundation

The visual direction retains MallByte's slate and cyan identity with a quieter teal accent, clear typography, restrained corners, and purposeful borders. Product images, useful information, and the next action carry the hierarchy. Published CMS content remains authoritative; presentation must not invent currencies, delivery promises, testimonials, or operational capabilities.

## Tokens

`src/app/globals.css` is the single token source. Tailwind's inline theme exposes the same values to existing JSX without a runtime styling library.

| Token | Purpose |
| --- | --- |
| `background` / `surface` | Soft page canvas / white content surface |
| `foreground` / `muted` | Main information / readable supporting text |
| `line` | Neutral dividers and control borders |
| `brand` / `brand-hover` / `brand-soft` | Primary actions, active navigation, subtle selection |
| `danger` | Destructive actions and validation |

Keep `color-scheme: light` in both OS preferences. Native inputs must remain readable. Semantic success, warning, and error notices retain the existing emerald, amber, and rose palettes with visible text and icons; color alone must not communicate state.

Use the local system sans stack: no font download, invisible-text interval, or new asset dependency. Headings use tight tracking and medium/semibold weight; supporting text normally uses 14px with a 20–24px line height. Form text remains 16px on narrow screens. Avoid uppercase paragraphs and low-contrast 12px metadata. Verify actual contrast for each adopted foreground/surface pair; this is not a blanket WCAG certification.

## Layout and components

- Align shared navigation to `max-w-7xl`, with 16px mobile, 24px tablet and 32px desktop gutters. Allow dense workspaces to choose an appropriate narrower container rather than stretching forms.
- Use the 4px spacing scale, 8px control corners, and roughly 12px content-surface corners. Reserve pills for short status labels. Prefer borders to repeated shadows.
- `Button` and `buttonStyles` share primary, secondary, quiet and danger treatments. Native button semantics remain intact; the default type is `button`. `loading` announces busy state and disables repeat activation without removing the label. Icon controls require an accessible name. All supported sizes are at least 44px high.
- `Input`, `Select`, and `Textarea` preserve native props, labels, required validation, and `aria-invalid`. Associate help/error text with `aria-describedby` in callers. Never hide an error behind a loading indicator.
- Keep existing `AccessibleDialog` focus containment, inert background, Escape behavior and return focus. Style its caller surfaces without replacing this behavior.
- Reuse the existing insights `Panel`, `Metric`, `Notice`, period picker and charts when refining finance/analytics. Align their presentation to these tokens rather than creating a competing kit.
- Preserve server pagination counts and bounded requests. Pagination controls must wrap or remain in a clearly bounded local scroller; mobile pages must not overflow horizontally.
- Loading, empty and error states need distinct copy and semantics (`status` for progress, `alert` for actionable failures), with recovery actions where supported. Skeletons should reserve the real content footprint and respect reduced motion.

## Navigation and interaction

The header provides native GET search into the existing catalog URL contract; typing does not trigger API requests. Main navigation appears from 1024px and wraps for published CMS links. On smaller screens it is an inline disclosure: Escape closes it and restores its trigger; following a link closes it. It is not a modal and must not trap focus. Permission-scoped links retain identity checks and server permission decisions.

Account pages share real destination links with an active destination and a bounded horizontal rail on narrow screens. The skip link moves keyboard users beyond repeated navigation. All interactive elements have a visible focus indicator. Motion remains subtle and is suppressed for reduced-motion users.

## Adoption and verification

This first stage adopts the foundation in shared navigation, search, account wayfinding, footer, cart access and notification preview placement. Storefront, shopping workflows, seller and operations are separate dependent stages; legacy page styling has not been claimed as migrated.

Before/after evidence uses isolated, fail-closed mock APIs and records exact source revisions, widths and states. It does not certify deployed API contracts, production content, real payment, a complete WCAG audit, or field performance. Keep existing Phase 1–3 regression tests and request/session guards. Validate full unit tests, TypeScript, lint, Chromium and a production Docker image before finalizing each major workstream.
