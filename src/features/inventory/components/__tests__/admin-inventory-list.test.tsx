import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getStockMovements,
  getStocks,
  getWarehouses,
  type StockListItem,
  type StockMovementListItem,
  type WarehouseListItem,
} from "@/features/inventory/api";
import { AdminInventoryList } from "../admin-inventory-list";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/inventory/api", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/inventory/api")
  >("@/features/inventory/api");

  return {
    ...actual,
    getStocks: vi.fn(),
    getWarehouses: vi.fn(),
    getStockMovements: vi.fn(),
  };
});

vi.mock("@/features/inventory/components/stock-adjustment-modal", () => ({
  StockAdjustmentModal: ({
    stock,
    onCreated,
  }: {
    stock: StockListItem;
    onCreated: (movement: {
      id: number;
      product: number;
      product_name: string;
      product_sku: string;
      warehouse: number;
      warehouse_name: string;
      warehouse_code: string;
      movement_type: "purchase";
      movement_type_display: string;
      quantity: number;
      before_quantity: number;
      after_quantity: number;
      reference_id: string;
      reason: string;
      notes: string;
      created_by: number;
      created_by_name: string;
      created_at: string;
    }) => void | Promise<void>;
  }) => (
    <div>
      <p>Adjustment modal for {stock.product_name}</p>

      <button
        type="button"
        onClick={() =>
          void onCreated({
            id: 99,
            product: stock.product,
            product_name: stock.product_name,
            product_sku: stock.product_sku,
            warehouse: stock.warehouse,
            warehouse_name: stock.warehouse_name,
            warehouse_code: stock.warehouse_code,
            movement_type: "purchase",
            movement_type_display: "Purchase Order",
            quantity: 5,
            before_quantity: 18,
            after_quantity: 23,
            reference_id: "PO-2026-001",
            reason: "Supplier delivery",
            notes: "Test adjustment",
            created_by: 1,
            created_by_name: "Inventory Admin",
            created_at: "2026-09-20T19:00:00Z",
          })
        }
      >
        Complete adjustment
      </button>
    </div>
  ),
}));

const mockedGetStocks = vi.mocked(getStocks);
const mockedGetWarehouses = vi.mocked(getWarehouses);
const mockedGetStockMovements = vi.mocked(getStockMovements);

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

function makeWarehouse(): WarehouseListItem {
  return {
    id: 1,
    name: "Main Warehouse",
    code: "MAIN",
    type: "main",
    type_display: "Main Warehouse",
    city: "Bamberg",
    is_active: true,
  };
}

function makeMovement(): StockMovementListItem {
  return {
    id: 99,
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
    notes: "Test adjustment",
    created_by_name: "Inventory Admin",
    created_at: "2026-09-20T19:00:00Z",
  };
}

describe("AdminInventoryList", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedGetWarehouses.mockResolvedValue([makeWarehouse()]);

    mockedGetStocks.mockResolvedValue([makeStock()]);

    mockedGetStockMovements.mockResolvedValue([]);
  });

  it("renders inventory summaries and stock records", async () => {
    render(<AdminInventoryList />);

    expect(await screen.findByText("Mechanical Keyboard")).toBeInTheDocument();

    expect(screen.getByText("Total stock").parentElement).toHaveTextContent(
      "18",
    );

    expect(
      screen.getByText("Available", {
        selector: "p",
      }).parentElement,
    ).toHaveTextContent("18");

    expect(
      screen.getByText("Reserved", {
        selector: "p",
      }).parentElement,
    ).toHaveTextContent("0");

    expect(screen.getByText(/MB-KEYBOARD-001/)).toBeInTheDocument();
  });

  it("refetches stock and movements after an adjustment", async () => {
    const user = userEvent.setup();

    mockedGetStocks.mockResolvedValueOnce([makeStock()]).mockResolvedValueOnce([
      makeStock({
        quantity: 23,
        available_quantity: 23,
      }),
    ]);

    mockedGetStockMovements
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeMovement()]);

    render(<AdminInventoryList />);

    expect(await screen.findByText("Mechanical Keyboard")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /adjust/i,
      }),
    );

    expect(
      screen.getByText("Adjustment modal for Mechanical Keyboard"),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", {
        name: /complete adjustment/i,
      }),
    );

    await waitFor(() => {
      expect(mockedGetStocks).toHaveBeenCalledTimes(2);
      expect(mockedGetStockMovements).toHaveBeenCalledTimes(2);
    });

    expect(
      await screen.findByText(/stock updated from 18 to 23/i),
    ).toBeInTheDocument();

    expect(screen.getByText("Total stock").parentElement).toHaveTextContent(
      "23",
    );

    expect(await screen.findByText("Supplier delivery")).toBeInTheDocument();

    expect(screen.getByText("+5")).toBeInTheDocument();

    expect(screen.getByText("18 → 23")).toBeInTheDocument();
  });
});
