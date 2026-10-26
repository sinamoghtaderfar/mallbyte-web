
import { SiteShell } from "@/components/layout/site-shell";
import { SellerOnlyRoute } from "@/features/auth/components/seller-only-route";
import { SellerAnalytics } from "@/features/insights/components/seller-analytics";

export default function SellerAnalyticsPage() {
  return (
    <SiteShell>
      <SellerOnlyRoute>
        <SellerAnalytics />
      </SellerOnlyRoute>
    </SiteShell>
  );
}
