import { expect, test } from "@playwright/test";
import { fulfillJson, installApiMocks } from "./helpers/mock-api";

test("profile offers one application and shows its status when the customer returns", async ({
  page,
}) => {
  const user = {
    id: 7,
    email: "customer@example.test",
    full_name: "Example Customer",
    phone: null,
    is_seller: false,
    email_verified: true,
  };
  let submissions = 0;
  await installApiMocks(page, {
    "/api/auth/token/refresh/": (route) =>
      fulfillJson(route, { access: "browser-fixture" }),
    "/api/auth/profile/": (route) => fulfillJson(route, { user }),
    "/api/rbac/my-permissions/": (route) =>
      fulfillJson(route, { user_id: user.id, permissions: [] }),
    "/api/content/navigation/": (route) => fulfillJson(route, []),
    "/api/orders/cart/": (route) =>
      fulfillJson(route, { items: [], total_items: 0, subtotal: "0" }),
    "/api/notifications/unread-count/": (route) =>
      fulfillJson(route, { unread_count: 0 }),
    "/api/notifications/preferences/": (route) =>
      fulfillJson(route, {
        muted_notification_types: [],
        muted_channels: [],
        email_enabled: true,
        sms_enabled: false,
        push_enabled: false,
        in_app_enabled: true,
      }),
    "/api/auth/seller/status/": (route) =>
      submissions
        ? fulfillJson(route, { status: "pending", store_name: "Example Store" })
        : fulfillJson(route, { detail: "No seller application" }, 404),
    "/api/auth/seller/apply/": (route) => {
      submissions += 1;
      return fulfillJson(route, route.request().postDataJSON(), 201);
    },
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/profile");
  const apply = page.getByRole("link", {
    name: "Become a Seller",
    exact: true,
  });
  await expect(apply).toBeVisible();
  await apply.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/seller\/apply$/);
  expect(submissions).toBe(0);

  await page.getByLabel("Store name").fill("Example Store");
  await page.getByLabel("Business phone").fill("+4917612345678");
  await page.getByLabel("Account holder").fill("Example Customer");
  await page.getByLabel("IBAN").fill("DE89370400440532013000");
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page).toHaveURL(/\/seller\/status$/);
  await expect(
    page.getByRole("heading", { name: "Example Store" }),
  ).toBeVisible();
  expect(submissions).toBe(1);

  await page.goBack();
  await expect(page).toHaveURL(/\/seller\/apply$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(
    page.getByRole("link", { name: "View Application Status" }),
  ).toHaveAttribute("href", "/seller/status");
  await expect(apply).toHaveCount(0);
  expect(submissions).toBe(1);
});
