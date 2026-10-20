import { requireAuthenticatedAdmin } from "@/lib/supabase/auth/guard";
import { verifySessionToken } from "@/lib/supabase/auth/session";
import { setAdminSession } from "@/lib/supabase/auth/cookie";
import SetupCredentialsForm from "./SetupCredentialsForm";

export const instant = false;

export default async function SetupCredentialsPage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const token = resolvedParams?.token;

  if (token) {
    const payload = await verifySessionToken(token);
    if (payload?.adminId) {
      await setAdminSession({
        adminId: payload.adminId,
        username: payload.username,
      });
    }
  }

  // Enforces that admin is authenticated and must_change_credentials is true.
  // If must_change_credentials is already false, redirects automatically to /dashboard.
  // If not logged in, redirects automatically to /login.
  const admin = await requireAuthenticatedAdmin({
    allowMustChangeCredentials: true,
  });

  return <SetupCredentialsForm admin={admin} />;
}
