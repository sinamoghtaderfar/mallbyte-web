"use client";

import { useMemo, useState } from "react";

import {
  getStockMovementLabel,
  type StockMovementListItem,
  type WarehouseListItem,
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
        movement.product_name.toLowerCase().includes(normalizedSearch) ||
        movement.product_sku.toLowerCase().includes(normalizedSearch) ||
        movement.reference_id.toLowerCase().includes(normalizedSearch) ||
        movement.reason.toLowerCase().includes(normalizedSearch);

      const matchesType =
        typeFilter === "all" || movement.movement_type === typeFilter;

      const matchesWarehouse =
        warehouseFilter === "all" ||
        movement.warehouse === Number(warehouseFilter);

      return matchesSearch && matchesType && matchesWarehouse;
    });
  }, [movements, search, typeFilter, warehouseFilter]);

  const movementTypes = Array.from(
    new Set(movements.map((movement) => movement.movement_type)),
  );

  return (
    <section className="mb-card min-w-0 overflow-hidden" aria-labelledby="movement-history-title">
      <div className="grid gap-4 p-5 sm:p-6">
        <div>
          <h2 id="movement-history-title" className="text-base font-semibold tracking-tight text-foreground">Movement history</h2>
          <p className="mt-1 text-sm text-muted">Audit trail for every recorded inventory change.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_13rem_13rem]">
          <input type="search" aria-label="Search movements" value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="Search product, SKU, reference, or reason..." className="mb-control" />
          <select aria-label="Movement type" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="mb-control mb-select">
            <option value="all">All movement types</option>
            {movementTypes.map((type) => <option key={type} value={type}>{getStockMovementLabel(type)}</option>)}
          </select>
          <select aria-label="Movement warehouse" value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)} className="mb-control mb-select">
            <option value="all">All warehouses</option>
            {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div role="status" className="grid gap-2 border-t border-line p-5">
          <span className="sr-only">Loading movement history...</span>
          {[0, 1, 2].map((i) => <div key={i} className="mb-skeleton h-12 rounded-lg" />)}
        </div>
      ) : filteredMovements.length === 0 ? (
        <div className="border-t border-line px-5 py-10 text-center">
          <p className="text-sm font-medium text-foreground">No stock movements found.</p>
          <p className="mt-1 text-xs text-muted">Inventory adjustments will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-line">
          <table className="mb-table min-w-[64rem]">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Warehouse</th>
                <th scope="col">Type</th>
                <th scope="col" className="text-right">Change</th>
                <th scope="col" className="text-right">Stock</th>
                <th scope="col">Reason / Reference</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovements.map((movement) => (
                <tr key={movement.id}>
                  <td>
                    <p className="font-medium text-foreground">{movement.product_name}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted">SKU: {movement.product_sku}</p>
                  </td>
                  <td>
                    <p className="font-medium text-slate-800">{movement.warehouse_name}</p>
                    <p className="mt-0.5 font-mono text-xs text-muted">{movement.warehouse_code}</p>
                  </td>
                  <td>
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                      {movement.movement_type_display || getStockMovementLabel(movement.movement_type)}
                    </span>
                  </td>
                  <td className="text-right">
                    <p className={movement.quantity > 0 ? "font-semibold text-success" : "font-semibold text-danger"}>{formatChange(movement.quantity)}</p>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <p className="font-medium text-slate-800">{movement.before_quantity}{" → "}{movement.after_quantity}</p>
                  </td>
                  <td className="max-w-xs">
                    <p className="text-slate-700">{movement.reason || "—"}</p>
                    {movement.reference_id ? <p className="mt-0.5 font-mono text-xs text-muted">Ref: {movement.reference_id}</p> : null}
                    {movement.notes ? <p className="mt-0.5 text-xs text-muted">{movement.notes}</p> : null}
                  </td>
                  <td className="whitespace-nowrap">
                    <p className="text-slate-700">{formatDate(movement.created_at)}</p>
                    {movement.created_by_name ? <p className="mt-0.5 text-xs text-muted">By {movement.created_by_name}</p> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && movements.length > 0 ? (
        <p className="border-t border-line px-5 py-3 text-xs text-muted" data-numeric>
          Showing {filteredMovements.length} of {movements.length} movements.
        </p>
      ) : null}
    </section>
  );
}
