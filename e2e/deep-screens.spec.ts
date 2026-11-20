import { expect, test, type Page, type Route } from "@playwright/test";

import { fulfillJson } from "./helpers/mock-api";

/**
 * Renders the operational "deep" screens against mocked API data at phone,
 * tablet and desktop widths. Each run asserts the screen's main heading and
 * that the document never scrolls horizontally (wide tables must scroll inside
 * their own frame). Set CAPTURE_UI_EVIDENCE=1 to also write screenshots to
 * docs/ui-evidence/phase4/.
 */

const API = "http://localhost:8000";
const CORS = {
  "access-control-allow-origin": "http://127.0.0.1:3000",
  "access-control-allow-credentials": "true",
  "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "access-control-allow-headers": "authorization,content-type",
};
const NOW = "2026-11-18T10:24:00Z";
const EARLIER = "2026-11-16T08:05:00Z";

const admin = {
  id: 101, email: "admin@example.test", phone: null, full_name: "Avery Admin",
  is_seller: false, is_staff: true, is_superuser: true, email_verified: true,
};
const customer = {
  id: 7, email: "customer@example.test", phone: null, full_name: "Casey Customer",
  is_seller: false, is_staff: false, is_superuser: false, email_verified: true,
};

const paged = <T,>(results: T[]) => ({ count: results.length, next: null, previous: null, results });

const supportTicket = {
  id: 41, ticket_number: "SUP-20261116-7QK2", customer: 7, customer_display: "Casey Customer",
  assigned_to: 101, assigned_to_display: "Avery Admin", subject: "Parcel shows delivered but has not arrived",
  category: "shipping", priority: "high", status: "pending", order: 12, product: null, return_request: null,
  last_message_at: NOW, resolved_at: null, closed_at: null, created_at: EARLIER, updated_at: NOW,
  tags: [], tags_detail: [], attachments: [],
  messages: [
    { id: 1, ticket: 41, sender: 7, sender_display: "Casey Customer", is_internal_note: false, created_at: EARLIER, updated_at: EARLIER,
      message: "Tracking says the parcel was delivered on Monday, but nothing reached my door or the building reception." },
    { id: 2, ticket: 41, sender: 101, sender_display: "Avery Admin", is_internal_note: false, created_at: NOW, updated_at: NOW,
      message: "Thanks for the details. We opened a trace with the carrier and will update you within two business days." },
  ],
};

const fixtures: Record<string, unknown> = {
  "/api/content/navigation/": [],
  "/api/orders/cart/": { id: 1, user: 7, items: [], total_items: 0, subtotal: "0" },
  "/api/notifications/unread-count/": { unread_count: 2 },
  "/api/rbac/console/overview/": {
    users: 1284, active_users: 1197, sellers: 64, pending_sellers: 3, products: 2310,
    pending_products: 12, orders: 5821, open_tickets: 9, roles: 11, recent_admin_actions: 48,
  },
  "/api/content/pages/": paged([
    { id: 1, slug: "about", title: "About MallByte", page_type: "about", status: "published", is_visible: true, updated_at: NOW },
    { id: 2, slug: "returns-policy", title: "Returns policy", page_type: "terms", status: "draft", is_visible: false, updated_at: EARLIER },
    { id: 3, slug: "privacy", title: "Privacy notice", page_type: "privacy", status: "published", is_visible: true, updated_at: EARLIER },
  ]),
  "/api/notifications/": paged([
    { id: 1, user: customer.email, title: "Your order has shipped", message: "Order ORD-20261114-A1 is on its way with DHL. Track it from your order page.",
      notification_type: "shipment", channel: "in_app", priority: "normal", is_read: false, read_at: null,
      related_object_type: "order", related_object_id: "12", action_url: "/orders/12", created_at: NOW },
    { id: 2, user: customer.email, title: "Refund approved", message: "Your return RET-20261102-9 was approved. The refund goes back to the original payment method.",
      notification_type: "return", channel: "in_app", priority: "high", is_read: false, read_at: null,
      related_object_type: "return", related_object_id: "9", action_url: "/returns/9", created_at: EARLIER },
    { id: 3, user: customer.email, title: "Payment received", message: "We received your payment for order ORD-20261101-C4.",
      notification_type: "payment", channel: "in_app", priority: "normal", is_read: true, read_at: EARLIER,
      related_object_type: "order", related_object_id: "8", action_url: "/orders/8", created_at: EARLIER },
  ]),
  "/api/support/tickets/": paged([supportTicket]),
  "/api/support/tickets/41/": supportTicket,
  "/api/support/tickets/summary/": {
    status: { total: 3, open: 1, pending: 1, resolved: 1, closed: 0 },
    priority: { low: 0, normal: 2, high: 1, urgent: 0 },
    category: { order: 1, payment: 0, shipping: 1, return_ticket: 1, product: 0, account: 0, other: 0 },
    assigned_to_me: 0, unassigned: 1,
  },
  "/api/settlements/admin/monitoring/runs/": {
    count: 3, page: 1, page_size: 10, next: null, previous: null,
    results: [
      { id: 31, run_key: "r31", source: "scheduled", status: "warnings", findings_count: 2, created_at: NOW, finished_at: NOW },
      { id: 30, run_key: "r30", source: "manual", status: "clean", findings_count: 0, created_at: EARLIER, finished_at: EARLIER },
      { id: 29, run_key: "r29", source: "scheduled", status: "clean", findings_count: 0, created_at: EARLIER, finished_at: EARLIER },
    ],
  },
  "/api/settlements/admin/monitoring/alerts/": {
    count: 1, page: 1, page_size: 10, next: null, previous: null,
    results: [{ code: "captured_without_ledger_credit", findings_count: 2, sample: {}, first_seen_at: EARLIER, last_seen_at: NOW, last_run_id: 31 }],
  },
  "/api/shipping/shipments/5/": {
    id: 5, shipment_number: "SHP-20261117-4F2A", order: 12, order_number: "ORD-20261114-A1", user_email: customer.email,
    seller: 3, seller_name: "Northwind Audio", seller_status: "processing", status: "in_transit", status_display: "In transit",
    carrier: "dhl", carrier_display: "DHL", shipping_cost: "4.90", tracking_number: "JD014600006281234", tracking_url: "https://example.test/track",
    receiver_name: "Casey Customer", receiver_phone: "+49 30 1234567", province: "Berlin", city: "Berlin", postal_code: "10115",
    address: "Invalidenstraße 117, 3rd floor", notes: "", shipped_at: EARLIER, delivered_at: null, cancelled_at: null,
    created_at: EARLIER, updated_at: NOW,
    events: [
      { id: 1, old_status: "", new_status: "pending", message: "Shipment created from paid order.", created_by_name: "System", created_at: EARLIER },
      { id: 2, old_status: "pending", new_status: "shipped", message: "Handed to DHL.", created_by_name: "Avery Admin", created_at: EARLIER },
      { id: 3, old_status: "shipped", new_status: "in_transit", message: "", created_by_name: "Avery Admin", created_at: NOW },
    ],
  },
};

const ALL_PERMISSIONS = [
  "view_platform_analytics", "manage_analytics_reports", "view_content_drafts", "manage_content", "publish_content",
];

async function mockApi(target: Page, user: typeof admin | typeof customer) {
  await target.route(`${API}/api/**`, async (route: Route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const path = new URL(request.url()).pathname;
    if (path === "/api/auth/token/refresh/") return fulfillJson(route, { access: "deep-screen-access" });
    if (path === "/api/auth/profile/") return fulfillJson(route, { user });
    if (path === "/api/rbac/my-permissions/") return fulfillJson(route, { user_id: user.id, permissions: user.is_superuser ? ALL_PERMISSIONS : [] });
    if (path in fixtures) return fulfillJson(route, fixtures[path]);
    if (request.method() !== "GET") return fulfillJson(route, { detail: `Unmocked write: ${path}` }, 503);
    // Unlisted reads resolve to an empty page so optional panels render their empty state.
    return fulfillJson(route, paged([]));
  });
}

const screens = [
  { name: "super-admin", path: "/admin/super", user: admin, heading: "Super Admin Console" },
  { name: "cms", path: "/admin/content", user: admin, heading: "Content management" },
  { name: "audit-monitoring", path: "/admin/monitoring", user: admin, heading: "Audit monitoring" },
  { name: "shipment-detail", path: "/admin/shipments/5", user: admin, heading: "SHP-20261117-4F2A" },
  { name: "support", path: "/support", user: customer, heading: "Customer support" },
  { name: "notifications", path: "/notifications", user: customer, heading: "Notifications" },
] as const;

const viewports = [
  { label: "390", width: 390, height: 844 },
  { label: "834", width: 834, height: 1112 },
  { label: "1440", width: 1440, height: 960 },
];

for (const screen of screens) {
  for (const viewport of viewports) {
    test(`${screen.name} renders without page overflow at ${viewport.label}px`, async ({ page })  => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await mockApi(page, screen.user);
      await page.goto(screen.path);
      await expect(page.getByRole("heading", { level: 1, name: screen.heading })).toBeVisible();
      if (screen.name === "support") {
        await page.getByRole("button", { name: /Parcel shows delivered/ }).click();
        await expect(page.getByRole("heading", { name: "Parcel shows delivered but has not arrived" })).toBeVisible();
      }
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, "page should not scroll horizontally").toBeLessThanOrEqual(1);
      if (process.env.CAPTURE_UI_EVIDENCE) {
        // Hide the Next.js development indicator so captures show only the application.
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
        await page.screenshot({
          path: `docs/ui-evidence/phase4/${screen.name}-${viewport.label}.jpg`,
          type: "jpeg", quality: 82, fullPage: false,
        });
      }
    });
  }
}
