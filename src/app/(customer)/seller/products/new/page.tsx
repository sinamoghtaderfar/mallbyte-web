import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { SellerProductCreateForm } from "@/features/seller-products/components/seller-product-create-form";

export default function SellerProductNewPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <SellerProductCreateForm />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}
