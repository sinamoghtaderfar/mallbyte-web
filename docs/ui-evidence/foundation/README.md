# Shared design foundation evidence

These four Chromium screenshots show the Stage A shared foundation. The homepage content remains the existing homepage; its discovery, product and catalog redesign belongs to the dependent storefront stage.

| Screenshot | Source and state |
| --- | --- |
| [Before: desktop home](before-home-1440.png) | Exact main `3b89904f82104267f0d618de5a6657c319448cca`, anonymous `/`, 1440 × 960 viewport; original capture from 2026-11-19. |
| [After: desktop home](after-home-1440.png) | Application source `d68b7b66a0a21d878d63963637c7c6cd663f4466`, anonymous `/`, 1440 × 960 viewport. Desktop navigation and search are exposed. |
| [After: mobile menu](after-menu-long-cms-390.png) | Same application source, authenticated `/profile`, 390 × 960 viewport; keyboard-opened menu with long CMS links. Escape closes the disclosure and restores trigger focus. |
| [After: notification preview](after-notification-long-390.png) | Same application source, authenticated `/profile`, 390 × 960 viewport; keyboard-opened notification preview with long title and tracking reference. |

The after screenshots were captured on 2026-11-20 after waiting for the actual session bootstrap response, requested CMS/profile content, network idle and fonts. The subsequent commit changes test readiness and documentation only. These files are copies of original full-page PNG captures, without visual editing. The baseline contains an injected Next development indicator; after captures hide only `nextjs-portal` to remove development tooling from the product view.

## Fixture and coverage limits

All browser API requests to `http://localhost:8000/**` are intercepted with isolated synthetic data. Unknown endpoints fail closed with HTTP 503. The account, CMS titles and shipping notification are fictional fixtures; no real account, backend data, session cookie or transaction was used. The mock notification count is a fixture, not a verified live-backend count. Product fixtures elsewhere in the audit use synthetic SVG test media, not merchant photography.

The retained full local audit includes homepage and authenticated account rail/long CMS/notification captures at 360, 390, 768, 1024, 1280 and 1440px. The mobile menu was also exercised at widths below 1024px. Each capture records matching document and viewport widths, no unhandled page errors and no unmocked API requests. Account navigation uses an intentional bounded horizontal scroller on narrow screens; focusing its last link scrolls it into view. The 390px homepage capture uses dark OS preference and all captures use reduced motion; the application retains its readable light control palette.

The 22-test Chromium run additionally covers native GET search against the existing catalog API, mobile Escape/return focus, skip-link focus, all six widths, dark preference, reduced motion, prior session/MFA flows, and notification-dialog keyboard containment. Unit/component validation passed 660 tests in 103 files; TypeScript and ESLint passed (one pre-existing catalog effect-dependency warning).

This is representative Chromium evidence, not a complete WCAG audit, cross-browser certification, live full-stack verification, production performance measurement or a claim that dependent page designs are finished. The existing Next advisory was observed during development startup; dependencies and lockfile remain unchanged in this design stage.

One initial extra 1024px authenticated capture reported a Next development-router initialization error. The failed attempt is retained in the audit log; the same state and remaining desktop widths were repeated on the warmed preview with no page errors. This does not establish whether that development-only initialization race can occur in a deployed application.

## Capture provenance

Original local evidence is retained in `/tmp/mallbyte-phase4-visual-audit/`: baseline `before/home-1440.png`, final after captures `after-foundation-final/`, and `final-foundation.cjs` with its JSON summary and log. The original baseline audit contains 35 screenshots and its `BASELINE_REPORT.md`; earlier after captures are retained separately and were not selected where screenshot readiness could not be established. A generated development `AGENTS.md` is runtime-only and excluded from the commit and production build context.
