import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminReturns } from "../../admin-api";
import { records, page } from "../../__tests__/pagination-fixtures";
import { AdminReturnsList } from "../admin-returns-list";
vi.mock("../../admin-api", () => ({ getAdminReturns: vi.fn() }));
const get = vi.mocked(getAdminReturns);
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => {
  vi.resetAllMocks();
});
describe("admin-returns return pagination", () => {
  it("reaches records beyond 20 and explicitly scopes status filtering to the selected page", async () => {
    const user = userEvent.setup();
    get
      .mockResolvedValueOnce(page())
      .mockResolvedValueOnce(page(records.slice(20), 21, null, "?page=1"));
    render(<AdminReturnsList />);
    await screen.findByRole("link", { name: "RET-1" });
    expect(screen.getByText("21")).toBeInTheDocument();
    expect(
      screen.getByText(/filters and summaries apply to this page/i),
    ).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Status on this page" }),
      "refunded",
    );
    expect(
      screen.getByText(/no return requests on this page match/i),
    ).toBeInTheDocument();
    expect(get).toHaveBeenCalledOnce();
    await user.click(screen.getByRole("button", { name: "Next returns" }));
    await screen.findByRole("link", { name: "RET-21" });
    expect(get).toHaveBeenLastCalledWith(2, expect.any(AbortSignal));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next returns" })).toBeDisabled();
  });
  it("retries a failed later page while keeping previous navigation available", async () => {
    const user = userEvent.setup();
    get
      .mockResolvedValueOnce(page())
      .mockRejectedValueOnce(new Error("Page unavailable"))
      .mockResolvedValueOnce(page(records.slice(20), 21, null, "?page=1"));
    render(<AdminReturnsList />);
    await screen.findByRole("link", { name: "RET-1" });
    await user.click(screen.getByRole("button", { name: "Next returns" }));
    await screen.findByText("Page unavailable");
    expect(
      screen.getByRole("button", { name: "Previous returns" }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Retry returns" }));
    await screen.findByRole("link", { name: "RET-21" });
    expect(get).toHaveBeenLastCalledWith(2, expect.any(AbortSignal));
  });
  it("retires an older page response when navigating back before it completes", async () => {
    const user = userEvent.setup();
    const old = deferred<Awaited<ReturnType<typeof getAdminReturns>>>();
    get
      .mockResolvedValueOnce(page())
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(page());
    render(<AdminReturnsList />);
    await screen.findByRole("link", { name: "RET-1" });
    await user.click(screen.getByRole("button", { name: "Next returns" }));
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    await user.click(screen.getByRole("button", { name: "Previous returns" }));
    await screen.findByRole("link", { name: "RET-1" });
    await act(async () =>
      old.resolve(page(records.slice(20), 21, null, "?page=1")),
    );
    expect(screen.getByRole("link", { name: "RET-1" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "RET-21" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
  });
});
