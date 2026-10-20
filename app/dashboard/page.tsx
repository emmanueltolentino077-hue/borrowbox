import { requireAuthenticatedAdmin } from "@/lib/supabase/auth/guard";
import DashboardClient from "./DashboardClient";

export const instant = false;

export default async function DashboardPage() {
  // Guard ensures user is authenticated and must_change_credentials is false.
  // If must_change_credentials is true, automatically redirects to /setup-credentials.
  // If not logged in, automatically redirects to /login.
  const admin = await requireAuthenticatedAdmin();

  return <DashboardClient admin={admin} />;
}
