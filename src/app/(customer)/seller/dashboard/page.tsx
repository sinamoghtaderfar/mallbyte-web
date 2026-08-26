import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { SellerDashboardCard } from "@/features/seller/components/seller-dashboard-card";

export default function SellerDashboardPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <SellerDashboardCard />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}
