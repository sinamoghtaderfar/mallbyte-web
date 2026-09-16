import type { ReactNode } from "react";

import { SiteShell } from "@/components/layout/site-shell";
import { SellerOnlyRoute } from "@/features/auth/components/seller-only-route";

type SellerReturnsLayoutProps = {
  children: ReactNode;
};

export default function SellerReturnsLayout({
  children,
}: SellerReturnsLayoutProps) {
  return (
    <SiteShell>
      <SellerOnlyRoute>{children}</SellerOnlyRoute>
    </SiteShell>
  );
}
