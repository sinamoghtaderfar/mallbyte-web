"use client";

import { useEffect, useState } from "react";

import { SiteShell } from "@/components/layout/site-shell";
import { AccessDenied } from "@/features/auth/components/access-denied";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  getStocks,
  getWarehouses,
  type StockListItem,
  type WarehouseListItem,
} from "@/features/inventory/api";
import { StockTransfersPanel } from "@/features/inventory/components/stock-transfers-panel";
import { getMyPermissions } from "@/features/rbac/api";
import { getApiErrorMessage } from "@/lib/api/errors";

export default function WarehouseTransfersPage() {
  const user = useAuthStore((state) => state.user);
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const bootstrapped = useAuthStore((state) => state.isBootstrapped);
  const authLoading = useAuthStore((state) => state.isLoading);
  const userId = user?.id;
  const isSuperuser = Boolean(user?.is_superuser);
  const [access, setAccess] = useState<"loading" | "granted" | "denied">(
    "loading",
  );
  const [stocks, setStocks] = useState<StockListItem[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseListItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!bootstrapped || authLoading) return;
    if (!authenticated || userId == null) {
      setAccess("denied");
      return;
    }
    let cancelled = false;
    setAccess("loading");

    async function load() {
      try {
        const myPermissions = await getMyPermissions();
        if (cancelled) return;
        if (
          !myPermissions.permissions.includes("view_inventory") &&
          !isSuperuser
        ) {
          setAccess("denied");
          return;
        }
        const [stockData, warehouseData] = await Promise.all([
          getStocks(),
          getWarehouses(),
        ]);
        if (cancelled) return;
        setStocks(stockData);
        setWarehouses(warehouseData);
        setAccess("granted");
      } catch (caughtError) {
        if (!cancelled) {
          setError(getApiErrorMessage(caughtError));
          setAccess("denied");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [authenticated, bootstrapped, authLoading, userId, isSuperuser]);

  async function refreshInventory() {
    const data = await getStocks();
    setStocks(data);
  }

  return (
    <SiteShell>
      {!bootstrapped || authLoading || access === "loading" ? (
        <main className="mx-auto max-w-7xl px-4 py-10 text-sm text-slate-500">
          Checking warehouse access...
        </main>
      ) : access === "denied" ? (
        <>
          {error ? (
            <p
              role="alert"
              className="mx-auto max-w-3xl px-4 pt-8 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}
          <AccessDenied
            title={
              authenticated ? "Inventory access required" : "Sign in required"
            }
            description="You need an active inventory role to open the warehouse transfer workspace."
          />
        </>
      ) : (
        <main className="mx-auto max-w-7xl px-4 py-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Warehouse operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            Transfer workspace
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Request, approve, ship and receive stock transfers. Actions depend
            on your permissions and assigned warehouses; the server verifies
            each operation.
          </p>
          <StockTransfersPanel
            stocks={stocks}
            warehouses={warehouses}
            onInventoryChanged={refreshInventory}
          />
        </main>
      )}
    </SiteShell>
  );
}
