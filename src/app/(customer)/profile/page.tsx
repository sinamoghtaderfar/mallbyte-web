import { SiteShell } from "@/components/layout/site-shell";
import { ProfileCard } from "@/features/auth/components/profile-card";
import { ProtectedRoute } from "@/features/auth/components/protected-route";

export default function ProfilePage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-4xl">
          <ProtectedRoute>
            <ProfileCard />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}
