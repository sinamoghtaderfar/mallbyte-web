"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api/errors";

import { getOrder } from "../api";
import type { OrderDetail as OrderDetailType } from "../types";

function formatPrice(value: string | number | null | undefined) {
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

export function OrderDetail() {
  const params = useParams<{ id: string }>();

  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadOrder() {
      setIsLoading(true);
      setError("");

      try {
        const data = await getOrder(params.id);

        if (isMounted) {
          setOrder(data);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm text-slate-500">Loading order...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-red-800">
          Could not load order
        </h1>
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-950">
          Order not found
        </h1>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-500">
              Order
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              {order.order_number}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Created at {new Date(order.created_at).toLocaleString()}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
            {order.status_display}
          </div>
        </div>

        <div className="mt-8 divide-y divide-slate-100">
          {order.items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  {item.product_name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  SKU: {item.product_sku}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Quantity: {item.quantity}
                </p>
              </div>

              <p className="text-sm font-semibold text-slate-950">
                {formatPrice(item.total_price)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/orders"
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Back to orders
          </Link>

          <Link
            href="/products"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Continue shopping
          </Link>
        </div>
      </section>

      <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-950">Summary</h2>

        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Subtotal</p>
            <p className="text-sm font-medium text-slate-950">
              {formatPrice(order.subtotal)}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Discount</p>
            <p className="text-sm font-medium text-slate-950">
              {formatPrice(order.discount_amount)}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Shipping</p>
            <p className="text-sm font-medium text-slate-950">
              {formatPrice(order.shipping_cost)}
            </p>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-950">Total</p>
            <p className="text-lg font-semibold text-slate-950">
              {formatPrice(order.total_amount)}
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-950">
            Receiver information
          </h3>

          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>{order.receiver_name}</p>
            <p>{order.receiver_phone}</p>
            <p>
              {order.province}, {order.city}
            </p>
            <p>{order.address}</p>
            <p>{order.postal_code}</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
