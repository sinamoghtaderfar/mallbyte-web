# Storefront WIP visual evidence

These are selected original Chromium PNG captures, copied without visual editing. This is handoff evidence for an unfinished branch, not a completion or compliance claim.

| Screenshot | Source/state |
| --- | --- |
| [Before mobile catalog](before-catalog-390.png) | Main `3b89904`, anonymous `/products`, 390 × 960 viewport, six fixture products, 2026-11-19. |
| [After mobile catalog](after-catalog-390.png) | Frozen WIP storefront source after normal foundation merge `e8cee74`, same route/viewport/fixtures, 2026-11-20. One H1, collapsed single filter form, merchandise begins at 430px. |
| [After desktop homepage](after-home-1440.png) | Same WIP source, anonymous `/`, 1440 × 960; fallback hero with published featured page/FAQ. Compare the [baseline home retained by foundation](../foundation/before-home-1440.png). |
| [After desktop PDP](after-product-1440.png) | Same WIP source, authenticated `/products/1`, 1440 × 960; purchase action before seller/SKU facts and selectable media. Legacy review/related surfaces remain. |

[manifest.json](manifest.json) fingerprints the retained PNGs. [source-sha256.json](source-sha256.json) fingerprints all 13 storefront application/test files exactly as preserved for handoff. [visual-qa-report.json](visual-qa-report.json) records 33 attempted states: 32 captures succeeded; the price-validation capture failed because the harness's `getByRole('alert')` selector also matched the Next route announcer. No recorded application page errors, unmocked requests or horizontal overflows were observed. All six requested widths have machine-recorded home/catalog/PDP metrics; only representative screenshots were manually reviewed.

All APIs are intercepted with fictional account, product, CMS and review fixtures. Unknown endpoints return controlled HTTP 503 responses. Images use synthetic SVG carryall geometry with varied colors, including for differently named products; these are **not real merchant photographs**. No real backend, account, cookie, payment, financial operation or production performance was validated. Full-page screenshots can contain unloaded lazy media below the initial viewport; the recovery harness still needs scrolling before those captures are judged. After captures hide only `nextjs-portal`; the baseline includes a development indicator.

[visual-audit.cjs](visual-audit.cjs) and [mock-fixtures.cjs](mock-fixtures.cjs) are sanitized recovery tools, not application code or CI tests. The known ambiguous validation selector is intentionally preserved and documented for Claude Code to fix. No raw logs, traces, environment files, credentials, build outputs or dependency directories are committed. The full local originals remain under `/tmp/mallbyte-phase4-visual-audit`, but those temporary files may not survive outside this workstation.

See [the branch recovery handoff](../../phase4-storefront-handoff.md) for dependency PR #44, precise check history, commands and remaining work. In particular, complete Vitest/lint/E2E and a storefront production-image smoke remain pending on the final source.
