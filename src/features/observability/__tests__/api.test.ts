import { apiClient } from "@/lib/api/client";
import { AxiosError } from "axios";
import { describe, expect, it, vi } from "vitest";
import { apiError, listPage } from "../api";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

describe("Observability API client", () => {
  it("uses a fixed first-party endpoint and local page params", async () => {
    const result = { count:0, next:null, previous:null, results:[] };
    vi.mocked(apiClient.get).mockResolvedValueOnce({data: result} as never);
    expect(await listPage("alerts",{page:2,status:"open"})).toEqual(result);
    expect(apiClient.get).toHaveBeenCalledWith("/api/observability/alerts/",{params:{page:2,status:"open"}});
  });
  it("does not expose arbitrary HTTP error bodies", () => {
    const error = new AxiosError("error");
    error.response = {data:{message:"secret token"},status:500,statusText:"Error",headers:{},config:{} as never};
    expect(apiError(error)).toBe("Request failed (500).");
  });
  it("provides a clear permission error", () => {
    const error = new AxiosError("forbidden");
    error.response = {data:{},status:403,statusText:"Forbidden",headers:{},config:{} as never};
    expect(apiError(error)).toMatch(/Access denied/);
  });
});
