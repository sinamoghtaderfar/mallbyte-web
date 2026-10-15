import { SiteShell } from "@/components/layout/site-shell";
import { ProfileCard } from "@/features/auth/components/profile-card";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { NotificationPreferencesCard } from "@/features/notifications/components/notification-preferences";

export default function ProfilePage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-4xl">
          <ProtectedRoute>
            <div className="space-y-6">
              <ProfileCard />
              <NotificationPreferencesCard />
            </div>
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}