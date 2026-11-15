import { expect, test, type Locator } from "@playwright/test";
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

async function expectReadable(field: Locator) {
  const ratio = await field.evaluate((element) => {
    const context = document.createElement("canvas").getContext("2d")!;
    function rgba(color: string) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data);
    }
    const ancestors: Element[] = [];
    for (let node: Element | null = element; node; node = node.parentElement)
      ancestors.unshift(node);
    let background = [255, 255, 255];
    for (const node of ancestors) {
      const [red, green, blue, alpha] = rgba(
        getComputedStyle(node).backgroundColor,
      );
      background = [red, green, blue].map(
        (channel, index) =>
          (channel * alpha + background[index] * (255 - alpha)) / 255,
      );
    }
    function luminance(channels: number[]) {
      const [red, green, blue] = channels.map((channel) => {
        const value = channel / 255;
        return value <= 0.04045
          ? value / 12.92
          : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    }
    const text = luminance(rgba(getComputedStyle(element).color).slice(0, 3));
    const surface = luminance(background);
    return (Math.max(text, surface) + 0.05) / (Math.min(text, surface) + 0.05);
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
}

for (const colorScheme of ["light", "dark"] as const) {
  for (const width of [390, 1280]) {
    test(`form controls remain readable with ${colorScheme} preference at ${width}px`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme });
      await page.setViewportSize({ width, height: 900 });
      await installApiMocks(page, {
        "/api/auth/token/refresh/": (route) =>
          fulfillJson(route, { access: "contrast-browser-access" }),
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
          fulfillJson(route, { unread_count: 0 }),
        "/api/products/categories/": (route) =>
          fulfillJson(route, {
            count: 1,
            next: null,
            previous: null,
            results: [{ id: 1, name: "Accessories", slug: "accessories" }],
          }),
        "/api/products/brands/": (route) =>
          fulfillJson(route, {
            count: 1,
            next: null,
            previous: null,
            results: [{ id: 1, name: "MallByte", slug: "mallbyte" }],
          }),
        "/api/products/products/": (route) =>
          fulfillJson(route, {
            count: 0,
            next: null,
            previous: null,
            results: [],
          }),
      });

      await page.goto("/products");
      const search = page.getByRole("textbox", { name: "Search products" });
      await search.fill("Keyboard");
      await expectReadable(search);
      const category = page.getByRole("combobox", {
        name: "Category",
        exact: true,
      });
      await expect(category).toBeEnabled();
      await category.selectOption("1");
      await expectReadable(category);
      await expectReadable(category.locator('option[value="1"]'));

      await page.goto("/seller/apply");
      const store = page.getByRole("textbox", { name: "Store name" });
      await store.fill("Readable store");
      await expectReadable(store);
      const description = page.getByRole("textbox", { name: "Description" });
      await description.fill("Readable description");
      await expectReadable(description);
    });
  }
}
