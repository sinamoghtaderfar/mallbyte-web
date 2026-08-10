import { describe, expect, it } from "vitest";

import { apiClient } from "./client";

describe("api client", () => {
  it("uses the backend base URL", () => {
    expect(apiClient.defaults.baseURL).toBe("http://localhost:8000");
  });

  it("sends credentials for refresh cookie support", () => {
    expect(apiClient.defaults.withCredentials).toBe(true);
  });

  it("uses json content type by default", () => {
    expect(apiClient.defaults.headers["Content-Type"]).toBe("application/json");
  });
});