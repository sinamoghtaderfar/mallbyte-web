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
mkdir -p .playwright-runner
npm install --prefix .playwright-runner --no-save @playwright/test@1.58.2
ln -s ../.playwright-runner/node_modules/@playwright node_modules/@playwright
.playwright-runner/node_modules/.bin/playwright install chromium
.playwright-runner/node_modules/.bin/playwright test
```

The tests fail closed for unrecognized `/api/**` requests, so they never use or mutate live API data.
Do not supply real credentials in tests. CI saves screenshots/traces only after failures.
