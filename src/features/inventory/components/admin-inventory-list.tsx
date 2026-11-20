"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useAuthStore } from "@/features/auth/auth-store";
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
import { StockTransfersPanel } from "@/features/inventory/components/stock-transfers-panel";
import { getMyPermissions } from "@/features/rbac/api";
import { AlertTriangle, Boxes, Lock, PackageCheck, PackageSearch, Search, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, Notice, Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function AdminInventoryList() {
  const user = useAuthStore((state) => state.user);

  // A new account gets a fresh component, including fresh permissions,
  // inventory data, selected stock, and transfer panel state.
  if (!user) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10 text-sm text-slate-500">
        Sign in to view inventory.
      </main>
    );
  }

  return (
    <AdminInventoryContent
      key={`${user.id}:${Boolean(user.is_superuser)}`}
      userId={user.id}
      isSuperuser={Boolean(user.is_superuser)}
    />
  );
}

function AdminInventoryContent({
  userId,
  isSuperuser,
}: {
  userId: number;
  isSuperuser: boolean;
}) {
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseListItem[]>([]);
  const [movements, setMovements] = useState<StockMovementListItem[]>([]);

  const [permissions, setPermissions] = useState<string[]>([]);

  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [selectedStock, setSelectedStock] = useState<StockListItem | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canManageInventory =
    isSuperuser || permissions.includes("manage_inventory");

  useEffect(() => {
    let cancelled = false;

    async function loadInventory() {
      // Permissions are independent of the read-only inventory requests.
      // If RBAC is unavailable, fail closed for Adjust while still showing
      // the stock information that was retrieved successfully.
      const [stockResult, warehouseResult, movementResult, permissionResult] =
        await Promise.allSettled([
          getStocks(),
          getWarehouses(),
          getStockMovements(),
          getMyPermissions(),
        ]);

      if (cancelled) return;

      const errors: string[] = [];

      if (stockResult.status === "fulfilled") {
        setStocks(stockResult.value);
      } else {
        errors.push(getApiErrorMessage(stockResult.reason));
      }

      if (warehouseResult.status === "fulfilled") {
        setWarehouses(warehouseResult.value);
      } else {
        errors.push(getApiErrorMessage(warehouseResult.reason));
      }

      if (movementResult.status === "fulfilled") {
        setMovements(movementResult.value);
      } else {
        errors.push(getApiErrorMessage(movementResult.reason));
      }

      if (permissionResult.status === "fulfilled") {
        setPermissions(permissionResult.value.permissions);
      } else {
        // Never grant write actions when permission verification fails.
        setPermissions([]);
        errors.push(
          `Could not verify inventory permissions: ${getApiErrorMessage(permissionResult.reason)}`,
        );
      }

      setError(errors.join(" "));
      setIsLoading(false);
    }

    void loadInventory();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function refreshInventoryData() {
    try {
      setError("");

      const [stockData, movementData] = await Promise.all([
        getStocks(),
        getStockMovements(),
      ]);

      setStocks(stockData);
      setMovements(movementData);
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    }
  }

  async function handleMovementCreated(movement: StockMovementDetail) {
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
        stock.product_name.toLowerCase().includes(normalizedSearch) ||
        stock.product_sku.toLowerCase().includes(normalizedSearch) ||
        stock.warehouse_name.toLowerCase().includes(normalizedSearch) ||
        stock.warehouse_code.toLowerCase().includes(normalizedSearch);

      const matchesWarehouse =
        warehouseFilter === "all" ||
        stock.warehouse === Number(warehouseFilter);

      const matchesLowStock = !lowStockOnly || stock.is_low_stock;

      return matchesSearch && matchesWarehouse && matchesLowStock;
    });
  }, [stocks, search, warehouseFilter, lowStockOnly]);

  const totalQuantity = stocks.reduce(
    (total, stock) => total + stock.quantity,
    0,
  );

  const reservedQuantity = stocks.reduce(
    (total, stock) => total + stock.reserved_quantity,
    0,
  );

  const availableQuantity = stocks.reduce(
    (total, stock) => total + stock.available_quantity,
    0,
  );

  const lowStockCount = stocks.filter((stock) => stock.is_low_stock).length;

  return (
    <>
      <main className="grid gap-6">
        <PageHeader eyebrow="Admin" title="Inventory management"
          description="Monitor stock across warehouses, review reserved inventory, audit movements, and manage transfers."
          actions={<Link href="/admin" className={buttonStyles({ variant: "secondary" })}>Admin dashboard</Link>} />

        {error ? <Notice tone="danger">{error}</Notice> : null}
        {message ? <Notice tone="success">{message}</Notice> : null}

        <section aria-label="Inventory summary" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {isLoading ? [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[7.5rem] rounded-2xl" />) : <>
            <StatCard label="Total stock" value={totalQuantity.toLocaleString()} hint={`Across ${stocks.length} stock records`} icon={<Boxes size={16} />} />
            <StatCard label="Available" value={availableQuantity.toLocaleString()} hint="Ready for new orders" icon={<PackageCheck size={16} />} />
            <StatCard label="Reserved" value={reservedQuantity.toLocaleString()} hint="Reserved by pending orders" icon={<Lock size={16} />} />
            <StatCard label="Low stock" value={lowStockCount} hint="Requires attention" icon={<AlertTriangle size={16} />} tone={lowStockCount ? "brand" : "default"} />
          </>}
        </section>

        <Card padded={false} className="overflow-hidden">
          <div className="grid gap-4 p-5 sm:p-6">
            <CardHeader title="Stock" description="Current product inventory across active warehouses." />
            <div role="search" aria-label="Filter stock" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_15rem_auto]">
              <div className="relative">
                <Search size={17} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input type="search" aria-label="Search stock" value={search} onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search product, SKU, or warehouse..." className="pl-10" />
              </div>
              <Select aria-label="Warehouse" value={warehouseFilter} onChange={(event) => setWarehouseFilter(event.target.value)}>
                <option value="all">All warehouses</option>
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name} ({warehouse.code})</option>)}
              </Select>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line-strong/80 bg-surface px-3.5 text-sm font-medium text-foreground shadow-xs">
                <input type="checkbox" checked={lowStockOnly} onChange={(event) => setLowStockOnly(event.target.checked)} className="size-4" />
                Low stock only
              </label>
            </div>
          </div>

          {isLoading ? (
            <div role="status" className="grid gap-2 border-t border-line p-5">
              <span className="sr-only">Loading inventory...</span>
              {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
            </div>
          ) : filteredStocks.length === 0 ? (
            <div className="border-t border-line p-5">
              <EmptyState className="py-10" icon={<PackageSearch size={22} />} title="No stock records found."
                description="Try changing the search or warehouse filters." />
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-line">
              <table className="mb-table min-w-[60rem]">
                <thead>
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col">Warehouse</th>
                    <th scope="col" className="text-right">Total</th>
                    <th scope="col" className="text-right">Reserved</th>
                    <th scope="col" className="text-right">Available</th>
                    <th scope="col" className="text-right">Threshold</th>
                    <th scope="col">Status</th>
                    <th scope="col"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStocks.map((stock) => {
                    const ratio = stock.quantity > 0 ? Math.min(100, (stock.available_quantity / stock.quantity) * 100) : 0;
                    return (
                      <tr key={stock.id}>
                        <td>
                          <p className="font-medium text-foreground">{stock.product_name}</p>
                          <p className="mt-0.5 font-mono text-xs text-muted">SKU: {stock.product_sku}</p>
                          <p className="mt-0.5 text-xs text-muted">Updated {formatDate(stock.last_updated)}</p>
                        </td>
                        <td>
                          <p className="font-medium text-slate-800">{stock.warehouse_name}</p>
                          <p className="mt-0.5 font-mono text-xs text-muted">{stock.warehouse_code}</p>
                        </td>
                        <td className="text-right text-slate-800">{stock.quantity}</td>
                        <td className="text-right text-muted">{stock.reserved_quantity}</td>
                        <td className="text-right">
                          <span className="font-semibold text-foreground">{stock.available_quantity}</span>
                          <span className="mt-1.5 ml-auto block h-1 w-16 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                            <span className={`block h-full rounded-full ${stock.is_low_stock ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${ratio}%` }} />
                          </span>
                        </td>
                        <td className="text-right text-muted">{stock.low_stock_threshold}</td>
                        <td>
                          {stock.is_low_stock ? <Badge tone="warning" dot>Low stock</Badge> : <Badge tone="success" dot>Healthy</Badge>}
                        </td>
                        <td className="text-right">
                          {canManageInventory ? (
                            <Button size="small" variant="secondary"
                              onClick={() => { setMessage(""); setSelectedStock(stock); }}>
                              <SlidersHorizontal size={15} aria-hidden="true" />Adjust
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && stocks.length > 0 ? (
            <p className="border-t border-line px-5 py-3 text-xs text-muted" aria-live="polite" data-numeric>
              Showing {filteredStocks.length} of {stocks.length} stock records.
            </p>
          ) : null}
        </Card>

        <StockTransfersPanel
          key={`${userId}:${isSuperuser}`}
          stocks={stocks}
          warehouses={warehouses}
          onInventoryChanged={refreshInventoryData}
        />

        <StockMovementHistory
          movements={movements}
          warehouses={warehouses}
          isLoading={isLoading}
        />
      </main>

      {selectedStock && canManageInventory ? (
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
