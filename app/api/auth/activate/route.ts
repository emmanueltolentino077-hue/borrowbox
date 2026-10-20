import { NextResponse } from "next/server";
import { handleActivation } from "@/lib/supabase/auth/activation-handler";
import { verifySessionToken } from "@/lib/supabase/auth/session";
import { setAdminSession } from "@/lib/supabase/auth/cookie";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  return handleActivation(request);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const payload = await verifySessionToken(token);
    if (!payload || !payload.adminId) {
      return NextResponse.redirect(new URL("/login?error=invalid_token", request.url));
    }

    // Verify admin exists and is active in database
    const { data: admin } = await supabaseAdmin
      .from("admins")
      .select("id, employee_id, username, status, must_change_credentials")
      .eq("id", payload.adminId)
      .maybeSingle();

    if (!admin || admin.status !== "active") {
      return NextResponse.redirect(new URL("/login?error=inactive_account", request.url));
    }

    // Issue session cookie
    await setAdminSession({
      adminId: admin.id,
      username: admin.username,
    });

    // If credentials setup is still required, send directly to setup page, else dashboard
    if (admin.must_change_credentials) {
      return NextResponse.redirect(new URL("/setup-credentials", request.url));
    } else {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } catch (error) {
    console.error("GET /api/auth/activate error:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
