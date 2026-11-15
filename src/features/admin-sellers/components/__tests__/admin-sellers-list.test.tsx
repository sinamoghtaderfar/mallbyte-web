import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminSellers } from "../../api";
import { makeSeller } from "../../__tests__/fixtures";
import { AdminSellersList } from "../admin-sellers-list";
vi.mock("../../api", () => ({ getAdminSellers: vi.fn() }));
const get = vi.mocked(getAdminSellers);
const records = Array.from({ length: 21 }, (_, i) =>
  makeSeller({
    id: i + 1,
    store_name: `Store ${i + 1}`,
    status: i === 20 ? "approved" : "pending",
  }),
);
const page = (
  results = records.slice(0, 20),
  count = 21,
  next: string | null = "?page=2",
  previous: string | null = null,
) => ({ results, count, next, previous });
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
describe("admin seller pages", () => {
  it("browses more than 20 sellers and filters the whole server dataset from page one", async () => {
    const user = userEvent.setup();
    get
      .mockResolvedValueOnce(page())
      .mockResolvedValueOnce(page(records.slice(20), 21, null, "?page=1"))
      .mockResolvedValueOnce(page(records.slice(20), 1, null));
    render(<AdminSellersList />);
    await screen.findByRole("link", { name: "Store 1" });
    expect(screen.getByText("21")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Store 21" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next sellers" }));
    await screen.findByRole("link", { name: "Store 21" });
    expect(get).toHaveBeenLastCalledWith(2, undefined, expect.any(AbortSignal));
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Seller status" }),
      "approved",
    );
    await screen.findByRole("link", { name: "Store 21" });
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith(
        1,
        "approved",
        expect.any(AbortSignal),
      ),
    );
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next sellers" })).toBeDisabled();
  });
  it("retries a failed later page and retains previous navigation", async () => {
    const user = userEvent.setup();
    get
      .mockResolvedValueOnce(page())
      .mockRejectedValueOnce(new Error("Page unavailable"))
      .mockResolvedValueOnce(page(records.slice(20), 21, null, "?page=1"));
    render(<AdminSellersList />);
    await screen.findByRole("link", { name: "Store 1" });
    await user.click(screen.getByRole("button", { name: "Next sellers" }));
    await screen.findByText("Page unavailable");
    expect(
      screen.getByRole("button", { name: "Previous sellers" }),
    ).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Retry sellers" }));
    await screen.findByRole("link", { name: "Store 21" });
    expect(get).toHaveBeenLastCalledWith(2, undefined, expect.any(AbortSignal));
  });
  it("ignores a previous filter response even if the transport ignores abort", async () => {
    const user = userEvent.setup();
    const old = deferred<Awaited<ReturnType<typeof getAdminSellers>>>();
    get
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(page(records.slice(20), 1, null));
    render(<AdminSellersList />);
    await waitFor(() => expect(get).toHaveBeenCalledOnce());
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Seller status" }),
      "approved",
    );
    await screen.findByRole("link", { name: "Store 21" });
    await act(async () => old.resolve(page()));
    expect(screen.getByRole("link", { name: "Store 21" })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Store 1" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });
});
