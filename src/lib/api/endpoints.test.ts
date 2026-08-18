import { describe, expect, it } from "vitest";

import { API_ENDPOINTS } from "./endpoints";

describe("API endpoints", () => {
  it("defines cookie-based auth endpoints", () => {
    expect(API_ENDPOINTS.auth.otpRequest).toBe("/api/auth/otp/request/");
    expect(API_ENDPOINTS.auth.otpVerify).toBe("/api/auth/otp/verify/");
    expect(API_ENDPOINTS.auth.tokenRefresh).toBe("/api/auth/token/refresh/");
    expect(API_ENDPOINTS.auth.logout).toBe("/api/auth/logout/");
  });

  it("defines core marketplace endpoints", () => {
    expect(API_ENDPOINTS.products.products).toBe("/api/products/products/");
    expect(API_ENDPOINTS.orders.cart).toBe("/api/orders/cart/");
    expect(API_ENDPOINTS.rbac.myPermissions).toBe("/api/rbac/my-permissions/");
  });
});
