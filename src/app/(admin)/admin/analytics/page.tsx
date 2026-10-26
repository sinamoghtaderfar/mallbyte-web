import { AdminAnalytics } from "@/features/insights/components/admin-analytics";

// /admin/layout.tsx protects this route; backend permissions remain authoritative.
export default function AdminAnalyticsPage() {
  return <AdminAnalytics />;
}
