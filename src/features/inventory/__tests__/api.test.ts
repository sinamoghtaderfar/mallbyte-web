import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import {
  createStockMovement,
  getStockMovements,
  getStocks,
  type StockListItem,
  type StockMovementDetail,
  type StockMovementListItem,
} from "../api";

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockedGet = vi.mocked(apiClient.get);
const mockedPost = vi.mocked(apiClient.post);

function makeStock(overrides: Partial<StockListItem> = {}): StockListItem {
  return {
    id: 1,
    product: 10,
    product_name: "Mechanical Keyboard",
    product_sku: "MB-KEYBOARD-001",
    warehouse: 1,
    warehouse_name: "Main Warehouse",
    warehouse_code: "MAIN",
    quantity: 18,
    reserved_quantity: 0,
    available_quantity: 18,
    low_stock_threshold: 5,
    is_low_stock: false,
    last_updated: "2026-09-20T19:00:00Z",
    ...overrides,
  };
}

function makeMovement(
  overrides: Partial<StockMovementListItem> = {},
): StockMovementListItem {
  return {
    id: 1,
    product: 10,
    product_name: "Mechanical Keyboard",
    product_sku: "MB-KEYBOARD-001",
    warehouse: 1,
    warehouse_name: "Main Warehouse",
    warehouse_code: "MAIN",
    movement_type: "purchase",
    movement_type_display: "Purchase Order",
    quantity: 5,
    before_quantity: 18,
    after_quantity: 23,
    reference_id: "PO-2026-001",
    reason: "Supplier delivery",
    notes: "Test stock adjustment",
    created_by_name: "Inventory Admin",
    created_at: "2026-09-20T19:00:00Z",
    ...overrides,
  };
}

describe("inventory api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads every stock pagination page", async () => {
    const firstStock = makeStock();

    const secondStock = makeStock({
      id: 2,
      product: 20,
      product_name: "Wireless Headphones",
      product_sku: "MB-HEADPHONE-001",
    });

    mockedGet
      .mockResolvedValueOnce({
        data: {
          count: 2,
          next: "/api/inventory/stocks/?page=2",
          previous: null,
          results: [firstStock],
        },
      })
      .mockResolvedValueOnce({
        data: {
          count: 2,
          next: null,
          previous: "/api/inventory/stocks/",
          results: [secondStock],
        },
      });

    await expect(getStocks()).resolves.toEqual([firstStock, secondStock]);

    expect(mockedGet).toHaveBeenNthCalledWith(
      1,
      API_ENDPOINTS.inventory.stocks,
    );

    expect(mockedGet).toHaveBeenNthCalledWith(
      2,
      "/api/inventory/stocks/?page=2",
    );
  });

  it("loads stock movement history", async () => {
    const movement = makeMovement();

    mockedGet.mockResolvedValue({
      data: {
        count: 1,
        next: null,
        previous: null,
        results: [movement],
      },
    });

    await expect(getStockMovements()).resolves.toEqual([movement]);

    expect(mockedGet).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.stockMovements,
    );
  });

  it("creates a stock movement", async () => {
    const movement: StockMovementDetail = {
      ...makeMovement(),
      created_by: 1,
    };

    mockedPost.mockResolvedValue({
      data: movement,
    });

    const payload = {
      product: 10,
      warehouse: 1,
      movement_type: "purchase" as const,
      quantity: 5,
      reference_id: "PO-2026-001",
      reason: "Supplier delivery",
      notes: "Test stock adjustment",
    };

    await expect(createStockMovement(payload)).resolves.toEqual(movement);

    expect(mockedPost).toHaveBeenCalledWith(
      API_ENDPOINTS.inventory.stockMovements,
      payload,
    );
  });
});
