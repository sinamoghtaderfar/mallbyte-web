import type { AuthUser } from "./types";

export function isAdminUser(user: AuthUser | null) {
  return Boolean(user?.is_staff || user?.is_superuser);
}

export function isSellerUser(user: AuthUser | null) {
  return Boolean(user?.is_seller);
}
