import { expect, test, type Page } from "@playwright/test";
import { fulfillJson, installApiMocks } from "./helpers/mock-api";

async function mockStorefront(page: Page, catalogRequests: string[] = []) {
  await installApiMocks(page, {
    "/api/content/navigation/": async (route) => fulfillJson(route, []),
    "/api/content/homepage/": async (route) => fulfillJson(route, {
      banners: [], announcements: [], featured_pages: [], featured_faqs: [],
    }),
    "/api/products/categories/": async (route) => fulfillJson(route, []),
    "/api/products/brands/": async (route) => fulfillJson(route, []),
    "/api/products/products/": async (route) => {
      catalogRequests.push(route.request().url());
      await fulfillJson(route, { count: 0, next: null, previous: null, results: [] });
    },
  });
}

test("marketplace search submits its native GET value to the existing catalog API", async ({ page }) => {
  const requests: string[] = [];
  await mockStorefront(page, requests);
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Search marketplace" });
  await search.fill("canvas & carry");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/products\?/);
  expect(new URL(page.url()).searchParams.get("search")).toBe("canvas & carry");
  await expect(page.getByLabel("Search products", { exact: true })).toHaveValue("canvas & carry");
  await expect(page.getByRole("heading", { name: "No products match your filters" })).toBeVisible();
  expect(requests.some((url) => new URL(url).searchParams.get("search") === "canvas & carry")).toBe(true);
});

test("mobile menu Escape closes navigation and returns keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockStorefront(page);
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Open menu", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const mobile = page.getByRole("navigation", { name: "Mobile navigation" });
  await expect(mobile).toBeVisible();
  await mobile.getByRole("link", { name: "Products", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(mobile).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("skip link moves keyboard focus past the shared navigation", async ({ page }) => {
  await mockStorefront(page);
  await page.goto("/products");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

for (const width of [360, 390, 768, 1024, 1280, 1440]) {
  test(`shared storefront navigation fits a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockStorefront(page);
    await page.goto("/products");
    await expect(page.getByRole("heading", { name: "No products yet" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search marketplace" })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Cart", exact: true })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }));
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.width);
    if (width >= 1024) {
      await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Open menu", exact: true })).toBeHidden();
    } else {
      await expect(page.getByRole("button", { name: "Open menu", exact: true })).toBeVisible();
    }
  });
}

test("dark OS preference and reduced motion retain readable controls and visible keyboard focus", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await mockStorefront(page);
  await page.goto("/products");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  const focus = await skip.evaluate((element) => {
    const style = getComputedStyle(element);
    return { width: Number.parseFloat(style.outlineWidth), style: style.outlineStyle };
  });
  expect(focus.width).toBeGreaterThanOrEqual(2);
  expect(focus.style).not.toBe("none");
  const appearance = await page.getByRole("searchbox", { name: "Search marketplace" }).evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      scheme: getComputedStyle(document.documentElement).colorScheme,
      foreground: style.color,
      background: style.backgroundColor,
      transitionSeconds: Number.parseFloat(style.transitionDuration),
      reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    };
  });
  expect(appearance.scheme).toBe("light");
  expect(appearance.foreground).not.toBe(appearance.background);
  expect(appearance.reducedMotion).toBe(true);
  expect(appearance.transitionSeconds).toBeLessThanOrEqual(0.001);
});
