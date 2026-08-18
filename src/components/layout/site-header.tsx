"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { logout } from "@/features/auth/api";
import { useAuthStore } from "@/features/auth/auth-store";
import { useCartStore } from "@/features/cart/cart-store";
import { CartLink } from "@/features/cart/components/cart-link";
import { getApiErrorMessage } from "@/lib/api/errors";

const navItems = [
  {
    href: "/",
    label: "Home",
  },
  {
    href: "/products",
    label: "Products",
  },
  {
    href: "/profile",
    label: "Profile",
  },
];

function getLinkClass(isActive: boolean) {
  return [
    "rounded-2xl px-4 py-2 text-sm font-medium transition",
    isActive
      ? "bg-slate-900 text-white"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  ].join(" ");
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const clearCartState = useCartStore((state) => state.clearCartState);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState("");

  async function handleLogout() {
    setError("");
    setIsLoggingOut(true);

    try {
      await logout();
    } catch (logoutError) {
      setError(getApiErrorMessage(logoutError));
    } finally {
      clearAuth();
      clearCartState();
      setIsLoggingOut(false);
      router.push("/auth");
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight text-slate-950"
          >
            MallByte
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={getLinkClass(pathname === item.href)}
              >
                {item.label}
              </Link>
            ))}

            {user?.is_seller ? (
              <Link
                href="/seller"
                className={getLinkClass(pathname.startsWith("/seller"))}
              >
                Seller
              </Link>
            ) : null}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <CartLink />

          {error ? (
            <p className="hidden text-sm text-red-600 lg:block">{error}</p>
          ) : null}

          {isAuthenticated && user ? (
            <>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-slate-900">
                  {user.full_name || "MallByte User"}
                </p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="h-10 rounded-2xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>
            </>
          ) : (
            <Link
              href="/auth"
              className="inline-flex h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
