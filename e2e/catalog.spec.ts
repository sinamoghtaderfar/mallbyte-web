import { expect, test } from "@playwright/test";
import { fulfillJson, installApiMocks } from "./helpers/mock-api";

const product = (id: number, name: string) => ({
  id, name, slug: "test-keyboard", main_image: null, price: "50.00",
  compare_price: null, final_price: "50.00", brand_name: "MallByte",
  category_name: "Accessories", stock: 10, available_stock: 10,
  reserved_stock: 0, is_featured: false, views_count: 1,
  created_at: "2026-11-01T10:00:00Z", barcode: null,
  labels: [], label_display: [],
});

test("shared catalog URLs restore filters and page number", async ({ page }) => {
  const requested: string[] = [];
  await installApiMocks(page, {
    "/api/products/categories/": async route => fulfillJson(route, []),
    "/api/products/brands/": async route => fulfillJson(route, []),
    "/api/products/products/": async route => {
      const uri = new URL(route.request().url());
      requested.push(uri.search);
      const isSecondPage = uri.searchParams.get("page") === "2";
      await fulfillJson(route, {
        count: 24,
        next: isSecondPage ? null : `/api/products/products/?page=2`,
        previous: isSecondPage ? `/api/products/products/?page=1` : null,
        results: [product(isSecondPage ? 2 : 1, isSecondPage ? "Second Page Keyboard" : "First Page Keyboard")],
      });
    },
  });

  await page.goto("/products?search=keyboard&page=2&page_size=12");
  await expect(page.getByText("Second Page Keyboard")).toBeVisible();
  await expect(page.getByLabel("Search products")).toHaveValue("keyboard");
  await expect(page.getByText(/Page 2 of 2/)).toBeVisible();
  expect(requested.some(s => s.includes("search=keyboard") && s.includes("page=2") && s.includes("page_size=12"))).toBeTruthy();

  await page.getByRole("button", { name: "Previous" }).click();
  await expect(page).toHaveURL(/search=keyboard/);
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.getByText("First Page Keyboard")).toBeVisible();
  await page.goBack();
  await expect(page.getByText("Second Page Keyboard")).toBeVisible();
});

test("inverted price range is rejected before calling the catalog API again", async ({ page }) => {
  let catalogCalls = 0;
  await installApiMocks(page, {
    "/api/products/categories/": async route => fulfillJson(route, []),
    "/api/products/brands/": async route => fulfillJson(route, []),
    "/api/products/products/": async route => {
      catalogCalls += 1;
      await fulfillJson(route, { count: 0, next: null, previous: null, results: [] });
    },
  });
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Products", exact: true })).toBeVisible();
  // Wait for the initial catalog response before measuring no-extra-request behavior.
  await expect.poll(() => catalogCalls).toBe(1);
  await page.getByLabel(/min price/i).fill("200");
  await page.getByLabel(/max price/i).fill("100");
  await page.getByRole("button", { name: /apply filters/i }).click();
  await expect(page.getByText(/minimum price cannot exceed maximum price/i)).toBeVisible();
  expect(catalogCalls).toBe(1);
});
