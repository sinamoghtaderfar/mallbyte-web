"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import {
  type AdminSeller,
  getAdminSeller,
  rejectAdminSeller,
  verifyAdminSeller,
} from "@/features/admin-sellers/api";
import { getApiErrorMessage } from "@/lib/api/errors";

const statusLabels: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

function formatMoney(value: string) {
  return `${Number(value).toLocaleString()} IRR`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString();
}

function getSellerStoreLabel(seller: AdminSeller) {
  return (
    seller.store_name ||
    seller.business_name ||
    seller.business_email ||
    getSellerOwnerLabel(seller)
  );
}

function getSellerOwnerLabel(seller: AdminSeller) {
  if (seller.user_full_name || seller.user_email) {
    return seller.user_full_name || seller.user_email;
  }

  if (typeof seller.user === "object") {
    return seller.user.full_name || seller.user.email;
  }

  return String(seller.user);
}

export function AdminSellerDetail() {
  const params = useParams<{ id: string }>();
  const sellerId = params.id;

  const [seller, setSeller] = useState<AdminSeller | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadSeller() {
      try {
        setIsLoading(true);
        setError("");
        const data = await getAdminSeller(sellerId);

        if (isMounted) {
          setSeller(data);
        }
      } catch (caughtError) {
        if (isMounted) {
          setError(getApiErrorMessage(caughtError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadSeller();

    return () => {
      isMounted = false;
    };
  }, [sellerId]);

  async function handleVerify() {
    if (!seller) {
      return;
    }

    try {
      setIsWorking(true);
      setError("");
      setActionMessage("");

      const updatedSeller = await verifyAdminSeller(seller.id);
      setSeller(updatedSeller);
      setActionMessage("Seller approved.");
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setIsWorking(false);
    }
  }

  async function handleReject() {
    if (!seller) {
      return;
    }

    if (!rejectionReason.trim()) {
      setError("Please add a rejection reason before rejecting this seller.");
      return;
    }

    try {
      setIsWorking(true);
      setError("");
      setActionMessage("");

      const updatedSeller = await rejectAdminSeller(seller.id, {
        reason: rejectionReason.trim(),
      });

      setSeller(updatedSeller);
      setRejectionReason("");
      setActionMessage("Seller rejected.");
    } catch (caughtError) {
      setError(getApiErrorMessage(caughtError));
    } finally {
      setIsWorking(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-w-0">
        <p className="text-sm text-muted">Loading seller...</p>
      </main>
    );
  }

  if (error && !seller) {
    return (
      <main className="min-w-0">
        <Link
          href="/admin/sellers"
          className="inline-flex items-center text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back to sellers
        </Link>

        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </div>
      </main>
    );
  }

  if (!seller) {
    return null;
  }

  const canReview = seller.status === "pending";

  return (
    <main className="min-w-0">
      <Link
        href="/admin/sellers"
        className="inline-flex items-center text-sm font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        ← Back to sellers
      </Link>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="mb-eyebrow">
            Seller application
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-foreground sm:text-[1.75rem]">
            {getSellerStoreLabel(seller)}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {getSellerOwnerLabel(seller)}
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
          {statusLabels[seller.status] ?? seller.status}
        </span>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          {actionMessage}
        </div>
      ) : null}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="mb-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Business details
          </h2>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Business email</dt>
              <dd className="mt-1 font-medium text-foreground">
                {seller.business_email}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Phone</dt>
              <dd className="mt-1 font-medium text-foreground">
                {seller.business_phone || seller.phone || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Commission</dt>
              <dd className="mt-1 font-medium text-foreground">
                {seller.commission_rate}%
              </dd>
            </div>
            <div>
              <dt className="text-muted">Balance</dt>
              <dd className="mt-1 font-medium text-foreground">
                {formatMoney(seller.balance)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Total sales</dt>
              <dd className="mt-1 font-medium text-foreground">
                {formatMoney(seller.total_sales)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Total orders</dt>
              <dd className="mt-1 font-medium text-foreground">
                {seller.total_orders}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Created</dt>
              <dd className="mt-1 font-medium text-foreground">
                {formatDateTime(seller.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Verified</dt>
              <dd className="mt-1 font-medium text-foreground">
                {formatDateTime(seller.verified_at)}
              </dd>
            </div>
          </dl>

          {seller.rejection_reason ? (
            <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <p className="font-medium">Rejection reason</p>
              <p className="mt-1">{seller.rejection_reason}</p>
            </div>
          ) : null}
        </section>

        <aside className="mb-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">Admin review</h2>

          {canReview ? (
            <>
              <p className="mt-3 text-sm text-slate-600">
                Approve this seller after checking the business information, or
                reject it with a clear reason.
              </p>

              <button
                type="button"
                onClick={handleVerify}
                disabled={isWorking}
                className="mt-5 flex w-full mb-btn mb-btn-primary"
              >
                Approve seller
              </button>

              <label className="mt-5 block space-y-2 text-sm">
                <span className="font-medium text-slate-700">
                  Rejection reason
                </span>
                <textarea
                  value={rejectionReason}
                  onChange={(event) => setRejectionReason(event.target.value)}
                  disabled={isWorking}
                  rows={4}
                  placeholder="Explain why this seller application is rejected."
                  className="w-full mb-control"
                />
              </label>

              <button
                type="button"
                onClick={handleReject}
                disabled={isWorking}
                className="mt-3 flex w-full mb-btn mb-btn-secondary text-rose-700 hover:bg-rose-50"
              >
                Reject seller
              </button>
            </>
          ) : (
            <p className="mt-3 rounded-xl border border-line bg-sunken/60 p-4 text-sm text-slate-600">
              No review action is available for the current seller status.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
