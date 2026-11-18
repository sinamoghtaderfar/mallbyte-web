import { StrictMode } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/auth-store";
import { clearSession } from "@/lib/auth/session-storage";
import { getReturnsPage } from "../../api";
import type { ReturnListItem } from "../../types";
import { OrderReturnBadge, OrderReturnStatusCard } from "../order-return-badge";
import { OrderReturnHistory } from "../order-return-history";

vi.mock("../../api", () => ({ getReturnsPage: vi.fn(), getReturns: vi.fn(), getReturnRequest: vi.fn() }));
const getPage = vi.mocked(getReturnsPage);
const returns: ReturnListItem[] = Array.from({ length: 21 }, (_, i) => ({
  id: i + 1, order: i + 1, order_number: `ORDER-${i + 1}`, request_number: `RETURN-${i + 1}`,
  customer: "Customer", status: "approved", reason: "damaged", requested_resolution: "refund", refund_method: "original_payment",
  total_requested_amount: "100", total_approved_amount: "100", created_at: "2026-11-01T12:00:00Z", updated_at: "2026-11-01T12:00:00Z",
}));
function page(index = 1) { return { count: 21, next: index === 1 ? "?page=2" : null, previous: index === 2 ? "?page=1" : null, results: returns.slice((index - 1) * 20, index * 20) }; }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
function Badges() { return <>{Array.from({ length: 21 }, (_, i) => <div key={i} data-testid={`order-${i + 1}`}><OrderReturnBadge orderId={i + 1} orderNumber={`ORDER-${i + 1}`} showLink /></div>)}</>; }
beforeEach(() => {
  clearSession();
  getPage.mockReset();
  getPage.mockImplementation(async (index) => page(index));
  useAuthStore.setState({ isAuthenticated: true, isBootstrapped: true, user: { id: 1, email: "first@example.test", full_name: "First", phone: null, is_seller: false, is_staff: false, is_superuser: false, email_verified: true } });
});

describe("shared bounded order return history", () => {
  it("shares one bounded request across21badges and only checks the next page on explicit action", async () => {
    const user = userEvent.setup();
    render(<OrderReturnHistory><Badges /></OrderReturnHistory>);
    await waitFor(() => expect(screen.getAllByRole("link", { name: "Return approved" })).toHaveLength(20));
    expect(getPage).toHaveBeenCalledTimes(1);
    expect(getPage).toHaveBeenLastCalledWith(1, expect.any(AbortSignal));
    expect(within(screen.getByTestId("order-21")).queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/More return history has not been checked/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Check more return history" }));
    expect(await within(screen.getByTestId("order-21")).findByRole("link", { name: "Return approved" })).toHaveAttribute("href", "/returns/21");
    expect(getPage).toHaveBeenCalledTimes(2);
    expect(getPage).toHaveBeenLastCalledWith(2, expect.any(AbortSignal));
    expect(screen.queryByRole("button", { name: "Check more return history" })).not.toBeInTheDocument();
  });

  it("shares badge/card results and updates the correct order when later history has a higher-priority request", async () => {
    const user = userEvent.setup();
    getPage.mockResolvedValueOnce({ ...page(), results: [{ ...returns[0], status: "refunded" }] }).mockResolvedValueOnce({ ...page(2), results: [{ ...returns[20], order: 1, order_number: "ORDER-1", status: "refund_pending" }] });
    render(<OrderReturnHistory><OrderReturnBadge orderId={1} showLink /><OrderReturnStatusCard orderId={1} /><OrderReturnBadge orderId={99} /></OrderReturnHistory>);
    await screen.findByRole("link", { name: "Refunded" });
    expect(getPage).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Check more return history" }));
    expect(await screen.findByRole("link", { name: "Refund pending" })).toHaveAttribute("href", "/returns/21");
    expect(screen.getByRole("heading", { name: "Refund pending" })).toBeInTheDocument();
    expect(screen.queryByText("Refunded")).not.toBeInTheDocument();
  });

  it("shows one shared failure and retries only the failed page, retaining previously checked statuses", async () => {
    const user = userEvent.setup();
    getPage.mockResolvedValueOnce(page()).mockRejectedValueOnce(new Error("History offline")).mockResolvedValueOnce(page(2));
    render(<OrderReturnHistory><Badges /></OrderReturnHistory>);
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(20));
    await user.click(screen.getByRole("button", { name: "Check more return history" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("History offline");
    expect(getPage).toHaveBeenCalledTimes(2);
    expect(screen.getAllByRole("link")).toHaveLength(20);
    await user.click(screen.getByRole("button", { name: "Retry return history" }));
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(21));
    expect(getPage).toHaveBeenLastCalledWith(2, expect.any(AbortSignal));
    expect(getPage).toHaveBeenCalledTimes(3);
  });

  it("does not retry an initial failure for every mounted badge", async () => {
    const user = userEvent.setup();
    getPage.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(page());
    render(<OrderReturnHistory><Badges /></OrderReturnHistory>);
    await screen.findByRole("alert");
    expect(getPage).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Retry return history" }));
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(20));
    expect(getPage).toHaveBeenCalledTimes(2);
  });

  it("discards the previous session's delayed history after account turnover", async () => {
    const old = deferred<Awaited<ReturnType<typeof getReturnsPage>>>();
    getPage.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ count: 1, next: null, previous: null, results: [{ ...returns[0], status: "rejected" }] });
    render(<OrderReturnHistory><OrderReturnBadge orderId={1} showLink /></OrderReturnHistory>);
    await waitFor(() => expect(getPage).toHaveBeenCalledTimes(1));
    await act(async () => useAuthStore.setState({ user: { ...useAuthStore.getState().user!, id: 2, email: "next@example.test" } }));
    await screen.findByRole("link", { name: "Return rejected" });
    await act(async () => old.resolve(page()));
    expect(screen.getByRole("link", { name: "Return rejected" })).toBeInTheDocument();
    expect(screen.queryByText("Return approved")).not.toBeInTheDocument();
  });

  it("recovers after StrictMode effect cleanup without one request per badge", async () => {
    render(<StrictMode><OrderReturnHistory><Badges /></OrderReturnHistory></StrictMode>);
    await waitFor(() => expect(screen.getAllByRole("link")).toHaveLength(20));
    expect(getPage.mock.calls.length).toBeLessThanOrEqual(2);
    expect(screen.getByRole("button", { name: "Check more return history" })).toBeEnabled();
  });
});
