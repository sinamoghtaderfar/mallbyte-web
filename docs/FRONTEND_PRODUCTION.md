# Frontend Staging / Production Image

This repo can build a non-root Next.js standalone image. It does not
provision DNS/TLS, reverse proxies, real services or payment integrations.

## Build

```sh
docker build -f Dockerfile.production \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://staging-api.example.com \
  -t mallbyte-web:staging .
```

`NEXT_PUBLIC_API_BASE_URL` is embedded at **build time** by Next.js.
Build a distinct image for a distinct API origin. Do not reuse the
staging image in production without rebuilding and retesting.

Use a trusted HTTPS reverse proxy to terminate TLS and forward traffic
to loopback-bound port 3000. If the API is on another origin, ensure
Django CORS and cookie settings match the actual browser origins.

## Staging

```sh
export NEXT_PUBLIC_API_BASE_URL=https://staging-api.example.com
docker compose -f compose.staging.yaml config
docker compose -f compose.staging.yaml up -d --build
```

The image runs as a non-root account and uses a read-only filesystem.
It only contains the standalone server, static assets and public files.

## Gates before production

- Frontend lint, unit tests, Next build and Playwright smoke checks green
- Real staging backend integrated and OTP/MFA login manually tested
- Auth refresh cookie behavior validated through HTTPS and actual origins
- No dev API URL embedded in the final production JS bundle
- Correct staging/production CSP, CORS, TLS and CSRF settings reviewed
- Browser checks for checkout, seller permissions and private data
- Approved monitoring, rollout and rollback plan

Never expose localhost development servers publicly or include any secret
in a `NEXT_PUBLIC_*` variable.
