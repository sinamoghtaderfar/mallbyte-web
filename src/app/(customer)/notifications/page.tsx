import { SiteShell } from "@/components/layout/site-shell";
import { ProtectedRoute } from "@/features/auth/components/protected-route";
import { NotificationCenter } from "@/features/notifications/components/notification-center";

export default function NotificationsPage() {
  return (
    <SiteShell>
      <main className="px-4 py-12">
        <div className="mx-auto w-full max-w-6xl">
          <ProtectedRoute>
            <NotificationCenter />
          </ProtectedRoute>
        </div>
      </main>
    </SiteShell>
  );
}