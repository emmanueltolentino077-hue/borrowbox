import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyPassword } from "@/lib/supabase/auth/password";
import { setAdminSession } from "@/lib/supabase/auth/cookie";
import { checkRateLimit } from "@/lib/supabase/rate-limit";
import { getClientIp } from "@/lib/rate-limit";

// Pre-computed bcrypt hash of equal work factor (12 rounds) to protect against timing attacks
const DUMMY_HASH = "$2b$12$e80MvQk4YfF8K2Vq38B52uG9g8i0H2h4J6j8L0l2N4n6P8p0R2r4T";

const INVALID_CREDENTIALS_MSG = "Invalid username or password.";

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);

    // 1. IP-level rate limiting: 20 attempts per 15 minutes
    const ipAllowed = await checkRateLimit(`login:ip:${ip}`, 20, 15 * 60);
    if (!ipAllowed) {
      return NextResponse.json(
        { message: "Too many login attempts from this network. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const username =
      typeof body.username === "string" ? body.username.trim() : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    if (!username || !password) {
      return NextResponse.json(
        { message: INVALID_CREDENTIALS_MSG },
        { status: 401 }
      );
    }

    const cleanedUsername = username.replace(/\s+/g, "");

    // 2. Username-level rate limiting: 5 attempts per 15 minutes
    const userAllowed = await checkRateLimit(
      `login:user:${cleanedUsername.toLowerCase()}`,
      10,
      15 * 60
    );
    if (!userAllowed) {
      return NextResponse.json(
        { message: "Too many failed attempts for this account. Try again later." },
        { status: 429 }
      );
    }

    // 3. Database lookup for active admin (supports username, employee_id, or company email, case-insensitive)
    let { data: admin, error } = await supabaseAdmin
      .from("admins")
      .select("id, employee_id, username, company_email, password_hash, status, must_change_credentials")
      .ilike("username", cleanedUsername)
      .maybeSingle();

    if (!admin) {
      const { data: byEmpId, error: empError } = await supabaseAdmin
        .from("admins")
        .select("id, employee_id, username, company_email, password_hash, status, must_change_credentials")
        .ilike("employee_id", cleanedUsername)
        .maybeSingle();
      if (byEmpId) {
        admin = byEmpId;
      } else if (empError) {
        error = empError;
      }
    }

    if (!admin && cleanedUsername.includes("@")) {
      const { data: byEmail, error: emailError } = await supabaseAdmin
        .from("admins")
        .select("id, employee_id, username, company_email, password_hash, status, must_change_credentials")
        .ilike("company_email", cleanedUsername)
        .maybeSingle();
      if (byEmail) {
        admin = byEmail;
      } else if (emailError) {
        error = emailError;
      }
    }

    if (error) {
      console.error("Admin lookup database error:", error.message);
      return NextResponse.json(
        { message: "Unable to process login right now. Please try again later." },
        { status: 500 }
      );
    }

    // Unknown username or inactive account: run dummy password check for timing attack resistance
    if (!admin || admin.status !== "active" || !admin.password_hash) {
      await verifyPassword(password, DUMMY_HASH);
      return NextResponse.json(
        { message: INVALID_CREDENTIALS_MSG },
        { status: 401 }
      );
    }

    // Verify password against stored bcrypt hash
    const passwordMatches = await verifyPassword(password, admin.password_hash);
    if (!passwordMatches) {
      return NextResponse.json(
        { message: INVALID_CREDENTIALS_MSG },
        { status: 401 }
      );
    }

    // 4. Issue 8-hour HttpOnly session cookie
    await setAdminSession({
      adminId: admin.id,
      username: admin.username,
    });

    return NextResponse.json({
      ok: true,
      mustChangeCredentials: admin.must_change_credentials,
    });
  } catch (error) {
    console.error("Login route unexpected error:", error);
    return NextResponse.json(
      { message: "Unable to process login right now." },
      { status: 500 }
    );
  }
}
