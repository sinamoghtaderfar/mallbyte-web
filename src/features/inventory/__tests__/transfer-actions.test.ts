import { describe, expect, it } from "vitest";

import type { StockTransferListItem } from "@/features/inventory/api";
import {
  getTransferActions,
  type TransferAccess,
} from "@/features/inventory/transfer-actions";

const pending = {
  status: "pending",
  requested_by: 10,
  from_warehouse: 1,
  to_warehouse: 2,
} as StockTransferListItem;

function access(overrides: Partial<TransferAccess> = {}): TransferAccess {
  return {
    userId: 11,
    permissions: [],
    warehouseIds: [],
    isSuperuser: false,
    ...overrides,
  };
}

describe("warehouse transfer actions", () => {
  it("manager cannot approve, ship or receive", () => {
    const manager = access({
      userId: 10,
      permissions: ["view_inventory", "create_stock_transfers"],
    });

    expect(getTransferActions(pending, manager)).toEqual({
      canApprove: false,
      canCancel: false,
      canShip: false,
      canReceive: false,
    });
  });

  it("supervisor can approve another user's pending transfer", () => {
    const supervisor = access({
      permissions: ["approve_stock_transfers"],
    });

    expect(getTransferActions(pending, supervisor).canApprove).toBe(true);

    expect(getTransferActions(pending, supervisor).canCancel).toBe(true);

    expect(
      getTransferActions({ ...pending, requested_by: 11 }, supervisor)
        .canApprove,
    ).toBe(false);
  });

  it("only an assigned source operator can ship", () => {
    const approved = {
      ...pending,
      status: "approved",
    } as StockTransferListItem;

    const operator = access({
      permissions: ["ship_stock_transfers"],
      warehouseIds: [1],
    });

    expect(getTransferActions(approved, operator).canShip).toBe(true);

    expect(
      getTransferActions(approved, {
        ...operator,
        warehouseIds: [2],
      }).canShip,
    ).toBe(false);

    expect(getTransferActions(pending, operator).canShip).toBe(false);
  });

  it("only an assigned destination operator can receive", () => {
    const transit = {
      ...pending,
      status: "in_transit",
    } as StockTransferListItem;

    const operator = access({
      permissions: ["receive_stock_transfers"],
      warehouseIds: [2],
    });

    expect(getTransferActions(transit, operator).canReceive).toBe(true);

    expect(
      getTransferActions(transit, {
        ...operator,
        warehouseIds: [1],
      }).canReceive,
    ).toBe(false);

    expect(
      getTransferActions({ ...pending, status: "approved" }, operator)
        .canReceive,
    ).toBe(false);
  });

  it("a shipped transfer cannot be cancelled", () => {
    const transit = {
      ...pending,
      status: "in_transit",
    } as StockTransferListItem;

    expect(
      getTransferActions(
        transit,
        access({
          permissions: ["approve_stock_transfers"],
        }),
      ).canCancel,
    ).toBe(false);
  });

  it("superuser can ship and receive without warehouse membership", () => {
    const admin = access({
      isSuperuser: true,
    });

    expect(
      getTransferActions({ ...pending, status: "approved" }, admin).canShip,
    ).toBe(true);

    expect(
      getTransferActions({ ...pending, status: "in_transit" }, admin)
        .canReceive,
    ).toBe(true);
  });
});
