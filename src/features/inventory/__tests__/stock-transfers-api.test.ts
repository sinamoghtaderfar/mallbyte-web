import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  approveStockTransfer,
  cancelStockTransfer,
  createStockTransfer,
  getMyWarehouseIds,
  getStockTransfers,
  receiveStockTransfer,
  shipStockTransfer,
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

    shipped_by: null,
    shipped_by_name: null,
    shipped_at: null,

    received_by: null,
    received_by_name: null,
    received_at: null,

    reason: "Restock branch warehouse",

    requested_by: 1,
    requested_by_name: "Inventory Manager",

    approved_by: null,
    approved_by_name: null,
    approved_at: null,

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

    await expect(getStockTransfers()).resolves.toEqual([transfer]);

    expect(mockedGet).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.stockTransfers,
    );
  });

  it("loads the current user's assigned warehouses", async () => {
    mockedGet.mockResolvedValue({
      data: {
        warehouse_ids: [1, 2],
      },
    });

    await expect(getMyWarehouseIds()).resolves.toEqual([1, 2]);

    expect(mockedGet).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.myWarehouseAssignments,
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

    await expect(createStockTransfer(payload)).resolves.toEqual(transfer);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.stockTransfers,
      payload,
    );
  });

  it("approves a stock transfer", async () => {
    const transfer = makeTransferDetail({
      status: "approved",
      status_display: "Approved",

      approved_by: 2,
      approved_by_name: "Inventory Supervisor",
      approved_at: "2026-09-20T20:05:00Z",
    });

    mockedPost.mockResolvedValue({
      data: transfer,
    });

    await expect(approveStockTransfer(1)).resolves.toEqual(transfer);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.stockTransferApprove(1),
      {},
    );
  });

  it("ships an approved stock transfer", async () => {
    const transfer = makeTransferDetail({
      status: "in_transit",
      status_display: "In Transit",

      tracking_number: "TR-2026-001",

      approved_by: 2,
      approved_by_name: "Inventory Supervisor",
      approved_at: "2026-09-20T20:05:00Z",

      shipped_by: 3,
      shipped_by_name: "Source Warehouse Operator",
      shipped_at: "2026-09-20T20:10:00Z",
    });

    mockedPost.mockResolvedValue({
      data: transfer,
    });

    await expect(shipStockTransfer(1, " TR-2026-001 ")).resolves.toEqual(
      transfer,
    );

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.stockTransferShip(1),
      {
        tracking_number: "TR-2026-001",
      },
    );
  });

  it("receives an in-transit stock transfer", async () => {
    const transfer = makeTransferDetail({
      status: "completed",
      status_display: "Completed",

      tracking_number: "TR-2026-001",

      approved_by: 2,
      approved_by_name: "Inventory Supervisor",
      approved_at: "2026-09-20T20:05:00Z",

      shipped_by: 3,
      shipped_by_name: "Source Warehouse Operator",
      shipped_at: "2026-09-20T20:10:00Z",

      received_by: 4,
      received_by_name: "Destination Warehouse Operator",
      received_at: "2026-09-20T21:00:00Z",
    });

    mockedPost.mockResolvedValue({
      data: transfer,
    });

    await expect(receiveStockTransfer(1)).resolves.toEqual(transfer);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.stockTransferReceive(1),
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

    await expect(cancelStockTransfer(1)).resolves.toEqual(transfer);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.stockTransferCancel(1),
      {},
    );
  });
});
