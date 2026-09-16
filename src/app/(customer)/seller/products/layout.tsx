import type { ReactNode } from "react";

import { SellerOnlyRoute } from "@/features/auth/components/seller-only-route";

type SellerProductsLayoutProps = {
  children: ReactNode;
};

export default function SellerProductsLayout({
  children,
}: SellerProductsLayoutProps) {
  return <SellerOnlyRoute>{children}</SellerOnlyRoute>;
}
