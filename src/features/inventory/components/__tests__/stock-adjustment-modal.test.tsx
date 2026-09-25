import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createStockMovement,
  type StockListItem,
  type StockMovementDetail,
} from "@/features/inventory/api";
import { StockAdjustmentModal } from "../stock-adjustment-modal";

vi.mock("@/features/inventory/api", async () => {
  const actual = await vi.importActual<
    typeof import("@/features/inventory/api")
  >("@/features/inventory/api");

  return {
    ...actual,
    createStockMovement: vi.fn(),
  };
});

const mockedCreateStockMovement = vi.mocked(createStockMovement);

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
  overrides: Partial<StockMovementDetail> = {},
): StockMovementDetail {
  return {
    id: 20,
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
    created_by: 1,
    created_by_name: "Inventory Admin",
    created_at: "2026-09-20T19:00:00Z",
    ...overrides,
  };
}

describe("StockAdjustmentModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a positive purchase movement", async () => {
    const user = userEvent.setup();
    const onCreated = vi.fn();

    mockedCreateStockMovement.mockResolvedValue(makeMovement());

    render(
      <StockAdjustmentModal
        stock={makeStock()}
        onClose={vi.fn()}
        onCreated={onCreated}
      />,
    );

    const quantity = screen.getByRole("spinbutton", {
      name: /quantity/i,
    });

    await user.clear(quantity);
    await user.type(quantity, "5");

    await user.type(
      screen.getByRole("textbox", {
        name: /reference id/i,
      }),
      "PO-2026-001",
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /^reason$/i,
      }),
      "Supplier delivery",
    );

    await user.type(
      screen.getByRole("textbox", {
        name: /^notes$/i,
      }),
      "Test stock adjustment",
    );

    await user.click(
      screen.getByRole("button", {
        name: /save adjustment/i,
      }),
    );

    await waitFor(() => {
      expect(mockedCreateStockMovement).toHaveBeenCalledWith({
        product: 10,
        warehouse: 1,
        movement_type: "purchase",
        quantity: 5,
        reference_id: "PO-2026-001",
        reason: "Supplier delivery",
        notes: "Test stock adjustment",
      });
    });

    expect(onCreated).toHaveBeenCalledWith(
      expect.objectContaining({
        before_quantity: 18,
        after_quantity: 23,
      }),
    );
  });

  it("requires a reason before submitting an adjustment", async () => {
    const user = userEvent.setup();

    render(
      <StockAdjustmentModal
        stock={makeStock()}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    const reason = screen.getByRole("textbox", {
      name: /^reason$/i,
    });

    expect(reason).toBeRequired();

    await user.click(
      screen.getByRole("button", {
        name: /save adjustment/i,
      }),
    );

    expect(mockedCreateStockMovement).not.toHaveBeenCalled();
  });
  it("converts damaged quantity to a negative movement", async () => {
    const user = userEvent.setup();

    mockedCreateStockMovement.mockResolvedValue(
      makeMovement({
        movement_type: "damaged",
        movement_type_display: "Damaged Goods",
        quantity: -2,
        before_quantity: 18,
        after_quantity: 16,
        reference_id: "DMG-2026-001",
        reason: "Packaging damage",
      }),
    );

    render(
      <StockAdjustmentModal
        stock={makeStock()}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", {
        name: /movement type/i,
      }),
      "damaged",
    );

    const quantity = screen.getByRole("spinbutton", {
      name: /quantity/i,
    });

    await user.clear(quantity);
    await user.type(quantity, "2");

    await user.type(
      screen.getByRole("textbox", {
        name: /^reason$/i,
      }),
      "Packaging damage",
    );

    await user.click(
      screen.getByRole("button", {
        name: /save adjustment/i,
      }),
    );

    await waitFor(() => {
      expect(mockedCreateStockMovement).toHaveBeenCalledWith(
        expect.objectContaining({
          movement_type: "damaged",
          quantity: -2,
          reason: "Packaging damage",
        }),
      );
    });
  });

  it("does not allow removing reserved stock", async () => {
    const user = userEvent.setup();

    render(
      <StockAdjustmentModal
        stock={makeStock({
          quantity: 16,
          reserved_quantity: 3,
          available_quantity: 13,
        })}
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />,
    );

    await user.selectOptions(
      screen.getByRole("combobox", {
        name: /movement type/i,
      }),
      "damaged",
    );

    const quantity = screen.getByRole("spinbutton", {
      name: /quantity/i,
    });

    await user.clear(quantity);
    await user.type(quantity, "14");

    await user.type(
      screen.getByRole("textbox", {
        name: /^reason$/i,
      }),
      "Invalid damage adjustment",
    );

    await user.click(
      screen.getByRole("button", {
        name: /save adjustment/i,
      }),
    );

    expect(
      await screen.findByText(/only 13 units are available to remove/i),
    ).toBeInTheDocument();

    expect(mockedCreateStockMovement).not.toHaveBeenCalled();
  });
});
