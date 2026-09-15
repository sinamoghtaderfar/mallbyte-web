"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getReturns } from "@/features/returns/api";

type CustomerReturn = Awaited<ReturnType<typeof getReturns>>[number] & {
  id: number;
  order?: number | string;
  order_id?: number | string;
  order_number?: string;
  request_number?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

type OrderReturnBadgeProps = {
  orderId: number | string;
  orderNumber?: string;
  showLink?: boolean;
  className?: string;
};

type OrderReturnStatusCardProps = {
  orderId: number | string;
  orderNumber?: string;
};

const statusConfig: Record<
  string,
  {
    label: string;
    description: string;
    className: string;
  }
> = {
  submitted: {
    label: "Return submitted",
    description: "MallByte support has received the return request.",
    className: "bg-blue-50 text-blue-700",
  },
  under_review: {
    label: "Return under review",
    description: "MallByte support is reviewing the return request.",
    className: "bg-blue-50 text-blue-700",
  },
  approved: {
    label: "Return approved",
    description: "The return was approved. The item can be sent back.",
    className: "bg-green-50 text-green-700",
  },
  waiting_for_item: {
    label: "Waiting for returned item",
    description: "MallByte is waiting to receive the returned item.",
    className: "bg-amber-50 text-amber-700",
  },
  item_received: {
    label: "Item received",
    description: "The returned item has been received.",
    className: "bg-green-50 text-green-700",
  },
  inspecting: {
    label: "Return inspection",
    description: "The returned item is being inspected.",
    className: "bg-amber-50 text-amber-700",
  },
  refund_pending: {
    label: "Refund pending",
    description: "The refund is being prepared.",
    className: "bg-amber-50 text-amber-700",
  },
  refunded: {
    label: "Refunded",
    description: "The refund has been completed.",
    className: "bg-green-50 text-green-700",
  },
  rejected: {
    label: "Return rejected",
    description: "The return request was rejected.",
    className: "bg-red-50 text-red-700",
  },
  cancelled: {
    label: "Return cancelled",
    description: "The return request was cancelled.",
    className: "bg-slate-100 text-slate-600",
  },
  closed: {
    label: "Return closed",
    description: "The return request is closed.",
    className: "bg-slate-100 text-slate-600",
  },
};

const statusPriority: Record<string, number> = {
  refund_pending: 90,
  item_received: 80,
  inspecting: 75,
  waiting_for_item: 70,
  approved: 60,
  under_review: 50,
  submitted: 40,
  refunded: 30,
  rejected: 20,
  cancelled: 10,
  closed: 5,
};

let customerReturnsPromise: Promise<CustomerReturn[]> | null = null;

function loadCustomerReturns() {
  customerReturnsPromise ??= getReturns().then((returns) =>
    returns.map((returnRequest) => returnRequest as CustomerReturn),
  );

  return customerReturnsPromise;
}

function getReturnOrderId(returnRequest: CustomerReturn) {
  return String(returnRequest.order ?? returnRequest.order_id ?? "");
}

function getReturnOrderNumber(returnRequest: CustomerReturn) {
  return returnRequest.order_number ?? "";
}

function matchesOrder(
  returnRequest: CustomerReturn,
  orderId: number | string,
  orderNumber?: string,
) {
  const normalizedOrderId = String(orderId);
  const normalizedOrderNumber = orderNumber ?? "";

  return (
    getReturnOrderId(returnRequest) === normalizedOrderId ||
    (normalizedOrderNumber.length > 0 &&
      getReturnOrderNumber(returnRequest) === normalizedOrderNumber)
  );
}

function pickMostRelevantReturn(
  returns: CustomerReturn[],
  orderId: number | string,
  orderNumber?: string,
) {
  const matches = returns.filter((returnRequest) =>
    matchesOrder(returnRequest, orderId, orderNumber),
  );

  return matches.sort((first, second) => {
    const firstPriority = statusPriority[first.status ?? ""] ?? 0;
    const secondPriority = statusPriority[second.status ?? ""] ?? 0;

    if (firstPriority !== secondPriority) {
      return secondPriority - firstPriority;
    }

    return (
      new Date(second.updated_at ?? second.created_at ?? 0).getTime() -
      new Date(first.updated_at ?? first.created_at ?? 0).getTime()
    );
  })[0];
}

function getStatusConfig(status?: string) {
  if (!status) {
    return null;
  }

  return (
    statusConfig[status] ?? {
      label: status,
      description: "Return request status is available.",
      className: "bg-slate-100 text-slate-600",
    }
  );
}

export function OrderReturnBadge({
  orderId,
  orderNumber,
  showLink = false,
  className = "",
}: OrderReturnBadgeProps) {
  const [returnRequest, setReturnRequest] = useState<CustomerReturn | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadReturnStatus() {
      try {
        const returns = await loadCustomerReturns();
        const matchingReturn = pickMostRelevantReturn(
          returns,
          orderId,
          orderNumber,
        );

        if (isMounted) {
          setReturnRequest(matchingReturn ?? null);
        }
      } catch {
        if (isMounted) {
          setReturnRequest(null);
        }
      }
    }

    void loadReturnStatus();

    return () => {
      isMounted = false;
    };
  }, [orderId, orderNumber]);

  const config = getStatusConfig(returnRequest?.status);

  if (!returnRequest || !config) {
    return null;
  }

  const badgeClassName = [
    "inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-medium",
    config.className,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (showLink) {
    return (
      <Link href={`/returns/${returnRequest.id}`} className={badgeClassName}>
        {config.label}
      </Link>
    );
  }

  return <span className={badgeClassName}>{config.label}</span>;
}

export function OrderReturnStatusCard({
  orderId,
  orderNumber,
}: OrderReturnStatusCardProps) {
  const [returnRequest, setReturnRequest] = useState<CustomerReturn | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadReturnStatus() {
      try {
        const returns = await loadCustomerReturns();
        const matchingReturn = pickMostRelevantReturn(
          returns,
          orderId,
          orderNumber,
        );

        if (isMounted) {
          setReturnRequest(matchingReturn ?? null);
        }
      } catch {
        if (isMounted) {
          setReturnRequest(null);
        }
      }
    }

    void loadReturnStatus();

    return () => {
      isMounted = false;
    };
  }, [orderId, orderNumber]);

  const config = getStatusConfig(returnRequest?.status);

  if (!returnRequest || !config) {
    return null;
  }

  return (
    <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Return status
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {config.label}
          </h2>
          <p className="mt-1 text-sm text-slate-600">{config.description}</p>
          {returnRequest.request_number ? (
            <p className="mt-2 text-sm text-slate-500">
              Request {returnRequest.request_number}
            </p>
          ) : null}
        </div>

        <Link
          href={`/returns/${returnRequest.id}`}
          className="inline-flex h-11 items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          View return
        </Link>
      </div>
    </div>
  );
}

type OrderReturnActionButtonProps = {
  orderId: number | string;
  orderNumber?: string;
  canRequestReturn: boolean;
};

export function OrderReturnActionButton({
  orderId,
  orderNumber,
  canRequestReturn,
}: OrderReturnActionButtonProps) {
  const [hasLoaded, setHasLoaded] = useState(false);
  const [returnRequest, setReturnRequest] = useState<CustomerReturn | null>(
    null,
  );

  useEffect(() => {
    let isMounted = true;

    async function loadReturnStatus() {
      try {
        const returns = await loadCustomerReturns();
        const matchingReturn = pickMostRelevantReturn(
          returns,
          orderId,
          orderNumber,
        );

        if (isMounted) {
          setReturnRequest(matchingReturn ?? null);
        }
      } catch {
        if (isMounted) {
          setReturnRequest(null);
        }
      } finally {
        if (isMounted) {
          setHasLoaded(true);
        }
      }
    }

    void loadReturnStatus();

    return () => {
      isMounted = false;
    };
  }, [orderId, orderNumber]);

  if (!canRequestReturn || !hasLoaded || returnRequest) {
    return null;
  }

  return (
    <Link
      href={`/orders/${orderId}/return`}
      className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
    >
      Request return
    </Link>
  );
}
