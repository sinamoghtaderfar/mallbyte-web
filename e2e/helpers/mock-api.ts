import type { Page, Route } from "@playwright/test";

const API = "http://localhost:8000";

const headers = {
  "access-control-allow-origin": "http://127.0.0.1:3000",
  "access-control-allow-credentials": "true",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};

export const adminUser = {
  id: 101,
  email: "admin@example.test",
  phone: null,
  full_name: "Browser Test Admin",
  is_seller: false,
  is_staff: true,
  is_superuser: true,
  email_verified: true,
};

export async function mockUnauthenticated(page: Page) {
  await page.route(`${API}/api/auth/token/refresh/`, async route => {
    await fulfillJson(route, { detail: "No session" }, 401);
  });
}

export async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", headers, body: JSON.stringify(body) });
}

export async function installApiMocks(page: Page, handlers: Record<string, (route: Route) => Promise<void>>) {
  await page.route(`${API}/api/**`, async route => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const path = new URL(request.url()).pathname;
    const handler = handlers[path];
    if (handler) {
      await handler(route);
      return;
    }
    if (path === "/api/auth/token/refresh/") {
      await fulfillJson(route, { detail: "No active session" }, 401);
      return;
    }
    // Fail closed on unexpected API calls, rather than hitting a real backend.
    await fulfillJson(route, { detail: `Unmocked browser API: ${path}` }, 503);
  });
}
