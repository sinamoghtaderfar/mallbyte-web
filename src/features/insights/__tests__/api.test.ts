import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api/client";
import {
  findAuditRunByKey, getAdminInsights, getAuditHistory, getAuditRunDetail, getSellerInsights,
  INSIGHT_ENDPOINTS, startManualAudit,
} from "../api";

vi.mock("@/lib/api/client", () => ({
  apiClient: { get: vi.fn(), post: vi.fn() },
}));

const get = vi.mocked(apiClient.get);
const post = vi.mocked(apiClient.post);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("insights API contracts", () => {
  it("uses the same period for platform dashboard and cashflow series", async () => {
    get.mockResolvedValue({ data: {} } as never);
    await getAdminInsights("month");
    expect(get).toHaveBeenCalledWith(INSIGHT_ENDPOINTS.adminDashboard, { params: { period: "month" } });
    expect(get).toHaveBeenCalledWith(INSIGHT_ENDPOINTS.adminTimeSeries, { params: { period: "month" } });
  });

  it("requests seller-only insights without accepting a seller ID", async () => {
    get.mockResolvedValue({ data: {} } as never);
    await getSellerInsights("week");
    expect(get).toHaveBeenCalledWith(INSIGHT_ENDPOINTS.sellerDashboard, { params: { period: "week" } });
    expect(get).toHaveBeenCalledWith(INSIGHT_ENDPOINTS.sellerTimeSeries, { params: { period: "week" } });
    expect(get).toHaveBeenCalledWith(INSIGHT_ENDPOINTS.sellerProducts, { params: { period: "week", limit: 5 } });
  });

  it("uses bounded pagination for audit history", async () => {
    get.mockResolvedValue({ data: { count: 0, results: [] } } as never);
    await getAuditHistory(2, 10);
    expect(get).toHaveBeenCalledWith(INSIGHT_ENDPOINTS.auditRuns, { params: { page: 2, page_size: 10 } });
    expect(get).toHaveBeenCalledWith(INSIGHT_ENDPOINTS.auditAlerts, { params: { page: 1, page_size: 50 } });
  });

  it("opens an exact audit detail URL", async () => {
    get.mockResolvedValue({ data: { id: 42 } } as never);
    await getAuditRunDetail(42);
    expect(get).toHaveBeenCalledWith("/api/settlements/admin/monitoring/runs/42/");
  });

  it("polls the saved audit run by its exact key", async () => {
    get.mockResolvedValue({ data: { results: [{ id: 77, status: "clean" }] } } as never);
    const run = await findAuditRunByKey("manual:abc");
    expect(run?.id).toBe(77);
    expect(get).toHaveBeenCalledWith(INSIGHT_ENDPOINTS.auditRuns, {
      params: { run_key: "manual:abc", page: 1, page_size: 1 },
    });
  });

  it("runs audits through the permission-protected backend endpoint", async () => {
    post.mockResolvedValue({ data: { queued: true, run_key: "manual:key", task_id: "task-1", status: "queued" } } as never);
    const response = await startManualAudit();
    expect(response.status).toBe("queued");
    expect(post).toHaveBeenCalledWith(INSIGHT_ENDPOINTS.auditRunNow, { sample_limit: 20 });
  });
});
