# Deep-screen evidence — Phase 4 polish

Screenshots of the operational screens polished in Phase 4, written by `e2e/deep-screens.spec.ts` when `CAPTURE_UI_EVIDENCE=1` is set.

- **Source:** branch `design/premium-redesign`, Next.js dev server, Chromium.
- **Data:** mocked API responses defined in the spec (fictional `example.test` identities, invented ticket, shipment and audit records). They show layout and states, not production content.
- **Widths:** 390 (phone), 834 (tablet) and 1440 (desktop) pixels; viewport-sized captures.
- Every capture also passed the spec's assertions: the page heading is visible and the document does not scroll horizontally.

| Screen | Files |
| --- | --- |
| Super Admin Console overview | `super-admin-{390,834,1440}.jpg` |
| Content management (pages) | `cms-{390,834,1440}.jpg` |
| Audit monitoring | `audit-monitoring-{390,834,1440}.jpg` |
| Shipment detail | `shipment-detail-{390,834,1440}.jpg` |
| Support center with a ticket conversation open | `support-{390,834,1440}.jpg` |
| Notification center | `notifications-{390,834,1440}.jpg` |

These images do not certify behaviour against a live API or a full WCAG audit.
