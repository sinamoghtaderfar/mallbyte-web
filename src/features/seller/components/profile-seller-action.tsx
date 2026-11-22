"use client";

import { isAxiosError } from "axios";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { getSellerStatus } from "../api";
import type { SellerStatus } from "../types";

const applicationStatusAction = {
  label: "View Application Status",
  href: "/seller/status",
};

const actions = {
  pending: {
    ...applicationStatusAction,
    description: "Your application is awaiting review.",
  },
  rejected: {
    ...applicationStatusAction,
    description: "Review the decision on your seller application.",
  },
  approved: {
    label: "Go to Seller Dashboard",
    href: "/seller/dashboard",
    description: "Manage your store, products, and orders.",
  },
  suspended: {
    label: "View Seller Status",
    href: "/seller/status",
    description:
      "Your seller account is suspended. View your status for details.",
  },
} satisfies Record<
  SellerStatus,
  { label: string; href: string; description: string }
>;

const noApplicationAction = {
  label: "Become a Seller",
  href: "/seller/apply",
  description:
    "Create your seller profile and submit an application for review.",
};

type State = SellerStatus | "none" | "loading" | "error";

async function loadStatus(): Promise<State> {
  try {
    const { status } = await getSellerStatus();
    return Object.hasOwn(actions, status) ? status : "error";
  } catch (error) {
    return isAxiosError(error) &&
      error.config?.url === API_ENDPOINTS.auth.sellerStatus &&
      error.response?.status === 404
      ? "none"
      : "error";
  }
}

export function ProfileSellerAction() {
  const [state, setState] = useState<State>("loading");
  const [attempt, setAttempt] = useState(0);
  // Share the request across effect replays. The profile keys this component
  // by account, and a revisit starts a fresh lookup after an application.
  const request = useRef<Promise<State> | null>(null);

  useEffect(() => {
    let active = true;
    request.current ??= loadStatus();
    void request.current.then((result) => {
      if (active) setState(result);
    });
    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    request.current = null;
    setState("loading");
    setAttempt((previous) => previous + 1);
  }

  const action =
    state === "none"
      ? noApplicationAction
      : state === "loading" || state === "error"
        ? null
        : actions[state];

  return (
    <section
      aria-label="Selling on MallByte"
      className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-line bg-background p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div>
        <h2 className="text-base font-semibold text-foreground">
          Selling on MallByte
        </h2>
        {state === "loading" && (
          <p role="status" className="mt-1 text-sm text-muted">
            Checking your seller status…
          </p>
        )}
        {state === "error" && (
          <p role="alert" className="mt-1 text-sm text-danger">
            Could not check your seller status. Please try again.
          </p>
        )}
        {action && (
          <p className="mt-1 text-sm text-muted">{action.description}</p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          prefetch={false}
          className="mb-btn mb-btn-primary w-full sm:w-auto sm:shrink-0"
        >
          {action.label}
        </Link>
      )}
      {state === "error" && (
        <button
          type="button"
          onClick={retry}
          className="mb-btn mb-btn-secondary"
        >
          Retry seller status
        </button>
      )}
    </section>
  );
}
