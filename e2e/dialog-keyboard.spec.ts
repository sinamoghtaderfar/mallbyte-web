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
  let deleted = false;
  let releaseCount!: () => void;
  const pendingCount = new Promise<void>((resolve) => { releaseCount = resolve; });
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
    "/api/notifications/unread-count/": async (route) => {
      if (deleted) await pendingCount;
      await fulfillJson(route, { unread_count: deleted ? 0 : 1 });
    },
    "/api/notifications/delete-selected/": (route) => {
      deleted = true;
      return fulfillJson(route, { deleted_count: 1 });
    },
    "/api/notifications/": (route) =>
      fulfillJson(route, {
        count: deleted ? 0 : 1,
        next: null,
        previous: null,
        results: deleted ? [] : [
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

  await page.getByRole("checkbox", { name: "Select Order update", exact: true }).check();
  const selectedDelete = page.getByRole("button", { name: "Delete", exact: true });
  await selectedDelete.focus();
  await page.keyboard.press("Enter");
  const deleteDialog = page.getByRole("dialog", { name: "Delete selected notifications?" });
  await deleteDialog.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(deleteDialog).toHaveCount(0);
  await expect(selectedDelete).toHaveCount(0);
  const workspace = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Notifications", exact: true }),
  });
  await expect.poll(() => workspace.evaluate((element) =>
    element.contains(document.activeElement),
  )).toBe(true);
  expect(await page.evaluate(() => {
    const active = document.activeElement;
    return active !== document.body && active !== document.documentElement &&
      !active?.closest("[inert]") && !active?.matches(":disabled");
  })).toBe(true);
  // A workspace with an available control restores to it. If all controls are
  // busy, native focus needs the borrowed tabindex until the container blurs.
  if (await workspace.evaluate((element) => element === document.activeElement)) {
    await expect(workspace).toHaveAttribute("tabindex", "-1");
  }
  await headerLink.focus();
  await expect(headerLink).toBeFocused();
  await expect(workspace).not.toHaveAttribute("tabindex");
  releaseCount();
});
