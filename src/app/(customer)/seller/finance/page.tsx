import { SiteShell } from "@/components/layout/site-shell";
import { SellerOnlyRoute } from "@/features/auth/components/seller-only-route";
import { SellerFinanceDashboard } from "@/features/settlements/components/seller-finance-dashboard";

export default function SellerFinancePage() {
  return (
    <SiteShell>
      <SellerOnlyRoute>
        <SellerFinanceDashboard />
      </SellerOnlyRoute>
    </SiteShell>
  );
}
