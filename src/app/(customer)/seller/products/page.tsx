import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { SellerProductsList } from "@/features/seller-products/components/seller-products-list";

export default function SellerProductsPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <SellerProductsList />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}
