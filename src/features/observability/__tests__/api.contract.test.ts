import { apiClient } from "@/lib/api/client";
import { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiError, observabilityAPI } from "../api";
import { alertFixture, errorFixture, healthFixture, metricsFixture, paged } from "../fixtures";

vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
const ok = (data: unknown) => ({ data } as never);
const get = vi.mocked(apiClient.get);
const post = vi.mocked(apiClient.post);
const apiFailure = (status: number, data: unknown = {}) => {
  const e = new AxiosError("request failed");
  e.response = { status, data, headers: {}, statusText: "error", config: {} as never };
  return e;
};
beforeEach(() => { get.mockReset(); post.mockReset(); });

describe("Observability API contract", () => {
  it("requests latest health snapshot", async () => {
    get.mockResolvedValue(ok(healthFixture));
    expect(await observabilityAPI.health()).toEqual(healthFixture);
    expect(get).toHaveBeenCalledWith("/api/observability/health/");
  });
  it.each(["1h", "6h", "24h", "7d"] as const)("passes safe stats window %s", async window => {
    get.mockResolvedValue(ok(metricsFixture));
    await observabilityAPI.metrics(window);
    expect(get).toHaveBeenCalledWith("/api/observability/stats/", {params:{window}});
  });
  it("loads snapshot history from first page", async () => {
    get.mockResolvedValue(ok(paged([])));
    await observabilityAPI.history();
    expect(get).toHaveBeenCalledWith("/api/observability/system-health-snapshots/", {params:{page:1}});
  });
  it("sends filtered requests without unneeded parameters", async () => {
    get.mockResolvedValue(ok(paged([])));
    await observabilityAPI.requests(3, "/api/orders", "POST");
    expect(get).toHaveBeenCalledWith("/api/observability/request-logs/", {params:{page:3,path:"/api/orders",method:"POST"}});
    await observabilityAPI.requests(1, "", "");
    expect(get).toHaveBeenLastCalledWith("/api/observability/request-logs/", {params:{page:1,path:undefined,method:undefined}});
  });
  it("requests errors with unresolved-only and severity filters", async () => {
    get.mockResolvedValue(ok(paged([errorFixture])));
    await observabilityAPI.errors(2, "critical", true);
    expect(get).toHaveBeenCalledWith("/api/observability/error-logs/", {params:{page:2,severity:"critical",is_resolved:"false"}});
  });
  it("lists paginated audit, alerts and task logs", async () => {
    get.mockResolvedValue(ok(paged([alertFixture])));
    await observabilityAPI.alerts(1,"open");
    await observabilityAPI.tasks(2,"failure");
    await observabilityAPI.audits(3);
    expect(get).toHaveBeenNthCalledWith(1,"/api/observability/alerts/",{params:{page:1,status:"open"}});
    expect(get).toHaveBeenNthCalledWith(2,"/api/observability/celery-task-logs/",{params:{page:2,status:"failure"}});
    expect(get).toHaveBeenNthCalledWith(3,"/api/observability/audit-logs/",{params:{page:3}});
  });
  it("encodes IDs before mutating alerts and errors", async () => {
    post.mockResolvedValue(ok({}));
    await observabilityAPI.alertAction("alert/a?", "acknowledge");
    await observabilityAPI.alertAction("alert/a?", "resolve");
    await observabilityAPI.resolveError("error/a?");
    expect(post).toHaveBeenNthCalledWith(1,"/api/observability/alerts/alert%2Fa%3F/acknowledge/");
    expect(post).toHaveBeenNthCalledWith(2,"/api/observability/alerts/alert%2Fa%3F/resolve/");
    expect(post).toHaveBeenNthCalledWith(3,"/api/observability/error-logs/error%2Fa%3F/resolve/");
  });
  it("creates a linked incident using only the selected error", async () => {
    post.mockResolvedValue(ok({}));
    await observabilityAPI.createIncidentFromError(errorFixture);
    expect(post).toHaveBeenCalledWith("/api/observability/incidents/",expect.objectContaining({
      source_error:errorFixture.id, severity:"critical", title:"Investigate DatabaseError",
    }));
  });
  it("does not leak server error body; handles 401/403/503/network", () => {
    expect(apiError(apiFailure(401,{message:"private"}))).toMatch(/Session expired/);
    expect(apiError(apiFailure(403,{message:"private"}))).toMatch(/Access denied/);
    expect(apiError(apiFailure(503,{message:"private"}))).toMatch(/No current health snapshot/);
    expect(apiError(apiFailure(500,{message:"private password"}))).not.toContain("private");
    expect(apiError(new Error("secret"))).not.toContain("secret");
  });
  it("truncates server detail field to 280 characters", () => {
    const e = apiFailure(400,{detail:"x".repeat(900)});
    expect(apiError(e)).toHaveLength(280);
  });
});
