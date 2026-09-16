import type { ReactNode } from "react";

import { SellerOnlyRoute } from "@/features/auth/components/seller-only-route";

type SellerDashboardLayoutProps = {
  children: ReactNode;
};

export default function SellerDashboardLayout({
  children,
}: SellerDashboardLayoutProps) {
  return <SellerOnlyRoute>{children}</SellerOnlyRoute>;
}
