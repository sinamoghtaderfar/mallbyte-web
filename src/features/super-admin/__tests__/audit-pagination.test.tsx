import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/lib/api/client";
import { AuditLogCollection } from "../audit-log-collection";

const get = vi.spyOn(apiClient, "get");
const response = (data: unknown) => ({ data }) as AxiosResponse;
const audits = Array.from({ length: 26 }, (_, i) => ({
  id: i + 1, action: `action_${i + 1}`, admin_email: "admin@example.test",
  target_user_email: null, target_role_name: null, details: { id: i + 1 }, created_at: "2026-11-01T12:00:00Z",
}));
function page(index = 1) { return { count: 26, next: index === 1 ? "?page=2" : null, previous: index > 1 ? "?page=1" : null, results: audits.slice((index - 1) * 20, index * 20) }; }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => { get.mockReset(); get.mockImplementation(async (_url, config?: AxiosRequestConfig) => response(page(config?.params?.page))); });
afterAll(() => get.mockRestore());

describe("bounded super-admin audit history", () => {
  it("preserves all-page metadata and exposes all26 records through bounded pages", async () => {
    const user = userEvent.setup();
    render(<AuditLogCollection />);
    await screen.findByText("action_1");
    expect(screen.getByText("26 audit actions · Page 1 of 2")).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Next audit actions" }));
    await screen.findByText("action_26");
    expect(get).toHaveBeenLastCalledWith("/api/rbac/admin-logs/", expect.objectContaining({ params: { page: 2, page_size: 20 } }));
    expect(screen.queryByText("action_1")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous audit actions" }));
    await screen.findByText("action_1");
    expect(get).toHaveBeenCalledTimes(3);
  });
  it("retries the failed page without presenting rows from an earlier page", async () => {
    const user = userEvent.setup();
    get.mockResolvedValueOnce(response(page())).mockRejectedValueOnce(new Error("Audit unavailable")).mockResolvedValueOnce(response(page(2)));
    render(<AuditLogCollection />);
    await screen.findByText("action_1");
    await user.click(screen.getByRole("button", { name: "Next audit actions" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Audit unavailable");
    expect(screen.queryByText("action_1")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry audit page" }));
    await screen.findByText("action_26");
    expect(get).toHaveBeenLastCalledWith("/api/rbac/admin-logs/", expect.objectContaining({ params: { page: 2, page_size: 20 } }));
  });
  it("ignores a superseded component's response when transport ignores abort", async () => {
    const old = deferred<AxiosResponse>();
    get.mockReturnValueOnce(old.promise).mockResolvedValueOnce(response({ ...page(), results: [{ ...audits[0], action: "Current actor history" }] }));
    const { rerender } = render(<AuditLogCollection key="old-account" />);
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    rerender(<AuditLogCollection key="new-account" />);
    await screen.findByText("Current actor history");
    await act(async () => old.resolve(response(page())));
    expect(screen.getByText("Current actor history")).toBeInTheDocument();
    expect(screen.queryByText("action_1")).not.toBeInTheDocument();
  });
});
