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

test("notification confirmation contains keyboard focus and restores its trigger", async ({
  page,
}) => {
  await installApiMocks(page, {
    "/api/auth/token/refresh/": (route) =>
      fulfillJson(route, { access: "dialog-browser-access" }),
    "/api/auth/profile/": (route) => fulfillJson(route, { user: customer }),
    "/api/content/navigation/": (route) => fulfillJson(route, []),
    "/api/orders/cart/": (route) =>
      fulfillJson(route, {
        id: 1,
        user: 7,
        items: [],
        total_items: 0,
        subtotal: "0",
      }),
    "/api/notifications/unread-count/": (route) =>
      fulfillJson(route, { unread_count: 1 }),
    "/api/notifications/": (route) =>
      fulfillJson(route, {
        count: 1,
        next: null,
        previous: null,
        results: [
          {
            id: 1,
            user: customer.email,
            title: "Order update",
            message: "Your order is ready.",
            notification_type: "order",
            channel: "in_app",
            priority: "normal",
            is_read: false,
            read_at: null,
            related_object_type: "order",
            related_object_id: "12",
            action_url: "/orders/12",
            metadata: {},
            created_at: "2026-11-10T12:00:00Z",
            updated_at: "2026-11-10T12:00:00Z",
          },
        ],
      }),
  });
  await page.goto("/notifications");
  const trigger = page.getByRole("button", { name: "Clear all", exact: true });
  await expect(trigger).toBeEnabled();
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Clear all notifications?" });
  await expect(dialog).toBeVisible();
  const cancel = dialog.getByRole("button", { name: "Cancel" });
  const confirm = dialog.getByRole("button", { name: "Clear all" });
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(confirm).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(cancel).toBeFocused();
  const headerLink = page.locator("header a").first();
  await headerLink.evaluate((element) => (element as HTMLElement).focus());
  await expect(cancel).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
