import type { AuthUser } from "./types";

export function isAdminUser(user: AuthUser | null) {
  return Boolean(user?.is_staff || user?.is_superuser);
}

export function isSellerUser(user: AuthUser | null) {
  return Boolean(user?.is_seller);
}

export function getAccountTypeLabel(user: AuthUser | null) {
  if (!user) {
    return "Guest";
  }

  if (isAdminUser(user)) {
    return "Platform admin";
  }

  if (isSellerUser(user)) {
    return "Seller";
  }

  return "Customer";
}
