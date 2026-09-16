import type { ReactNode } from "react";

import { SellerOnlyRoute } from "@/features/auth/components/seller-only-route";

type SellerStoreLayoutProps = {
  children: ReactNode;
};

export default function SellerStoreLayout({
  children,
}: SellerStoreLayoutProps) {
  return <SellerOnlyRoute>{children}</SellerOnlyRoute>;
}
