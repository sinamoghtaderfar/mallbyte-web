import { expect, test } from "@playwright/test";
import { fulfillJson, installApiMocks } from "./helpers/mock-api";

const customer = {
  id: 7,
  email: "customer@example.test",
  full_name: "Browser Customer",
  phone: null,
  is_seller: false,
  is_staff: false,
  is_superuser: false,
  email_verified: true,
};

test("failed server logout remains signed out after reload instead of restoring the cookie session", async ({
  page,
}) => {
  let authenticated = false;
  let refreshCalls = 0;
  await installApiMocks(page, {
    "/api/auth/token/refresh/": async (route) => {
      refreshCalls += 1;
      await fulfillJson(
        route,
        authenticated
          ? { access: "cookie-session-access" }
          : { detail: "No session" },
        authenticated ? 200 : 401,
      );
    },
    "/api/auth/profile/": async (route) =>
      fulfillJson(route, { user: customer }),
    "/api/auth/otp/request/": async (route) =>
      fulfillJson(route, { message: "OTP sent", expires_in: 300 }),
    "/api/auth/otp/verify/": async (route) => {
      authenticated = true;
      await fulfillJson(route, {
        user: customer,
        access: "browser-test-access",
        is_new: false,
      });
    },
    "/api/auth/logout/": async (route) =>
      fulfillJson(route, { detail: "Server unavailable" }, 503),
  });
  await page.goto("/auth");
  await page.getByLabel("Email address").fill(customer.email);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("Email verification code").fill("123456");
  await page.getByRole("button", { name: "Verify email" }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(
    page.getByText(/Server sign-out could not be confirmed/),
  ).toBeVisible();
  const beforeReload = refreshCalls;
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Sign in to MallByte" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Retry server sign-out" }),
  ).toBeVisible();
  expect(refreshCalls).toBe(beforeReload);
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toHaveCount(0);
});

test("a terminal refresh failure clears authenticated routes and allows sign-in again", async ({
  page,
}) => {
  let authenticated = false;
  let revoked = false;
  await installApiMocks(page, {
    "/api/auth/token/refresh/": async (route) =>
      fulfillJson(
        route,
        authenticated && !revoked
          ? { access: "browser-test-access" }
          : { detail: "No valid session" },
        authenticated && !revoked ? 200 : 401,
      ),
    "/api/auth/profile/": async (route) =>
      fulfillJson(route, { user: customer }),
    "/api/auth/otp/request/": async (route) =>
      fulfillJson(route, { message: "OTP sent", expires_in: 300 }),
    "/api/auth/otp/verify/": async (route) => {
      authenticated = true;
      await fulfillJson(route, {
        user: customer,
        access: "browser-test-access",
        is_new: false,
      });
    },
    "/api/orders/orders/": async (route) => {
      revoked = true;
      await fulfillJson(route, { detail: "Access rejected" }, 401);
    },
  });
  await page.goto("/auth");
  await page.getByLabel("Email address").fill(customer.email);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("Email verification code").fill("123456");
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(
    page.getByRole("button", { name: "Sign out", exact: true }),
  ).toBeVisible();
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/auth$/);
  await expect(
    page.getByRole("heading", { name: "Sign in to MallByte" }),
  ).toBeVisible();
  await expect(page.getByText(/Your session has expired/)).toBeVisible();
  await page.getByLabel("Email address").fill("another@example.test");
  await expect(page.getByLabel("Email address")).toHaveValue(
    "another@example.test",
  );
});
