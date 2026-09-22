"use client";

import { useEffect, useState } from "react";

import { SiteShell } from "@/components/layout/site-shell";
import { useAuthStore } from "@/features/auth/auth-store";
import { AccessDenied } from "@/features/auth/components/access-denied";
import {
  getStocks,
  getWarehouses,
  type StockListItem,
  type WarehouseListItem,
} from "@/features/inventory/api";
import { StockTransfersPanel } from "@/features/inventory/components/stock-transfers-panel";
import { getMyPermissions } from "@/features/rbac/api";
import { getApiErrorMessage } from "@/lib/api/errors";

type AccessResult =
  | {
      userId: number;
      isSuperuser: boolean;
      status: "granted";
      stocks: StockListItem[];
      warehouses: WarehouseListItem[];
      error: "";
    }
  | {
      userId: number;
      isSuperuser: boolean;
      status: "denied";
      error: string;
    };

export default function WarehouseTransfersPage() {
  const user = useAuthStore((state) => state.user);
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const bootstrapped = useAuthStore((state) => state.isBootstrapped);
  const authLoading = useAuthStore((state) => state.isLoading);

  const userId = user?.id;
  const isSuperuser = Boolean(user?.is_superuser);

  const [accessResult, setAccessResult] = useState<AccessResult | null>(null);

  // Only use data belonging to the currently authenticated user.
  const currentResult =
    authenticated &&
    userId != null &&
    accessResult?.userId === userId &&
    accessResult.isSuperuser === isSuperuser
      ? accessResult
      : null;

  const access =
    !authenticated || userId == null
      ? "denied"
      : (currentResult?.status ?? "loading");

  const error = currentResult?.error ?? "";

  const stocks =
    currentResult?.status === "granted" ? currentResult.stocks : [];

  const warehouses =
    currentResult?.status === "granted" ? currentResult.warehouses : [];

  useEffect(() => {
    if (!bootstrapped || authLoading || !authenticated || userId == null) {
      return;
    }

    let cancelled = false;
    const requestedUserId = userId;
    const requestedIsSuperuser = isSuperuser;

    async function load() {
      try {
        const myPermissions = await getMyPermissions();

        if (cancelled) return;

        const canViewInventory =
          requestedIsSuperuser ||
          myPermissions.permissions.includes("view_inventory");

        if (!canViewInventory) {
          setAccessResult({
            userId: requestedUserId,
            isSuperuser: requestedIsSuperuser,
            status: "denied",
            error: "",
          });

          return;
        }

        const [stockData, warehouseData] = await Promise.all([
          getStocks(),
          getWarehouses(),
        ]);

        if (cancelled) return;

        setAccessResult({
          userId: requestedUserId,
          isSuperuser: requestedIsSuperuser,
          status: "granted",
          stocks: stockData,
          warehouses: warehouseData,
          error: "",
        });
      } catch (caughtError) {
        if (cancelled) return;

        setAccessResult({
          userId: requestedUserId,
          isSuperuser: requestedIsSuperuser,
          status: "denied",
          error: getApiErrorMessage(caughtError),
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [authenticated, bootstrapped, authLoading, userId, isSuperuser]);

  async function refreshInventory() {
    if (!authenticated || userId == null || access !== "granted") {
      return;
    }

    const requestedUserId = userId;
    const requestedIsSuperuser = isSuperuser;

    const stockData = await getStocks();

    setAccessResult((previous) => {
      if (
        previous?.status !== "granted" ||
        previous.userId !== requestedUserId ||
        previous.isSuperuser !== requestedIsSuperuser
      ) {
        return previous;
      }

      return {
        ...previous,
        stocks: stockData,
      };
    });
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
            key={`${userId}-${isSuperuser}`}
            stocks={stocks}
            warehouses={warehouses}
            onInventoryChanged={refreshInventory}
          />
        </main>
      )}
    </SiteShell>
  );
}
