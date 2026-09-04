import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { WishlistList } from "@/features/wishlist/components/wishlist-list";

export default function WishlistPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <WishlistList />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}
