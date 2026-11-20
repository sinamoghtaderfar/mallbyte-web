import { expect, test, type Page } from "@playwright/test";
import { fulfillJson, installApiMocks } from "./helpers/mock-api";

const product = {
  id: 1,
  name: "Everyday canvas carryall",
  slug: "canvas-carryall",
  main_image: "/visual-media/carryall.svg",
  price: "89.00",
  compare_price: "110.00",
  final_price: "89.00",
  brand_name: "Fieldwork",
  category_name: "Accessories",
  stock: 12,
  available_stock: 12,
  reserved_stock: 0,
  is_featured: true,
  views_count: 132,
  created_at: "2026-11-01T10:00:00Z",
  barcode: null,
  labels: ["new"],
  label_display: ["New arrival"],
};
const detail = {
  ...product,
  description: "A considered everyday carryall with reinforced handles.",
  short_description: "Made to go wherever your day takes you.",
  seller_name: "Fieldwork Studio",
  seller_email: "studio@example.test",
  category: 1,
  brand: 1,
  brand_logo: null,
  sku: "FW-CARRY-01",
  is_in_stock: true,
  is_active: true,
  status: "approved",
  low_stock_threshold: 3,
  weight: null,
  length: null,
  width: null,
  height: null,
  cost_per_item: null,
  variants: [],
  attributes: [],
  tags: [],
  average_rating: "0.0",
  reviews_count: 0,
  updated_at: "2026-11-01T10:00:00Z",
  images: Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    image: `/visual-media/view-${index + 1}.svg`,
    alt_text: `Carryall view ${index + 1}`,
    is_main: index === 1,
    order: index,
    created_at: "2026-11-01T10:00:00Z",
  })),
};
const collection = Array.from({ length: 24 }, (_, index) => ({
  ...product,
  id: index + 1,
  name:
    index === 1
      ? "Limited edition everyday carryall with thoughtfully organised compartments for work, travel and the weekend"
      : `${product.name} ${index + 1}`,
}));

async function mockStorefront(page: Page, requests: URL[] = []) {
  await installApiMocks(page, {
    "/api/content/navigation/": async (route) => fulfillJson(route, []),
    "/api/content/homepage/": async (route) =>
      fulfillJson(route, {
        banners: [],
        announcements: [],
        featured_pages: [],
        featured_faqs: [],
      }),
    "/api/products/categories/": async (route) => fulfillJson(route, []),
    "/api/products/brands/": async (route) => fulfillJson(route, []),
    "/api/products/products/": async (route) => {
      const url = new URL(route.request().url());
      requests.push(url);
      const page = Number(url.searchParams.get("page") || 1),
        size = Number(url.searchParams.get("page_size") || 20);
      await fulfillJson(route, {
        count: 24,
        next: page * size < 24 ? "?page=2" : null,
        previous: page > 1 ? "?page=1" : null,
        results: collection.slice((page - 1) * size, page * size),
      });
    },
    "/api/products/products/1/": async (route) => fulfillJson(route, detail),
    "/api/products/products/1/add_view/": async (route) =>
      fulfillJson(route, { views_count: 133 }),
    "/api/products/products/1/related/": async (route) =>
      fulfillJson(route, []),
    "/api/reviews/product-reviews/": async (route) =>
      fulfillJson(route, { count: 0, next: null, previous: null, results: [] }),
    "/api/reviews/product-reviews/summary/": async (route) =>
      fulfillJson(route, {
        product_id: 1,
        average_rating: "0.0",
        reviews_count: 0,
        rating_breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        total_approved_reviews: 0,
      }),
  });
  await page.route("http://localhost:8000/visual-media/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#f1eee8"/><rect x="220" y="160" width="360" height="320" rx="15" fill="#b9b1a0"/><path d="M300 160v-30c0-110 200-110 200 0v30" fill="none" stroke="#b9b1a0" stroke-width="24"/></svg>',
    }),
  );
}

test("mobile filters preserve drafts and server navigation without duplicating the form", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests: URL[] = [];
  await mockStorefront(page, requests);
  await page.goto("/products");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(
    page.getByText("Everyday canvas carryall 1", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Search products", { exact: true }),
  ).toBeHidden();
  const filterToggle = page.getByRole("button", {
    name: "Show filters",
    exact: true,
  });
  await filterToggle.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByLabel("Search products", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search products", { exact: true }).fill("carryall");
  await page.getByRole("button", { name: "Hide filters", exact: true }).click();
  await page.getByRole("button", { name: "Show filters", exact: true }).click();
  await expect(page.getByLabel("Search products", { exact: true })).toHaveValue(
    "carryall",
  );
  await expect(
    page.getByRole("form", { name: "Refine your search" }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "Apply filters", exact: true })
    .click();
  await expect(page).toHaveURL(/search=carryall/);
  await page.getByRole("button", { name: "Hide filters", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByText("Everyday canvas carryall 21", { exact: true }),
  ).toBeVisible();
  expect(
    requests.some(
      (url) =>
        url.searchParams.get("page") === "2" &&
        url.searchParams.get("search") === "carryall",
    ),
  ).toBe(true);
  await page.goBack();
  await expect(
    page.getByText("Everyday canvas carryall 1", { exact: true }),
  ).toBeVisible();
});

test("all product gallery images are keyboard reachable with an announced current view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await mockStorefront(page);
  await page.goto("/products/1");
  const gallery = page.getByRole("region", {
    name: "Everyday canvas carryall images",
  });
  await expect(
    gallery.getByRole("img", { name: "Carryall view 2", exact: true }),
  ).toBeVisible();
  await expect(gallery.getByRole("button")).toHaveCount(6);
  const last = gallery.getByRole("button", {
    name: "View image 6 of Everyday canvas carryall",
  });
  await last.focus();
  await page.keyboard.press("Enter");
  await expect(last).toHaveAttribute("aria-pressed", "true");
  await expect(
    gallery.getByRole("img", { name: "Carryall view 6", exact: true }),
  ).toBeVisible();
  await expect(gallery.getByText("Image 6 of 6")).toHaveAttribute(
    "aria-live",
    "polite",
  );
});

test("homepage collection discovery uses the existing catalog label contract", async ({
  page,
}) => {
  const requests: URL[] = [];
  await mockStorefront(page, requests);
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Discover collections" })
    .getByRole("link", { name: /Bestsellers/ })
    .click();
  await expect(page).toHaveURL(/label=bestseller/);
  await expect(
    page.getByText("Everyday canvas carryall 1", { exact: true }),
  ).toBeVisible();
  expect(
    requests.some((url) => url.searchParams.get("label") === "bestseller"),
  ).toBe(true);
});

for (const width of [360, 390, 768, 1024, 1280, 1440]) {
  test(`populated catalog and long product titles fit a ${width}px viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockStorefront(page);
    await page.goto("/products");
    await expect(
      page.getByText("Everyday canvas carryall 1", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    if (width < 1024) {
      await page
        .getByRole("button", { name: "Show filters", exact: true })
        .click();
      await expect(
        page.getByLabel("Search products", { exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
    } else {
      await expect(
        page.getByLabel("Search products", { exact: true }),
      ).toBeVisible();
    }
  });
}
