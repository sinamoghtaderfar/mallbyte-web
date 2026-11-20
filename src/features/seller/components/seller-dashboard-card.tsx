"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ArrowUpRight, BarChart3, CircleDollarSign, ClipboardList, Package, PackagePlus, Percent, RotateCcw, Settings2, ShoppingCart, Wallet } from "lucide-react";

import { StatusBadge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { StatCard } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/states";
import { getApiErrorMessage } from "@/lib/api/errors";

import { getSellerDashboard } from "../api";
import type { Seller } from "../types";

function formatMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return "0";
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(numberValue);
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString();
}

export function SellerDashboardCard() {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getSellerDashboard();

        if (isMounted) {
          setSeller(data);
        }
      } catch (dashboardError) {
        if (isMounted) {
          setError(getApiErrorMessage(dashboardError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div role="status" className="space-y-6">
        <span className="sr-only">Loading seller dashboard...</span>
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}</div>
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-rose-900">
          Seller dashboard is not available
        </h1>

        <p role="alert" className="mt-2 text-sm text-rose-800">{error}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/seller/returns"
            className="mb-btn mb-btn-secondary"
          >
            View returns
          </Link>

          <Link
            href="/seller/status"
            className="mb-btn mb-btn-primary"
          >
            Check seller status
          </Link>

          <Link
            href="/seller/apply"
            className="mb-btn mb-btn-secondary"
          >
            Apply as seller
          </Link>
        </div>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8">
        <h1 className="text-xl font-semibold text-slate-950">
          Seller profile not found
        </h1>
      </div>
    );
  }

  const actions = [
    { href: "/seller/products/new", label: "Add a product", text: "Create a listing with images and variants", icon: PackagePlus },
    { href: "/seller/products", label: "Manage products", text: "Edit catalog, pricing and stock", icon: Package },
    { href: "/seller/orders", label: "View orders", text: "Fulfil and update order items", icon: ClipboardList },
    { href: "/seller/returns", label: "View returns", text: "Review return requests", icon: RotateCcw },
    { href: "/seller/analytics", label: "Sales analytics", text: "Sales trends and top products", icon: BarChart3 },
    { href: "/seller/finance", label: "Financial statement", text: "Ledger balances, payout eligibility", icon: Wallet },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <p className="mb-eyebrow">
              Seller dashboard
            </p>
            <StatusBadge status={seller.status} label={seller.status} className="capitalize" />
          </div>

          <h1 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.02em] text-slate-950 sm:text-[2rem]">
            {seller.store_name}
          </h1>

          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">
            {seller.description || "No store description yet."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/seller/store" className={buttonStyles({ variant: "secondary" })}>
            <Settings2 size={16} aria-hidden="true" />Edit store settings
          </Link>
          <Link href="/seller/products/new" className={buttonStyles()}>
            <PackagePlus size={16} aria-hidden="true" />New product
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard tone="ink" label="Total sales" value={formatMoney(seller.total_sales)} icon={<CircleDollarSign size={16} />} hint="Lifetime, as reported by the store record" />
        <StatCard label="Orders" value={seller.total_orders} icon={<ShoppingCart size={16} />} hint="Total orders containing your products" />
        <StatCard label="Balance" value={formatMoney(seller.balance)} icon={<Wallet size={16} />} hint="See Finance for ledger details" />
        <StatCard label="Commission" value={`${formatMoney(seller.commission_rate)}%`} icon={<Percent size={16} />} hint="Platform commission rate" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="seller-actions-heading" className="mb-card p-5 sm:p-6">
          <h2 id="seller-actions-heading" className="text-base font-semibold text-slate-950">Workspace</h2>
          <p className="mt-1 text-sm text-muted">Everything you need to run your store.</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {actions.map(({ href, label, text, icon: Icon }) => (
              <li key={href}>
                <Link href={href} className="group flex h-full items-start gap-3.5 rounded-xl border border-line p-4 transition hover:border-line-strong hover:bg-slate-50">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800 transition group-hover:bg-ink group-hover:text-white" aria-hidden="true"><Icon size={17} strokeWidth={1.8} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-950">{label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-muted">{text}</span>
                  </span>
                  <ArrowUpRight size={15} className="shrink-0 text-slate-400 transition group-hover:text-ink" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <aside aria-labelledby="seller-profile-heading" className="mb-card h-fit p-5 sm:p-6">
          <h2 id="seller-profile-heading" className="text-base font-semibold text-slate-950">Store profile</h2>
          <dl className="mt-4 divide-y divide-line text-sm">
            <div className="py-3">
              <dt className="text-xs text-muted">Business email</dt>
              <dd className="mt-0.5 font-medium text-slate-950 [overflow-wrap:anywhere]">{seller.business_email}</dd>
            </div>
            {seller.business_phone ? <div className="py-3">
              <dt className="text-xs text-muted">Business phone</dt>
              <dd className="mt-0.5 font-medium text-slate-950">{seller.business_phone}</dd>
            </div> : null}
            <div className="py-3">
              <dt className="text-xs text-muted">Verified at</dt>
              <dd className="mt-0.5 font-medium text-slate-950">{formatDate(seller.verified_at)}</dd>
            </div>
          </dl>
          <Link href="/seller/status" className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-medium text-ink underline-offset-4 hover:underline">
            View status<ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
