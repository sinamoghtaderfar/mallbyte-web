import { ProfileCard } from "@/features/auth/components/profile-card";
import { ProtectedRoute } from "@/features/auth/components/protected-route";

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-4xl">
        <ProtectedRoute>
          <ProfileCard />
        </ProtectedRoute>
      </div>
    </main>
  );
}
