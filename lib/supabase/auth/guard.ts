import "server-only";

import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAdminSession, clearAdminSession } from "@/lib/supabase/auth/cookie";

export interface AuthenticatedAdmin {
  id: string;
  employee_id: string;
  company_email: string;
  full_name: string;
  username: string;
  status: "pending" | "active";
  must_change_credentials: boolean;
  activated_at: string | null;
}

/**
 * Server guard for page components.
 * Reads the session cookie, verifies against the database, and enforces first-login rules.
 *
 * @param options.allowMustChangeCredentials If true, allowed on /setup-credentials.
 */
export async function requireAuthenticatedAdmin(options?: {
  allowMustChangeCredentials?: boolean;
}): Promise<AuthenticatedAdmin> {
  const session = await getAdminSession();

  if (!session) {
    redirect("/login");
  }

  const { data: admin, error } = await supabaseAdmin
    .from("admins")
    .select(
      "id, employee_id, company_email, full_name, username, status, must_change_credentials, activated_at"
    )
    .eq("id", session.adminId)
    .maybeSingle();

  if (error || !admin || admin.status !== "active") {
    await clearAdminSession();
    redirect("/login");
  }

  // First-login enforcement:
  // If must_change_credentials is true and we're NOT on setup page -> redirect to /setup-credentials
  if (admin.must_change_credentials && !options?.allowMustChangeCredentials) {
    redirect("/setup-credentials");
  }

  // If must_change_credentials is false and we ARE on setup page -> redirect to /dashboard
  if (!admin.must_change_credentials && options?.allowMustChangeCredentials) {
    redirect("/dashboard");
  }

  return admin as AuthenticatedAdmin;
}

/**
 * Server guard for API route handlers.
 * Returns null or throws an error/returns 401/403.
 */
export async function requireAdminApi(options?: {
  allowMustChangeCredentials?: boolean;
}): Promise<
  | { success: true; admin: AuthenticatedAdmin }
  | { success: false; status: number; message: string }
> {
  const session = await getAdminSession();

  if (!session) {
    return { success: false, status: 401, message: "Unauthorized. Please log in." };
  }

  const { data: admin, error } = await supabaseAdmin
    .from("admins")
    .select(
      "id, employee_id, company_email, full_name, username, status, must_change_credentials, activated_at"
    )
    .eq("id", session.adminId)
    .maybeSingle();

  if (error || !admin || admin.status !== "active") {
    await clearAdminSession();
    return { success: false, status: 401, message: "Session invalid or expired." };
  }

  if (admin.must_change_credentials && !options?.allowMustChangeCredentials) {
    return {
      success: false,
      status: 403,
      message: "First-time credential setup required before accessing this endpoint.",
    };
  }

  return { success: true, admin: admin as AuthenticatedAdmin };
}
