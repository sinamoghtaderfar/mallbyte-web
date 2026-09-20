import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    cancelStockTransfer,
    completeStockTransfer,
    createStockTransfer,
    getStockTransfers,
    markStockTransferInTransit,
    type StockTransferDetail,
    type StockTransferListItem,
} from "@/features/inventory/api";
import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

function makeTransfer(
  overrides: Partial<StockTransferListItem> = {},
): StockTransferListItem {
  return {
    id: 1,

    product: 10,
    product_name: "Mechanical Keyboard",
    product_sku: "MB-KEYBOARD-001",

    from_warehouse: 1,
    from_warehouse_name: "Main Warehouse",
    from_warehouse_code: "MAIN",

    to_warehouse: 2,
    to_warehouse_name: "Branch Warehouse",
    to_warehouse_code: "BRANCH",

    quantity: 5,

    status: "pending",
    status_display: "Pending",

    tracking_number: "",

    shipped_at: null,
    delivered_at: null,

    reason: "Restock branch warehouse",

    requested_by_name: "Inventory Manager",
    approved_by_name: null,

    created_at: "2026-09-20T20:00:00Z",
    updated_at: "2026-09-20T20:00:00Z",

    ...overrides,
  };
}

function makeTransferDetail(
  overrides: Partial<StockTransferDetail> = {},
): StockTransferDetail {
  return {
    ...makeTransfer(),
    requested_by: 1,
    approved_by: null,
    ...overrides,
  };
}

describe("stock transfer api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads stock transfers", async () => {
    const transfer = makeTransfer();

    mockedGet.mockResolvedValue({
      data: {
        count: 1,
        next: null,
        previous: null,
        results: [transfer],
      },
    });

    await expect(
      getStockTransfers(),
    ).resolves.toEqual([transfer]);

    expect(mockedGet).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.stockTransfers,
    );
  });

  it("creates a stock transfer", async () => {
    const transfer = makeTransferDetail();

    mockedPost.mockResolvedValue({
      data: transfer,
    });

    const payload = {
      from_warehouse: 1,
      to_warehouse: 2,
      product: 10,
      quantity: 5,
      reason: "Restock branch warehouse",
    };

    await expect(
      createStockTransfer(payload),
    ).resolves.toEqual(transfer);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.stockTransfers,
      payload,
    );
  });

  it("marks transfer in transit", async () => {
    const transfer = makeTransferDetail({
      status: "in_transit",
      status_display: "In Transit",
      tracking_number: "TR-2026-001",
    });

    mockedPost.mockResolvedValue({
      data: transfer,
    });

    await expect(
      markStockTransferInTransit(
        1,
        " TR-2026-001 ",
      ),
    ).resolves.toEqual(transfer);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.stockTransferMarkInTransit(
        1,
      ),
      {
        tracking_number: "TR-2026-001",
      },
    );
  });

  it("completes a stock transfer", async () => {
    const transfer = makeTransferDetail({
      status: "completed",
      status_display: "Completed",
    });

    mockedPost.mockResolvedValue({
      data: transfer,
    });

    await expect(
      completeStockTransfer(1),
    ).resolves.toEqual(transfer);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.stockTransferComplete(
        1,
      ),
      {},
    );
  });

  it("cancels a stock transfer", async () => {
    const transfer = makeTransferDetail({
      status: "cancelled",
      status_display: "Cancelled",
    });

    mockedPost.mockResolvedValue({
      data: transfer,
    });

    await expect(
      cancelStockTransfer(1),
    ).resolves.toEqual(transfer);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.stockTransferCancel(
        1,
      ),
      {},
    );
  });
});