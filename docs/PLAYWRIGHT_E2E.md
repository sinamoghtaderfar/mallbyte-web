# Browser E2E checks

This suite runs a real Chromium browser against a real Next.js dev server and **mocked** Django API responses.

It covers:
- Public catalog deep links, filters, pagination, browser history
- Unauthenticated access denial for /admin/super
- Email OTP -> privileged MFA enrollment -> TOTP -> one-time recovery-code display
- Existing privileged account recovery-code login

These checks test the browser integration contract only. They do **not** test Django's OTP delivery, database transactions, real payments, email provider, Celery, or staging infrastructure. Those require a seeded, isolated end-to-end environment and separate live-service tests.

Run locally:

```sh
npm ci
npm install --no-save --package-lock=false @playwright/test@1.58.2
npx playwright install chromium
npx playwright test
```

The tests fail closed for unrecognized `/api/**` requests, so they never use or mutate live API data.
Do not supply real credentials in tests. CI saves screenshots/traces only after failures.
