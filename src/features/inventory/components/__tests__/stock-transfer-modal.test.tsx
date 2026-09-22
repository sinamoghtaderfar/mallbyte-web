import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createStockTransfer,
  type StockListItem,
  type StockTransferDetail,
  type WarehouseListItem,
} from "@/features/inventory/api";
import { StockTransferModal } from "../stock-transfer-modal";

vi.mock("@/features/inventory/api", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/inventory/api")
  >("@/features/inventory/api");

  return {
    ...actual,
    createStockTransfer: vi.fn(),
  };
});

const mockedCreateStockTransfer = vi.mocked(createStockTransfer);

const warehouses: WarehouseListItem[] = [
  {
    id: 1,
    name: "Main Warehouse",
    code: "MAIN",
    type: "main",
    type_display: "Main Warehouse",
    city: "Bamberg",
    is_active: true,
  },
  {
    id: 2,
    name: "Branch Warehouse",
    code: "BRANCH",
    type: "branch",
    type_display: "Branch Warehouse",
    city: "Bamberg",
    is_active: true,
  },
];

const stocks: StockListItem[] = [
  {
    id: 1,
    product: 10,
    product_name: "Mechanical Keyboard",
    product_sku: "MB-KEYBOARD-001",
    warehouse: 1,
    warehouse_name: "Main Warehouse",
    warehouse_code: "MAIN",
    quantity: 16,
    reserved_quantity: 0,
    available_quantity: 16,
    low_stock_threshold: 5,
    is_low_stock: false,
    last_updated: "2026-09-20T20:00:00Z",
  },
];

function makeTransfer(): StockTransferDetail {
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
  };
}

describe("StockTransferModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a valid transfer", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    mockedCreateStockTransfer.mockResolvedValue(makeTransfer());

    render(
      <StockTransferModal
        stocks={stocks}
        warehouses={warehouses}
        onClose={vi.fn()}
        onCreated={onCreated}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", {
        name: /source warehouse/i,
      }),
      "1",
    );

    await user.selectOptions(
      screen.getByRole("combobox", {
        name: /^product$/i,
      }),
      "1",
    );

    await user.selectOptions(
      screen.getByRole("combobox", {
        name: /destination warehouse/i,
      }),
      "2",
    );

    const quantity = screen.getByRole("spinbutton", {
      name: /quantity/i,
    });

    await user.clear(quantity);
    await user.type(quantity, "5");

    await user.type(
      screen.getByRole("textbox", {
        name: /reason/i,
      }),
      "Restock branch warehouse",
    );

    await user.click(
      screen.getByRole("button", {
        name: /create transfer/i,
      }),
    );

    await waitFor(() => {
      expect(mockedCreateStockTransfer).toHaveBeenCalledWith({
        from_warehouse: 1,
        to_warehouse: 2,
        product: 10,
        quantity: 5,
        reason: "Restock branch warehouse",
      });

      expect(onCreated).toHaveBeenCalledWith(makeTransfer());
    });

    expect(mockedCreateStockTransfer).toHaveBeenCalledTimes(1);
  });

  it("does not offer the source warehouse as a destination", async () => {
    const user = userEvent.setup();

    render(
      <StockTransferModal
        stocks={stocks}
        warehouses={warehouses}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", {
        name: /source warehouse/i,
      }),
      "1",
    );

    const destination = screen.getByRole("combobox", {
      name: /destination warehouse/i,
    });

    expect(
      destination.querySelector('option[value="1"]'),
    ).not.toBeInTheDocument();

    expect(destination.querySelector('option[value="2"]')).toBeInTheDocument();
  });

  it("rejects a quantity above available stock", async () => {
    const user = userEvent.setup();

    render(
      <StockTransferModal
        stocks={stocks}
        warehouses={warehouses}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", {
        name: /source warehouse/i,
      }),
      "1",
    );

    await user.selectOptions(
      screen.getByRole("combobox", {
        name: /^product$/i,
      }),
      "1",
    );

    await user.selectOptions(
      screen.getByRole("combobox", {
        name: /destination warehouse/i,
      }),
      "2",
    );

    const quantity = screen.getByRole("spinbutton", {
      name: /quantity/i,
    });

    await user.clear(quantity);
    await user.type(quantity, "20");

    const submitButton = screen.getByRole("button", {
      name: /create transfer/i,
    });

    const form = submitButton.closest("form");

    expect(form).not.toBeNull();

    fireEvent.submit(form!);

    expect(
      await screen.findByText(/only 16 units are available/i),
    ).toBeInTheDocument();

    expect(mockedCreateStockTransfer).not.toHaveBeenCalled();
  });
});
