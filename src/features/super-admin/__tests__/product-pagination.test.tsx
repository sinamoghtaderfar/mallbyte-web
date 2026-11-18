import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/auth-store";
import { apiClient } from "@/lib/api/client";
import { SuperAdminConsole } from "../super-admin-console";

const get = vi.spyOn(apiClient, "get");
const post = vi.spyOn(apiClient, "post");
const response = (data: unknown) => ({ data }) as AxiosResponse;
const products = Array.from({ length: 21 }, (_, i) => ({
  id: i + 1,
  name: `Product ${i + 1}`,
  sku: `SKU-${i + 1}`,
  status: "pending",
  seller_email: "seller@example.test",
  is_active: true,
}));
const audits = Array.from({ length: 26 }, (_, i) => ({
  id: i + 1,
  action: `action_${i + 1}`,
  admin_email: "admin@example.test",
  target_user_email: null,
  target_role_name: null,
  details: { id: i + 1 },
  created_at: "2026-11-01T12:00:00Z",
}));
const users = Array.from({ length: 21 }, (_, i) => ({
  id: i + 1,
  email: `user${i + 1}@example.test`,
  full_name: `User ${i + 1}`,
  phone: null,
  is_active: true,
  is_staff: false,
  is_superuser: false,
  is_seller: false,
  email_verified: true,
  date_joined: "2026-11-01T12:00:00Z",
  roles: [],
}));
const roles = Array.from({ length: 21 }, (_, i) => ({
  id: i + 1,
  name: `role_${i + 1}`,
  description: "",
  level: 10,
  is_system_role: false,
  permissions: ["products.view"],
  permissions_count: 1,
}));
const permissions = Array.from({ length: 21 }, (_, i) => ({
  id: i + 1,
  name: `Permission ${i + 1}`,
  codename: `permission_${i + 1}`,
  module: "products",
}));
function page<T>(items: T[], page = 1) {
  return {
    count: items.length,
    next: page * 20 < items.length ? `?page=${page + 1}` : null,
    previous: page > 1 ? `?page=${page - 1}` : null,
    results: items.slice((page - 1) * 20, page * 20),
  };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
let handler: (
  url: string,
  config?: AxiosRequestConfig,
) => Promise<AxiosResponse>;
beforeEach(() => {
  get.mockReset();
  post.mockReset();
  useAuthStore.setState({
    user: {
      id: 100,
      email: "root@example.test",
      full_name: "Root",
      phone: null,
      is_superuser: true,
      is_staff: true,
      is_seller: false,
      email_verified: true,
    },
    isAuthenticated: true,
    isBootstrapped: true,
    isLoading: false,
  });
  handler = async (url, config) => {
    if (url.endsWith("/overview/"))
      return response({
        users: 21,
        active_users: 21,
        sellers: 0,
        pending_sellers: 0,
        products: 21,
        pending_products: 21,
        orders: 0,
        open_tickets: 0,
        roles: 21,
        recent_admin_actions: 26,
      });
    if (url.endsWith("/role-catalog/")) return response({ roles, permissions });
    if (url.endsWith("/products/"))
      return response(
        page(
          config?.params?.status === "approved"
            ? [
                {
                  ...products[20],
                  name: "Approved product",
                  status: "approved",
                },
              ]
            : products,
          config?.params?.page,
        ),
      );
    if (url.endsWith("/admin-logs/"))
      return response(page(audits, config?.params?.page));
    if (url.endsWith("/users/"))
      return response(
        page(
          config?.params?.search ? users.slice(20) : users,
          config?.params?.page,
        ),
      );
    throw new Error(`Unexpected endpoint ${url}`);
  };
  get.mockImplementation((url, config) => handler(url, config));
});
afterAll(() => {
  get.mockRestore();
  post.mockRestore();
});
async function open(tab: string) {
  const user = userEvent.setup();
  render(<SuperAdminConsole />);
  await waitFor(() =>
    expect(get).toHaveBeenCalledWith(
      "/api/rbac/console/overview/",
      ),
  );
  await user.click(screen.getByRole("button", { name: tab }));
  return user;
}

describe("super-admin product collection", () => {
  it("browses products beyond20 with metadata and resets the supported status filter to page1", async () => {
    const user = await open("Product review");
    await screen.findByRole("heading", { name: "Product 1" });
    expect(
      screen.getByText("21 matching products · Page 1 of 2"),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Next matching products" }),
    );
    await screen.findByRole("heading", { name: "Product 21" });
    expect(get).toHaveBeenLastCalledWith(
      "/api/rbac/console/products/",
      expect.objectContaining({
        params: { page: 2, page_size: 20, status: "pending" },
      }),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Status" }),
      "approved",
    );
    await screen.findByRole("heading", { name: "Approved product" });
    expect(get).toHaveBeenLastCalledWith(
      "/api/rbac/console/products/",
      expect.objectContaining({
        params: { page: 1, page_size: 20, status: "approved" },
      }),
    );
    expect(
      screen.getByText("1 matching products · Page 1 of 1"),
    ).toBeInTheDocument();
  });
  it("retains user pagination and searches the server from page1", async () => {
    const user = await open("Users");
    await screen.findByText("user1@example.test");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("user21@example.test");
    expect(get).toHaveBeenLastCalledWith(
      "/api/rbac/console/users/",
      expect.objectContaining({
        params: { page: 2, search: "" },
      }),
    );
    await user.type(
      screen.getByPlaceholderText("Search by email or name"),
      "user21",
    );
    await user.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith(
        "/api/rbac/console/users/",
        expect.objectContaining({
          params: { page: 1, search: "user21" },
        }),
      ),
    );
    await screen.findByText("user21@example.test");
    expect(screen.getByText("1 users • Page 1")).toBeInTheDocument();
  });
  it("ignores an older product query even when transport ignores abort", async () => {
    const pending = deferred<AxiosResponse>();
    const normal = handler;
    handler = (url, config) =>
      url.endsWith("/products/") && config?.params?.status === "pending"
        ? pending.promise
        : normal(url, config);
    const user = await open("Product review");
    await waitFor(() =>
      expect(get).toHaveBeenCalledWith(
        "/api/rbac/console/products/",
        expect.anything(),
      ),
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Status" }),
      "approved",
    );
    await screen.findByRole("heading", { name: "Approved product" });
    await act(async () => pending.resolve(response(page(products))));
    expect(
      screen.getByRole("heading", { name: "Approved product" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Product 1" }),
    ).not.toBeInTheDocument();
  });
  it("preserves complete unpaginated role and permission catalogs beyond20", async () => {
    await open("Roles & permissions");
    await screen.findByRole("option", { name: "products / permission_21" });
    expect(screen.getAllByRole("option", { name: "role_21" })).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "role_21" }),
    ).toBeInTheDocument();
    expect(
      get.mock.calls.filter(([url]) => url.endsWith("/role-catalog/")),
    ).toHaveLength(1);
  });
  it("returns product moderation to page1 after the final record moves out of its filter", async () => {
    const user = await open("Product review");
    await screen.findByRole("heading", { name: "Product 1" });
    await user.click(
      screen.getByRole("button", { name: "Next matching products" }),
    );
    await screen.findByRole("heading", { name: "Product 21" });
    post.mockImplementation(async () => {
      const normal = handler;
      handler = (url, config) =>
        url.endsWith("/products/")
          ? Promise.resolve(
              response(page(products.slice(0, 20), config?.params?.page)),
            )
          : normal(url, config);
      return response({ message: "Product approved" });
    });
    await user.click(screen.getByRole("button", { name: "Approve" }));
    await screen.findByRole("heading", { name: "Product 1" });
    expect(post).toHaveBeenCalledWith("/api/products/products/21/approve/");
    expect(get).toHaveBeenLastCalledWith(
      "/api/rbac/console/products/",
      expect.objectContaining({
        params: { page: 1, page_size: 20, status: "pending" },
      }),
    );
    expect(
      screen.getByText("20 matching products · Page 1 of 1"),
    ).toBeInTheDocument();
  });
  it("retries a failed product page with the same supported server query", async () => {
    let attempts = 0;
    const normal = handler;
    handler = (url, config) => {
      if (url.endsWith("/products/") && config?.params?.page === 2 && attempts++ === 0) return Promise.reject(new Error("Moderation unavailable"));
      return normal(url, config);
    };
    const user = await open("Product review");
    await screen.findByRole("heading", { name: "Product 1" });
    await user.click(screen.getByRole("button", { name: "Next matching products" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Moderation unavailable");
    expect(screen.queryByRole("heading", { name: "Product 1" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry products" }));
    await screen.findByRole("heading", { name: "Product 21" });
    expect(get).toHaveBeenLastCalledWith("/api/rbac/console/products/", expect.objectContaining({ params: { page: 2, page_size: 20, status: "pending" } }));
  });

});
