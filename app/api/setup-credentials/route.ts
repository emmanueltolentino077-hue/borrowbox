import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/supabase/auth/guard";
import { hashPassword, isStrongPassword } from "@/lib/supabase/auth/password";
import { setAdminSession } from "@/lib/supabase/auth/cookie";

const USERNAME_REGEX = /^[a-z0-9.]{4,}$/;

export async function POST(request: Request) {
  try {
    // 1. Verify caller has active session and must_change_credentials === true
    const authResult = await requireAdminApi({ allowMustChangeCredentials: true });
    if (!authResult.success) {
      return NextResponse.json(
        { message: authResult.message },
        { status: authResult.status }
      );
    }

    const { admin } = authResult;

    if (!admin.must_change_credentials) {
      return NextResponse.json(
        { message: "Credentials setup has already been completed.", redirect: "/dashboard" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";
    const confirmPassword =
      typeof body.confirmPassword === "string" ? body.confirmPassword : "";

    // 2. Validate username
    if (!username || !USERNAME_REGEX.test(username)) {
      return NextResponse.json(
        {
          message:
            "Username must be at least 4 characters and contain only lowercase letters, numbers, or periods.",
        },
        { status: 400 }
      );
    }

    // Check username uniqueness across all admins (including pending accounts)
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from("admins")
      .select("id")
      .eq("username", username)
      .neq("id", admin.id)
      .maybeSingle();

    if (checkError) {
      console.error("Username uniqueness check error:", checkError.message);
      return NextResponse.json(
        { message: "Unable to verify username availability right now." },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json(
        { message: "This username is already taken. Please choose another." },
        { status: 400 }
      );
    }

    // 3. Validate password complexity and match
    if (!password || !isStrongPassword(password)) {
      return NextResponse.json(
        {
          message:
            "Password must be at least 8 characters and include uppercase, lowercase, numbers, and special characters.",
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { message: "Passwords do not match." },
        { status: 400 }
      );
    }

    // 4. Hash password with bcrypt
    const passwordHash = await hashPassword(password);

    // 5. Update admin credentials and clear must_change_credentials flag
    const { data: updatedAdmin, error: updateError } = await supabaseAdmin
      .from("admins")
      .update({
        username,
        password_hash: passwordHash,
        must_change_credentials: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", admin.id)
      .eq("must_change_credentials", true)
      .select("id, username")
      .maybeSingle();

    if (updateError || !updatedAdmin) {
      console.error("Failed to update admin credentials:", updateError?.message);
      return NextResponse.json(
        { message: "Unable to save credentials. Please try again." },
        { status: 500 }
      );
    }

    // 6. Refresh session token with the updated permanent username
    await setAdminSession({
      adminId: admin.id,
      username: updatedAdmin.username,
    });

    return NextResponse.json({
      ok: true,
      message: "Credentials updated successfully.",
      redirect: "/dashboard",
    });
  } catch (error) {
    console.error("setup-credentials route error:", error);
    return NextResponse.json(
      { message: "Unable to complete setup at this time." },
      { status: 500 }
    );
  }
}
