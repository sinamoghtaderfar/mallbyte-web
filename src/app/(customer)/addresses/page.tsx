import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { AddressManager } from "@/features/addresses/components/address-manager";

export default function AddressesPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <AddressManager />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}
