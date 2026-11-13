import { useState } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ProductReferenceQuery } from "../../types";
import { ProductReferenceFields } from "../product-reference-fields";

const references = Array.from({ length: 21 }, (_, index) => ({
  id: index + 1,
  name: `Reference ${index + 1}`,
}));
function page(index: number) {
  return {
    count: 21,
    next: index === 1 ? "?page=2" : null,
    previous: index === 2 ? "?page=1" : null,
    results: references.slice((index - 1) * 20, index * 20),
  };
}
function response(query: ProductReferenceQuery = {}) {
  return { categories: page(query.categoryPage ?? 1), brands: page(query.brandPage ?? 1) };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
function Harness({ loadOptions }: { loadOptions: Parameters<typeof ProductReferenceFields>[0]["loadOptions"] }) {
  const [selection, setSelection] = useState({ category: "", brand: "" });
  return <ProductReferenceFields {...selection} loadOptions={loadOptions} onChange={(event) => setSelection((value) => ({ ...value, [event.target.name]: event.target.value }))} />;
}

describe("bounded product reference options", () => {
  it("exposes all 21 references through independent pages and preserves selected values", async () => {
    const user = userEvent.setup();
    const loadOptions = vi.fn(async (query?: ProductReferenceQuery) => response(query));
    render(<Harness loadOptions={loadOptions} />);
    const category = screen.getByRole("combobox", { name: "Category" });
    const brand = screen.getByRole("combobox", { name: "Brand" });
    await waitFor(() => expect(category).toBeEnabled());
    expect(screen.getByText("21 root categories · Page 1 of 2")).toBeInTheDocument();
    expect(within(category).queryByRole("option", { name: "Reference 21" })).not.toBeInTheDocument();
    expect(loadOptions).toHaveBeenCalledTimes(1);
    await user.selectOptions(category, "1");
    await user.click(screen.getByRole("button", { name: "Next category options" }));
    await waitFor(() => expect(loadOptions).toHaveBeenLastCalledWith({ categoryPage: 2, brandPage: 1 }, expect.any(AbortSignal)));
    await waitFor(() => expect(category).toBeEnabled());
    expect(category).toHaveValue("1");
    expect(within(category).getByRole("option", { name: "Reference 1" })).toBeInTheDocument();
    await user.selectOptions(category, "21");
    await user.click(screen.getByRole("button", { name: "Next brand options" }));
    await waitFor(() => expect(brand).toBeEnabled());
    expect(loadOptions).toHaveBeenLastCalledWith({ categoryPage: 2, brandPage: 2 }, expect.any(AbortSignal));
    await user.selectOptions(brand, "21");
    await user.click(screen.getByRole("button", { name: "Previous category options" }));
    await waitFor(() => expect(category).toBeEnabled());
    expect(category).toHaveValue("21");
    expect(brand).toHaveValue("21");
    expect(screen.getByText("21 brands · Page 2 of 2")).toBeInTheDocument();
    expect(loadOptions).toHaveBeenCalledTimes(4);
  });

  it("includes active nested categories with parent labels and ignores inactive nodes and cycles", async () => {
    const loadOptions = vi.fn(async () => ({
      categories: { ...page(1), results: [{ id: 1, name: "Parent", children: [
        { id: 22, name: "Child", children: [{ id: 1, name: "Cycle" }] },
        { id: 23, name: "Inactive", is_active: false },
      ] }] },
      brands: page(1),
    }));
    render(<Harness loadOptions={loadOptions} />);
    expect(await screen.findByRole("option", { name: "Parent / Child" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Inactive|Cycle/ })).not.toBeInTheDocument();
  });

  it("retries the failed bounded page without changing a selection", async () => {
    const user = userEvent.setup();
    const loadOptions = vi.fn<Parameters<typeof ProductReferenceFields>[0]["loadOptions"]>()
      .mockResolvedValueOnce(response())
      .mockRejectedValueOnce(new Error("References offline"))
      .mockResolvedValueOnce(response({ categoryPage: 2 }));
    render(<Harness loadOptions={loadOptions} />);
    const category = screen.getByRole("combobox", { name: "Category" });
    await waitFor(() => expect(category).toBeEnabled());
    await user.selectOptions(category, "1");
    await user.click(screen.getByRole("button", { name: "Next category options" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("References offline");
    expect(category).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Retry reference options" }));
    await waitFor(() => expect(category).toBeEnabled());
    expect(category).toHaveValue("1");
    expect(loadOptions).toHaveBeenLastCalledWith({ categoryPage: 2, brandPage: 1 }, expect.any(AbortSignal));
    expect(loadOptions).toHaveBeenCalledTimes(3);
  });

  it("retires an older reference request when its loader changes", async () => {
    const old = deferred<ReturnType<typeof response>>();
    const oldLoader = vi.fn(() => old.promise);
    const newLoader = vi.fn(async () => ({ categories: { ...page(1), results: [{ id: 30, name: "Current category" }] }, brands: page(1) }));
    const { rerender } = render(<Harness loadOptions={oldLoader} />);
    rerender(<Harness loadOptions={newLoader} />);
    expect(await screen.findByRole("option", { name: "Current category" })).toBeInTheDocument();
    await act(async () => old.resolve(response()));
    expect(screen.getByRole("option", { name: "Current category" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Reference 1" })).toBeInTheDocument(); // the current brand page
    expect(oldLoader.mock.calls).toHaveLength(1);
  });
});
