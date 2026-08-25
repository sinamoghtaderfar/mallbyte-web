import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { SellerStatusCard } from "@/features/seller/components/seller-status-card";

export default function SellerStatusPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <SellerStatusCard />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}
