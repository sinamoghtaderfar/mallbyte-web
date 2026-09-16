import type { ReactNode } from "react";

import { SellerOnlyRoute } from "@/features/auth/components/seller-only-route";

type SellerOrdersLayoutProps = {
  children: ReactNode;
};

export default function SellerOrdersLayout({
  children,
}: SellerOrdersLayoutProps) {
  return <SellerOnlyRoute>{children}</SellerOnlyRoute>;
}
