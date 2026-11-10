import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import type { Address } from "../../types";
import { AddressManager } from "../address-manager";

const endpoint = API_ENDPOINTS.auth.addresses;
const dataset: Address[] = Array.from({ length: 21 }, (_, index) => ({
  id: index + 1,
  user: 1,
  title: `Address ${index + 1}`,
  province: "Bavaria",
  city: "Bamberg",
  street: "Main street",
  alley: "",
  building_number: "10",
  floor: "",
  unit: "",
  postal_code: "96047",
  receiver_name: "Customer",
  receiver_phone: "09123456789",
  is_default: index === 0,
  created_at: "2026-09-08T18:00:00Z",
  updated_at: "2026-09-08T18:00:00Z",
}));
let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
});
afterEach(() => mock.restore());

function respond(records = dataset) {
  mock.onGet(endpoint).reply((config) => {
    expect(config.params.page_size).toBe(20);
    const page = config.params.page;
    return [
      200,
      {
        count: records.length,
        next: page * 20 < records.length ? `?page=${page + 1}` : null,
        previous: page > 1 ? `?page=${page - 1}` : null,
        results: records.slice((page - 1) * 20, page * 20),
      },
    ];
  });
}

describe("saved address server pagination", () => {
  it("retains total count and navigates beyond20 without fetching all records", async () => {
    respond();
    render(<AddressManager />);
    await screen.findByRole("heading", { name: "Address 1" });
    expect(screen.getByText("21 saved addresses")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Address 21" }),
    ).not.toBeInTheDocument();
    expect(mock.history.get).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByRole("heading", { name: "Address 21" });
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    await screen.findByRole("heading", { name: "Address 1" });
    expect(mock.history.get.map((request) => request.params.page)).toEqual([
      1, 2, 1,
    ]);
  });

  it("returns to page1 when the only address on page2 is removed", async () => {
    respond();
    mock.onDelete(API_ENDPOINTS.auth.addressDetail(21)).reply(() => {
      respond(dataset.slice(0, 20));
      return [204];
    });
    render(<AddressManager />);
    await screen.findByRole("heading", { name: "Address 1" });
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByRole("heading", { name: "Address 21" });
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByRole("heading", { name: "Address 1" });
    expect(screen.getByText("20 saved addresses")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
  });

  it("reloads server ordering from page1 after selecting a default beyond20", async () => {
    respond();
    mock.onPatch(API_ENDPOINTS.auth.addressSetDefault(21)).reply(() => {
      respond([
        { ...dataset[20], is_default: true },
        ...dataset
          .slice(0, 20)
          .map((entry) => ({ ...entry, is_default: false })),
      ]);
      return [200, { ...dataset[20], is_default: true }];
    });
    render(<AddressManager />);
    await screen.findByRole("heading", { name: "Address 1" });
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByRole("heading", { name: "Address 21" });
    await userEvent.click(screen.getByRole("button", { name: "Set default" }));
    await screen.findByText("Page 1 of 2");
    expect(screen.getAllByRole("heading", { level: 3 })[0]).toHaveTextContent(
      "Address 21",
    );
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(mock.history.patch).toHaveLength(1);
    expect(mock.history.get.map((request) => request.params.page)).toEqual([
      1, 2, 1,
    ]);
  });

  it("hides old rows on a failed new page and retries that page", async () => {
    let failed = false;
    mock.onGet(endpoint).reply((config) => {
      if (config.params.page === 2 && !failed) {
        failed = true;
        return [503];
      }
      return [
        200,
        {
          count: 21,
          next: config.params.page === 1 ? "?page=2" : null,
          previous: config.params.page === 2 ? "?page=1" : null,
          results:
            config.params.page === 1 ? dataset.slice(0, 20) : dataset.slice(20),
        },
      ];
    });
    render(<AddressManager />);
    await screen.findByRole("heading", { name: "Address 1" });
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByRole("alert");
    expect(
      screen.queryByRole("heading", { name: "Address 1" }),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Retry addresses" }),
    );
    await screen.findByRole("heading", { name: "Address 21" });
    expect(mock.history.get.map((request) => request.params.page)).toEqual([
      1, 2, 2,
    ]);
  });
});
