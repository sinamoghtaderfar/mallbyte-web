import type { StockTransferListItem } from "@/features/inventory/api";

export type TransferAccess = {
  userId: number | null;
  permissions: readonly string[];
  warehouseIds: readonly number[];
  isSuperuser: boolean;
};

export function getTransferActions(
  transfer: StockTransferListItem,
  access: TransferAccess,
) {
  const hasPermission = (code: string) =>
    access.isSuperuser || access.permissions.includes(code);

  const isOwnRequest =
    access.userId !== null && transfer.requested_by === access.userId;

  const canReview = hasPermission("approve_stock_transfers") && !isOwnRequest;

  const belongsTo = (warehouseId: number) =>
    access.isSuperuser || access.warehouseIds.includes(warehouseId);

  return {
    canApprove: transfer.status === "pending" && canReview,

    canCancel:
      (transfer.status === "pending" || transfer.status === "approved") &&
      canReview,

    canShip:
      transfer.status === "approved" &&
      hasPermission("ship_stock_transfers") &&
      belongsTo(transfer.from_warehouse),

    canReceive:
      transfer.status === "in_transit" &&
      hasPermission("receive_stock_transfers") &&
      belongsTo(transfer.to_warehouse),
  };
}
