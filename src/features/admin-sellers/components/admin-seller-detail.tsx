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
        rejection_reason: rejectionReason.trim(),
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
      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm text-slate-500">Loading seller...</p>
      </main>
    );
  }

  if (error && !seller) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <Link
          href="/admin/sellers"
          className="text-sm font-medium text-slate-600 hover:text-slate-950"
        >
          ← Back to sellers
        </Link>

        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link
        href="/admin/sellers"
        className="text-sm font-medium text-slate-600 hover:text-slate-950"
      >
        ← Back to sellers
      </Link>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Seller application
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950">
            {getSellerStoreLabel(seller)}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {getSellerOwnerLabel(seller)}
          </p>
        </div>

        <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
          {statusLabels[seller.status] ?? seller.status}
        </span>
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {actionMessage}
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">
            Business details
          </h2>

          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Business email</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {seller.business_email}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {seller.phone || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Commission</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {seller.commission_rate}%
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Balance</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {formatMoney(seller.balance)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Total sales</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {formatMoney(seller.total_sales)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Total orders</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {seller.total_orders}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Created</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {formatDateTime(seller.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Verified</dt>
              <dd className="mt-1 font-medium text-slate-950">
                {formatDateTime(seller.verified_at)}
              </dd>
            </div>
          </dl>

          {seller.rejection_reason ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">Rejection reason</p>
              <p className="mt-1">{seller.rejection_reason}</p>
            </div>
          ) : null}
        </section>

        <aside className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-950">Admin review</h2>

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
                className="mt-5 flex h-11 w-full items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                  rows={4}
                  placeholder="Explain why this seller application is rejected."
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-400"
                />
              </label>

              <button
                type="button"
                onClick={handleReject}
                disabled={isWorking}
                className="mt-3 flex h-11 w-full items-center justify-center rounded-2xl border border-red-200 px-5 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reject seller
              </button>
            </>
          ) : (
            <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              No review action is available for the current seller status.
            </p>
          )}
        </aside>
      </div>
    </main>
  );
}
