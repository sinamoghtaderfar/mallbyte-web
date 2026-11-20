# Redesign evidence — Ink & Ember

Pairs of `before-*` / `after-*` screenshots (widths 1440 and 390, cropped).

- **Before:** `main` at `3bef22a`. **After:** branch `design/premium-redesign`.
- Data: local `mallbyte-api` (Django, SQLite) seeded with the repository's `seed_analytics_demo` command plus additional demo catalog records. Product images are procedurally generated illustrations, not real product photography.
- Signed-in captures use the real OTP + admin MFA flow against that local API. The cart → checkout → order → payment flow was exercised end to end against it.
- These images do not certify production content, deployed contracts or a full WCAG audit.
