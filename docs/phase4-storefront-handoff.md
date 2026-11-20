# Phase 4 storefront WIP handoff

This branch is a preserved work in progress for Claude Code. The user changed the objective to handoff only on 2026-11-20. No frontend implementation was changed after that instruction, and no additional broad tests were run. Do not treat this branch or its draft PR as complete or merge it automatically.

## Branch and dependency

- Branch: `design/phase4-storefront`; original local worktree: `/tmp/mallbyte-phase4-storefront`.
- Verified main base: `3b89904f82104267f0d618de5a6657c319448cca`.
- Foundation dependency: [PR #44](https://github.com/sinamoghtaderfar/mallbyte-web/pull/44), exact head `cec7479c291a3051b5b09946b740ea0287f6f747`.
- Foundation was merged normally into this branch at `e8cee740913aa8ec0a52ecd720921c257ebf0965`; an earlier normal merge included candidate `d68b7b6`. No rebase, force push, main push or PR merge was performed.
- A fresh remote check during handoff observed main `3bef22af4703f9efca742ed82485d6f603fd0f9a`, and GitHub reports PR #44 already merged externally. This branch was not merged with that newer main during handoff. Review the storefront changes against `cec7479`; storefront remains WIP pending its remaining work and verification.
- See the root handoff document on the separate documentation branch for other Phase 4 workstreams and the original user brief. Do not duplicate their work or edit their branches blindly.

## Preserved implementation

Thirteen application/test files contain the storefront work: an editorial homepage retaining published CMS and optional-load fallback; one catalog H1; one responsive filter form with retained drafts; inline price validation that preserves results; current-query retry; two-column mobile cards with actual lazy images and broken/missing-media fallback; purchase information before seller/SKU metadata; and a keyboard-operable gallery exposing every supplied image. Existing URL/server pagination, cart, wishlist, reviews, attributes, variants and related products remain in use. API modules, URL-state helpers, auth/session/cart stores, dependencies and lockfile were not changed by this storefront implementation.

Later source refinements added a PDP loading skeleton/status, foundation-styled PDP errors, price-field error associations, 12px card badges and removal of decorative homepage arrows. These refinements invalidate a claim that the earlier complete unit/lint results cover the final source.

The category/brand reference pagination presentation adjustment was **planned but never implemented**. The existing small pagination controls are still visible in the new filter panel. No partial shared-reference-loader change needs recovery. The reviews and related-products sections retain their legacy presentation; this branch does not claim a comprehensive redesign of those sections or all storefront workflows.

## Check evidence and precise limits

| Check | Last observed result |
| --- | --- |
| Focused Vitest | 29 tests in five files passed on the earlier implementation. |
| Complete Vitest | 672 tests in 105 files passed before the later source refinements above. Not rerun on the handoff source. |
| TypeScript | `tsc --noEmit --incremental false` passed after those source refinements. The subsequent foundation merge changed documentation and E2E readiness, not application code. |
| ESLint | Earlier full lint passed. The later full run was cancelled during host resource serialization and has no final passing result. |
| Chromium E2E | Nine new storefront cases are written. The complete 31-case suite was not run on this branch. Foundation's earlier 22-case result is dependency evidence only. |
| Rendered audit | 33 attempted captures, 32 successful captures; zero observed horizontal overflow, unhandled page errors or unmocked API calls in the recorded results. One validation-state capture failed due to an ambiguous harness alert selector. |
| Production Docker | Not run for this storefront implementation. Foundation's separate non-root/HTTP 200 smoke does not validate this branch. |

The audit covers home/catalog/PDP at 360, 390, 768, 1024, 1280 and 1440px; additional catalog open/empty/loading/error/long-title states; PDP unavailable/missing/broken/loading/error/long-content states; keyboard selection of image six; wishlist-save success; and published CMS hero states at 390/1440. At 390px, the populated catalog has one H1, first merchandise at 430px and a 1953px document with six products; the baseline document is 4584px. These are fixture observations, not production measurements or full accessibility certification.

Selected screenshots, a compact sanitized report, source fingerprints and the recovery harness are in [ui-evidence/storefront](ui-evidence/storefront/README.md). The screenshots use fictional data and synthetic SVG test media, not inspected merchant photography. Only representative images were manually viewed. A full-page capture does not scroll every lazy image into view; some mobile PDP related-media areas appear blank for that reason. Correct capture readiness before judging those images. No live backend, real account, payment or production performance was validated.

## Resume without losing work

1. Inspect this branch and the consolidated handoff first. Keep foundation dependency and other workstream ownership in mind.
2. Decide which remaining visual changes are appropriate. The reference-pagination controls and legacy review/related surfaces are known adoption gaps. Do not assume every Phase 4 area is complete.
3. Correct the recovery harness's validation locator: `getByRole('alert')` currently matches both `#catalog-price-error` and Next's route announcer. The actual inline price error rendered, but that capture is not a passing assertion. Also scroll lazy media into view before full-page evidence capture. These harness corrections were deliberately left for recovery.
4. Finish visual inspection and interaction checks on frozen application source, then run the required final suite. Preserve all Phase 1–3 tests and backend contracts.
5. Inspect exact-head CI before making a completion claim. Keep the PR draft until the work is ready for review. Never merge automatically.

## Commands and local resources

Use one heavy runtime at a time. Previous concurrent Next/browser/Vitest/Docker runs caused host memory pressure and timing failures. All B-owned servers and browser runners were stopped for handoff; no server is intentionally left running.

```bash
git fetch origin --prune
git switch design/phase4-storefront
git diff cec7479c291a3051b5b09946b740ea0287f6f747...HEAD -- src e2e docs
npm ci
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 NEXT_TELEMETRY_DISABLED=1 npm run dev -- --hostname 127.0.0.1 --port 3000 --webpack
```

The existing Next startup advisory sometimes stops the first invocation; retrying the unchanged command previously started the preview. No upgrade was performed or authorized as part of the design/handoff work. Generated `AGENTS.md` is runtime-only and must not enter commits or image context.

The local ignored `node_modules` link points to `/tmp/mallbyte-phase4-foundation/node_modules`. The existing isolated runner is `/tmp/mallbyte-playwright-runner`, and the cached Chromium is under `/tmp/mallbyte-audit-browsers`. These are local conveniences, not committed dependencies. The workflow in `.github/workflows/browser-e2e.yml` documents a clean isolated Playwright installation if they are unavailable.

With the preview confirmed ready on the fixed mock CORS origin `http://127.0.0.1:3000`:

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/mallbyte-audit-browsers AUDIT_PLAYWRIGHT_MODULE=/tmp/mallbyte-playwright-runner/node_modules/playwright node docs/ui-evidence/storefront/visual-audit.cjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/mallbyte-audit-browsers /tmp/mallbyte-playwright-runner/node_modules/.bin/playwright test --workers=1
```

The recovery audit writes to `/tmp/mallbyte-storefront-handoff-audit` by default; `AUDIT_OUTPUT` overrides it and `AUDIT_ONLY=catalog,catalog-open` selects cases. API interception fails closed for unknown endpoints. Keep the preview origin and mock CORS origin aligned. Do not point it at real production data.

Remaining final checks, after any implementation or harness work is finished:

```bash
npm run test:run -- --maxWorkers=1 --testTimeout=15000
./node_modules/.bin/tsc --noEmit --incremental false
npm run lint
docker build -f Dockerfile.production --build-arg NEXT_PUBLIC_API_BASE_URL=https://staging-api.example.com -t mallbyte-web:phase4-storefront-wip .
```

Then verify the production container uses the existing non-root `nextjs` user and serves HTTP 200, following `.github/workflows/frontend-image-ci.yml`. None of these remaining commands were run merely to publish the handoff.
