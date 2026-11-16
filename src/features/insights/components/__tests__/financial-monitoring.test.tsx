import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAuditHistory, getAuditRunDetail } from "../../api";
import type { AuditRun, AuditRunDetail } from "../../types";
import { FinancialMonitoring } from "../financial-monitoring";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/monitoring" }));
vi.mock("@/features/auth/auth-store", () => ({
  useAuthStore: (select: (state: { user: { id: number } }) => unknown) => select({ user: { id: 1 } }),
}));
vi.mock("@/features/rbac/api", () => ({
  getMyPermissions: vi.fn().mockResolvedValue({ user_id: 1, permissions: [] }),
}));
vi.mock("../../api", () => ({
  getAuditHistory: vi.fn(),
  getAuditRunDetail: vi.fn(),
  findAuditRunByKey: vi.fn(),
  startManualAudit: vi.fn(),
}));

const getHistory = vi.mocked(getAuditHistory);
const getDetail = vi.mocked(getAuditRunDetail);
function run(id: number): AuditRun {
  return { id, run_key: `run-${id}`, source: "manual", status: "clean", findings_count: 0,
    created_at: "2026-10-01T12:00:00Z", finished_at: "2026-10-01T12:01:00Z" };
}
function detail(id: number, error = ""): AuditRunDetail {
  return { ...run(id), error, summary: {} };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
async function openHistory() {
  render(<FinancialMonitoring />);
  await screen.findByRole("button", { name: "Inspect audit 1" });
}

describe("financial audit detail inspection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getHistory.mockResolvedValue({
      runs: { count: 2, page: 1, page_size: 10, results: [run(1), run(2)] },
      alerts: { count: 0, page: 1, page_size: 10, results: [] },
    });
    getDetail.mockResolvedValue(detail(1));
  });

  it("finishes re-inspecting the same loaded audit with fresh details", async () => {
    const user = userEvent.setup();
    await openHistory();
    await user.click(screen.getByRole("button", { name: "Inspect audit 1" }));
    await screen.findByText("Run #1");
    getDetail.mockResolvedValueOnce(detail(1, "Updated audit detail"));
    await user.click(screen.getByRole("button", { name: "Inspect audit 1" }));
    expect(await screen.findByText("Audit failed: Updated audit detail")).toBeInTheDocument();
    expect(getDetail).toHaveBeenCalledTimes(2);
    expect(screen.queryByText("Loading run details…")).not.toBeInTheDocument();
  });

  it("can retry a failed inspection of the same run", async () => {
    const user = userEvent.setup();
    getDetail.mockRejectedValueOnce(new Error("Audit detail unavailable"));
    await openHistory();
    await user.click(screen.getByRole("button", { name: "Inspect audit 1" }));
    await screen.findByText(/Audit detail unavailable/);
    await user.click(screen.getByRole("button", { name: "Retry audit details" }));
    expect(await screen.findByText("Run #1")).toBeInTheDocument();
    expect(getDetail).toHaveBeenCalledTimes(2);
  });

  it("does not replace a repeated inspection with an older result", async () => {
    const user = userEvent.setup();
    const old = deferred<AuditRunDetail>();
    const current = deferred<AuditRunDetail>();
    getDetail.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    await openHistory();
    await user.click(screen.getByRole("button", { name: "Inspect audit 1" }));
    await user.click(screen.getByRole("button", { name: "Inspect audit 1" }));
    expect(getDetail).toHaveBeenCalledTimes(2);
    await act(async () => current.resolve(detail(1, "New result")));
    expect(screen.getByText("Audit failed: New result")).toBeInTheDocument();
    await act(async () => old.resolve(detail(1, "Old result")));
    expect(screen.queryByText("Audit failed: Old result")).not.toBeInTheDocument();
    expect(screen.getByText("Audit failed: New result")).toBeInTheDocument();
  });

  it("retires pending detail requests when switching runs or closing the panel", async () => {
    const user = userEvent.setup();
    const first = deferred<AuditRunDetail>();
    const second = deferred<AuditRunDetail>();
    getDetail.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await openHistory();
    await user.click(screen.getByRole("button", { name: "Inspect audit 1" }));
    await user.click(screen.getByRole("button", { name: "Inspect audit 2" }));
    await act(async () => first.resolve(detail(1)));
    expect(screen.queryByText("Run #1")).not.toBeInTheDocument();
    expect(screen.getByText("Loading run details…")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close" }));
    await act(async () => second.resolve(detail(2)));
    await waitFor(() => expect(screen.queryByText("Selected audit run")).not.toBeInTheDocument());
    expect(screen.queryByText("Run #2")).not.toBeInTheDocument();
  });
});
