"use client";

import { useAuthStore } from "../auth-store";
import { isAdminUser } from "../roles";
import { ProfileSellerAction } from "@/features/seller/components/profile-seller-action";

function getAccountTypeLabel(user: {
  is_seller?: boolean;
  is_staff?: boolean;
  is_superuser?: boolean;
}) {
  if (user.is_staff || user.is_superuser) {
    return "Platform admin";
  }

  if (user.is_seller) {
    return "Seller account";
  }

  return "Customer account";
}

export function ProfileCard() {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return null;
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 shadow-sm">
      <p className="mb-eyebrow">
        Profile
      </p>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
        {user.full_name || "MallByte User"}
      </h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="mb-eyebrow">
            Email
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {user.email}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="mb-eyebrow">
            Phone
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {user.phone || "Not added"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="mb-eyebrow">
            Email verified
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {user.email_verified ? "Yes" : "No"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <p className="mb-eyebrow">
            Account type
          </p>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {getAccountTypeLabel(user)}
          </p>
        </div>
      </div>

      {!isAdminUser(user) && <ProfileSellerAction key={user.id} />}
    </div>
  );
}
