import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { SellerStoreSettings } from "@/features/seller/components/seller-store-settings";

export default function SellerStorePage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <SellerStoreSettings />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}
