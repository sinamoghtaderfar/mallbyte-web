"use client";

import { useMemo, useState } from "react";

import {
    getStockMovementLabel,
    type StockMovementListItem,
    type WarehouseListItem
} from "@/features/inventory/api";

type StockMovementHistoryProps = {
  movements: StockMovementListItem[];
  warehouses: WarehouseListItem[];
  isLoading: boolean;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatChange(quantity: number) {
  if (quantity > 0) {
    return `+${quantity}`;
  }

  return String(quantity);
}

export function StockMovementHistory({
  movements,
  warehouses,
  isLoading,
}: StockMovementHistoryProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");

  const filteredMovements = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return movements.filter((movement) => {
      const matchesSearch =
        !normalizedSearch ||
        movement.product_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        movement.product_sku
          .toLowerCase()
          .includes(normalizedSearch) ||
        movement.reference_id
          .toLowerCase()
          .includes(normalizedSearch) ||
        movement.reason
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesType =
        typeFilter === "all" ||
        movement.movement_type === typeFilter;

      const matchesWarehouse =
        warehouseFilter === "all" ||
        movement.warehouse === Number(warehouseFilter);

      return (
        matchesSearch &&
        matchesType &&
        matchesWarehouse
      );
    });
  }, [
    movements,
    search,
    typeFilter,
    warehouseFilter,
  ]);

  const movementTypes = Array.from(
    new Set(
      movements.map((movement) => movement.movement_type),
    ),
  );

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-950">
          Movement history
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Audit trail for every recorded inventory change.
        </p>
      </div>

      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search product, SKU, reference, or reason..."
          className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
        />

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
        >
          <option value="all">All movement types</option>

          {movementTypes.map((type) => (
            <option key={type} value={type}>
              {getStockMovementLabel(type)}
            </option>
          ))}
        </select>

        <select
          value={warehouseFilter}
          onChange={(event) =>
            setWarehouseFilter(event.target.value)
          }
          className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
        >
          <option value="all">All warehouses</option>

          {warehouses.map((warehouse) => (
            <option
              key={warehouse.id}
              value={warehouse.id}
            >
              {warehouse.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-500">
          Loading movement history...
        </p>
      ) : filteredMovements.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-slate-50 p-5">
          <p className="text-sm font-medium text-slate-700">
            No stock movements found.
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Inventory adjustments will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
          <div className="min-w-[1200px]">
            <div className="grid grid-cols-[1.5fr_1.1fr_1fr_0.7fr_0.9fr_1.4fr_1fr] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>Product</span>
              <span>Warehouse</span>
              <span>Type</span>
              <span>Change</span>
              <span>Stock</span>
              <span>Reason / Reference</span>
              <span>Created</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="grid grid-cols-[1.5fr_1.1fr_1fr_0.7fr_0.9fr_1.4fr_1fr] gap-4 px-4 py-4 text-sm"
                >
                  <div>
                    <p className="font-semibold text-slate-950">
                      {movement.product_name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      SKU: {movement.product_sku}
                    </p>
                  </div>

                  <div>
                    <p className="font-medium text-slate-800">
                      {movement.warehouse_name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {movement.warehouse_code}
                    </p>
                  </div>

                  <span className="inline-flex h-fit w-fit self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {movement.movement_type_display ||
                      getStockMovementLabel(
                        movement.movement_type,
                      )}
                  </span>

                  <p
                    className={
                      movement.quantity > 0
                        ? "font-semibold text-green-700"
                        : "font-semibold text-red-700"
                    }
                  >
                    {formatChange(movement.quantity)}
                  </p>

                  <p className="font-medium text-slate-800">
                    {movement.before_quantity}
                    {" → "}
                    {movement.after_quantity}
                  </p>

                  <div>
                    <p className="text-slate-700">
                      {movement.reason || "—"}
                    </p>

                    {movement.reference_id ? (
                      <p className="mt-1 text-xs text-slate-500">
                        Ref: {movement.reference_id}
                      </p>
                    ) : null}

                    {movement.notes ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {movement.notes}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <p className="text-slate-600">
                      {formatDate(movement.created_at)}
                    </p>

                    {movement.created_by_name ? (
                      <p className="mt-1 text-xs text-slate-500">
                        By {movement.created_by_name}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isLoading && movements.length > 0 ? (
        <p className="mt-4 text-xs text-slate-500">
          Showing {filteredMovements.length} of{" "}
          {movements.length} movements.
        </p>
      ) : null}
    </section>
  );
}