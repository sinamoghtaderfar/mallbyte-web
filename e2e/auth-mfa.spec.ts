import { expect, test } from "@playwright/test";
import { adminUser, fulfillJson, installApiMocks } from "./helpers/mock-api";

test("visitors cannot open the Super Admin console", async ({ page }) => {
  await installApiMocks(page, {});
  await page.goto("/admin/super");
  await expect(page.getByRole("heading", { name: "Super Admin only" })).toBeVisible();
});

test("privileged login requires email, password enrollment and TOTP before recovery codes", async ({ page }) => {
  let emailVerified = false;
  let totpConfirmed = false;
  await installApiMocks(page, {
    "/api/auth/otp/request/": async route => {
      expect(route.request().postDataJSON()).toEqual({ email: adminUser.email });
      await fulfillJson(route, { message: "OTP sent", delivery_channel: "email", email: "ad***@example.test", expires_in: 300 });
    },
    "/api/auth/otp/verify/": async route => {
      expect(route.request().postDataJSON()).toEqual({ email: adminUser.email, code: "123456" });
      emailVerified = true;
      await fulfillJson(route, { mfa_required: true, challenge: "one-time-browser-challenge", mfa_enrolled: false });
    },
    "/api/auth/mfa/setup/": async route => {
      expect(emailVerified).toBeTruthy();
      expect(route.request().postDataJSON()).toEqual({ challenge: "one-time-browser-challenge", password: "test-only-password" });
      await fulfillJson(route, { secret: "JBSWY3DPEHPK3PXP", otpauth_uri: "otpauth://totp/MallByte:admin@example.test", message: "Enroll" });
    },
    "/api/auth/mfa/complete/": async route => {
      expect(route.request().postDataJSON()).toEqual({ challenge: "one-time-browser-challenge", code: "654321" });
      totpConfirmed = true;
      await fulfillJson(route, { user: adminUser, access: "browser-test-jwt", is_new: false, recovery_codes: ["ABCDEF123456", "123456ABCDEF"] });
    },
  });

  await page.goto("/auth");
  await page.getByLabel("Email address").fill(adminUser.email);
  await page.getByRole("button", { name: "Send code" }).click();
  await expect(page.getByLabel("Email verification code")).toBeVisible();
  await page.getByLabel("Email verification code").fill("123456");
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page.getByLabel("Existing admin password")).toBeVisible();
  await page.getByLabel("Existing admin password").fill("test-only-password");
  await page.getByRole("button", { name: "Set up authenticator" }).click();
  await expect(page.getByText("JBSWY3DPEHPK3PXP")).toBeVisible();
  await page.getByLabel("Authenticator code").fill("654321");
  await page.getByRole("button", { name: "Enable MFA and sign in" }).click();
  await expect(page.getByText("ABCDEF123456")).toBeVisible();
  expect(totpConfirmed).toBeTruthy();
  await expect(page.getByRole("button", { name: "I saved my recovery codes" })).toBeVisible();
});

test("existing MFA setup accepts a single-use recovery code in the browser flow", async ({ page }) => {
  await installApiMocks(page, {
    "/api/auth/otp/request/": async route => fulfillJson(route, { message: "OTP sent", delivery_channel: "email", email: "ad***@example.test", expires_in: 300 }),
    "/api/auth/otp/verify/": async route => fulfillJson(route, { mfa_required: true, challenge: "recovery-challenge", mfa_enrolled: true }),
    "/api/auth/mfa/verify/": async route => {
      expect(route.request().postDataJSON()).toEqual({ challenge: "recovery-challenge", code: "ABCDEF123456" });
      await fulfillJson(route, { user: adminUser, access: "browser-test-jwt", is_new: false });
    },
  });
  await page.goto("/auth");
  await page.getByLabel("Email address").fill(adminUser.email);
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("Email verification code").fill("123456");
  await page.getByRole("button", { name: "Verify email" }).click();
  await expect(page.getByRole("button", { name: "Use a recovery code" })).toBeVisible();
  await page.getByRole("button", { name: "Use a recovery code" }).click();
  await page.getByLabel("Recovery code").fill("ABCDEF123456");
  await page.getByRole("button", { name: "Verify and sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/super/);
});
