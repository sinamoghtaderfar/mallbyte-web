"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  getStockMovements,
  getStocks,
  getWarehouses,
  type StockListItem,
  type StockMovementDetail,
  type StockMovementListItem,
  type WarehouseListItem,
} from "@/features/inventory/api";
import { StockAdjustmentModal } from "@/features/inventory/components/stock-adjustment-modal";
import { StockMovementHistory } from "@/features/inventory/components/stock-movement-history";
import { getApiErrorMessage } from "@/lib/api/errors";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function AdminInventoryList() {
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [warehouses, setWarehouses] = useState<
    WarehouseListItem[]
  >([]);
  const [movements, setMovements] = useState<
    StockMovementListItem[]
  >([]);

  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] =
    useState("all");
  const [lowStockOnly, setLowStockOnly] =
    useState(false);

  const [selectedStock, setSelectedStock] =
    useState<StockListItem | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      try {
        const [
          stockData,
          warehouseData,
          movementData,
        ] = await Promise.all([
          getStocks(),
          getWarehouses(),
          getStockMovements(),
        ]);

        if (cancelled) {
          return;
        }

        setStocks(stockData);
        setWarehouses(warehouseData);
        setMovements(movementData);
      } catch (caughtError) {
        if (!cancelled) {
          setError(getApiErrorMessage(caughtError));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInventory();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshInventoryData() {
    try {
      setError("");

      const [stockData, movementData] =
        await Promise.all([
          getStocks(),
          getStockMovements(),
        ]);

      setStocks(stockData);
      setMovements(movementData);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    }
  }

  async function handleMovementCreated(
    movement: StockMovementDetail,
  ) {
    setMessage(
      `${movement.product_name} stock updated from ${movement.before_quantity} to ${movement.after_quantity}.`,
    );

    setSelectedStock(null);

    await refreshInventoryData();
  }

  const filteredStocks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return stocks.filter((stock) => {
      const matchesSearch =
        !normalizedSearch ||
        stock.product_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        stock.product_sku
          .toLowerCase()
          .includes(normalizedSearch) ||
        stock.warehouse_name
          .toLowerCase()
          .includes(normalizedSearch) ||
        stock.warehouse_code
          .toLowerCase()
          .includes(normalizedSearch);

      const matchesWarehouse =
        warehouseFilter === "all" ||
        stock.warehouse === Number(warehouseFilter);

      const matchesLowStock =
        !lowStockOnly || stock.is_low_stock;

      return (
        matchesSearch &&
        matchesWarehouse &&
        matchesLowStock
      );
    });
  }, [
    stocks,
    search,
    warehouseFilter,
    lowStockOnly,
  ]);

  const totalQuantity = stocks.reduce(
    (total, stock) => total + stock.quantity,
    0,
  );

  const reservedQuantity = stocks.reduce(
    (total, stock) =>
      total + stock.reserved_quantity,
    0,
  );

  const availableQuantity = stocks.reduce(
    (total, stock) =>
      total + stock.available_quantity,
    0,
  );

  const lowStockCount = stocks.filter(
    (stock) => stock.is_low_stock,
  ).length;

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Admin
            </p>

            <h1 className="mt-2 text-3xl font-semibold text-slate-950">
              Inventory management
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Monitor and adjust stock across warehouses,
              review reserved inventory, and audit inventory
              movements.
            </p>
          </div>

          <Link
            href="/admin"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Admin dashboard
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {message ? (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        ) : null}

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Total stock
            </p>

            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {totalQuantity.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Across {stocks.length} stock records
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Available
            </p>

            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {availableQuantity.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Ready for new orders
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Reserved
            </p>

            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {reservedQuantity.toLocaleString()}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Reserved by pending orders
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Low stock
            </p>

            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {lowStockCount}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Requires attention
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Stock
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current product inventory across active
              warehouses.
            </p>
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_240px_auto]">
            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search product, SKU, or warehouse..."
              className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
            />

            <select
              value={warehouseFilter}
              onChange={(event) =>
                setWarehouseFilter(event.target.value)
              }
              className="h-11 rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-slate-400"
            >
              <option value="all">
                All warehouses
              </option>

              {warehouses.map((warehouse) => (
                <option
                  key={warehouse.id}
                  value={warehouse.id}
                >
                  {warehouse.name} ({warehouse.code})
                </option>
              ))}
            </select>

            <label className="flex h-11 cursor-pointer items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(event) =>
                  setLowStockOnly(
                    event.target.checked,
                  )
                }
                className="h-4 w-4"
              />
              Low stock only
            </label>
          </div>

          {isLoading ? (
            <p className="mt-6 text-sm text-slate-500">
              Loading inventory...
            </p>
          ) : filteredStocks.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-slate-50 p-5">
              <p className="text-sm font-medium text-slate-700">
                No stock records found.
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Try changing the search or warehouse
                filters.
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded-2xl border border-slate-200">
              <div className="min-w-[1160px]">
                <div className="grid grid-cols-[1.7fr_1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_0.9fr_auto] gap-4 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <span>Product</span>
                  <span>Warehouse</span>
                  <span>Total</span>
                  <span>Reserved</span>
                  <span>Available</span>
                  <span>Threshold</span>
                  <span>Status</span>
                  <span />
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredStocks.map((stock) => (
                    <div
                      key={stock.id}
                      className="grid grid-cols-[1.7fr_1.2fr_0.7fr_0.7fr_0.7fr_0.7fr_0.9fr_auto] gap-4 px-4 py-4 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-950">
                          {stock.product_name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          SKU: {stock.product_sku}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Updated{" "}
                          {formatDate(
                            stock.last_updated,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="font-medium text-slate-800">
                          {stock.warehouse_name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {stock.warehouse_code}
                        </p>
                      </div>

                      <p className="font-medium text-slate-900">
                        {stock.quantity}
                      </p>

                      <p className="text-slate-600">
                        {stock.reserved_quantity}
                      </p>

                      <p className="font-semibold text-slate-950">
                        {stock.available_quantity}
                      </p>

                      <p className="text-slate-600">
                        {stock.low_stock_threshold}
                      </p>

                      <div>
                        {stock.is_low_stock ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                            Low stock
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            Healthy
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setMessage("");
                          setSelectedStock(stock);
                        }}
                        className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                      >
                        Adjust
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isLoading && stocks.length > 0 ? (
            <p className="mt-4 text-xs text-slate-500">
              Showing {filteredStocks.length} of{" "}
              {stocks.length} stock records.
            </p>
          ) : null}
        </section>

        <StockMovementHistory
          movements={movements}
          warehouses={warehouses}
          isLoading={isLoading}
        />
      </main>

      {selectedStock ? (
        <StockAdjustmentModal
          key={selectedStock.id}
          stock={selectedStock}
          onClose={() => setSelectedStock(null)}
          onCreated={handleMovementCreated}
        />
      ) : null}
    </>
  );
}