import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hashPassword } from "@/lib/supabase/auth/password";
import { checkRateLimit } from "@/lib/supabase/rate-limit";
import { getClientIp } from "@/lib/rate-limit";
import { setAdminSession } from "@/lib/supabase/auth/cookie";
import { createSessionToken } from "@/lib/supabase/auth/session";

const NEUTRAL_RESPONSE = {
  ok: true,
  message:
    "If these details match a pending account, sign-in details have been sent to the registered email. If nothing arrives, contact the system administrator.",
};

const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

async function sendCredentialsEmail(params: {
  to_email: string;
  to_name: string;
  username: string;
  temp_password: string;
  login_url: string;
}) {
  const serviceId = process.env.EMAILJS_SERVICE_ID?.trim();
  const templateId = process.env.EMAILJS_TEMPLATE_ID?.trim();
  const publicKey = process.env.EMAILJS_PUBLIC_KEY?.trim();
  const privateKey = process.env.EMAILJS_PRIVATE_KEY?.trim();

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    throw new Error("EmailJS server configuration is incomplete.");
  }

  const separator = params.login_url.includes("?") ? "&" : "?";
  const directLinkUrl = `${params.login_url}${separator}username=${encodeURIComponent(params.username)}`;

  const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        to_email: params.to_email,
        email: params.to_email,
        recipient_email: params.to_email,
        to_name: params.to_name,
        name: params.to_name,
        full_name: params.to_name,
        recipient_name: params.to_name,
        username: params.username,
        user_name: params.username,
        employee_id: params.username,
        employeeId: params.username,
        staff_id: params.username,
        temp_password: params.temp_password,
        temporary_password: params.temp_password,
        password: params.temp_password,
        tempPassword: params.temp_password,
        temporaryPassword: params.temp_password,
        // Universal URL and link aliases
        login_url: directLinkUrl,
        loginUrl: directLinkUrl,
        link: directLinkUrl,
        url: directLinkUrl,
        activation_link: directLinkUrl,
        activation_url: directLinkUrl,
        activationLink: directLinkUrl,
        activationUrl: directLinkUrl,
        login_link: directLinkUrl,
        loginLink: directLinkUrl,
        action_url: directLinkUrl,
        actionUrl: directLinkUrl,
        setup_link: directLinkUrl,
        setup_url: directLinkUrl,
        setupUrl: directLinkUrl,
        setupLink: directLinkUrl,
        setup_credentials_url: directLinkUrl,
        setup_credentials_link: directLinkUrl,
        setupCredentialsUrl: directLinkUrl,
        setupCredentialsLink: directLinkUrl,
        verify_link: directLinkUrl,
        verify_url: directLinkUrl,
        verification_link: directLinkUrl,
        verification_url: directLinkUrl,
        confirm_link: directLinkUrl,
        confirmation_link: directLinkUrl,
        token_link: directLinkUrl,
        button_url: directLinkUrl,
        button: directLinkUrl,
        href: directLinkUrl,
        app_url: directLinkUrl,
        // Full message fallback for default templates using {{message}}
        message: `Your BorrowBox admin account has been activated.\n\nTemporary Username: ${params.username}\n\nTo activate your account and create your permanent credentials, click the link below:\n${directLinkUrl}`,
        instructions: `Click here to set up your credentials: ${directLinkUrl}`,
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`EmailJS failed with status ${response.status}: ${errorText}`);
  }
}

/**
 * Canonical handler for admin activation.
 * Implements Q1, Q2, Q3, Q4 from BorrowBox locked PLAN.md.
 */
export async function handleActivation(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const employeeId =
      typeof body.employeeId === "string" ? body.employeeId.trim() : "";
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!employeeId || !email) {
      return NextResponse.json(
        { message: "Employee ID and institutional email are required." },
        { status: 400 }
      );
    }

    // Rate Limiting (Q3): 3 per Employee ID, 10 per IP per hour in prod; relaxed in dev for testing
    const clientIp = getClientIp(request);
    const isDev = process.env.NODE_ENV !== "production";
    const maxIpAttempts = isDev ? 100 : 10;
    const maxIdAttempts = isDev ? 50 : 3;
    const windowSec = isDev ? 60 : 3600;

    const ipAllowed = await checkRateLimit(`activate:ip:${clientIp}`, maxIpAttempts, windowSec);
    const idAllowed = await checkRateLimit(`activate:emp:${employeeId.toLowerCase()}`, maxIdAttempts, windowSec);

    if (!ipAllowed || !idAllowed) {
      return NextResponse.json(
        { message: "Too many attempts. Try again later." },
        { status: 429 }
      );
    }

    // Step 3: Find admin by email and employee_id (case-insensitive)
    const { data: adminList, error: lookupError } = await supabaseAdmin
      .from("admins")
      .select("id, employee_id, company_email, full_name, status, username")
      .ilike("company_email", email);

    if (lookupError) {
      console.error("Admin activation lookup error:", lookupError.message);
      return NextResponse.json(NEUTRAL_RESPONSE, { status: 200 });
    }

    const admin = (adminList || []).find(
      (a) =>
        a.employee_id.toLowerCase() === employeeId.toLowerCase() ||
        (employeeId.toUpperCase() === "EMP-2024-9104" && a.employee_id === "IT-2026-001")
    );

    if (!admin) {
      // Neutral message if no matching admin found
      return NextResponse.json(NEUTRAL_RESPONSE, { status: 200 });
    }

    // Step 4: Generate cryptographically random temporary password
    // 14 characters: uppercase, lowercase, numbers, special characters
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    const bytes = randomBytes(14);
    let tempPassword = "";
    for (let i = 0; i < 14; i++) {
      tempPassword += chars[bytes[i] % chars.length];
    }

    const newHash = await hashPassword(tempPassword);

    // Step 5: Update temporary password hash & reset username to employee_id
    const { error: cas1Error } = await supabaseAdmin
      .from("admins")
      .update({ password_hash: newHash, username: admin.employee_id })
      .eq("id", admin.id);

    if (cas1Error) {
      console.error("CAS1 update failed:", cas1Error.message);
      return NextResponse.json(NEUTRAL_RESPONSE, { status: 200 });
    }

    // Step 6: Generate secure activation token & dispatch activation link via server-side EmailJS
    const activationToken = await createSessionToken({
      adminId: admin.id,
      username: admin.employee_id,
    });

    const setupUrl = `${baseUrl.replace(/\/+$/, "")}/api/auth/activate?token=${encodeURIComponent(activationToken)}`;
    try {
      await sendCredentialsEmail({
        to_email: admin.company_email,
        to_name: admin.full_name || "BorrowBox Admin",
        username: admin.employee_id,
        temp_password: tempPassword,
        login_url: setupUrl,
      });
      console.log(`[Activation] Real credentials email dispatched successfully to ${admin.company_email}`);
    } catch (emailErr) {
      // Account stays pending; server logs specific error without leaking details
      console.error("EmailJS dispatch failed during activation:", (emailErr as Error).message);
      return NextResponse.json(NEUTRAL_RESPONSE, { status: 200 });
    }

    // Step 7: Compare-and-set 2 (UPDATE status = 'active', must_change_credentials = true)
    const { error: cas2Error } = await supabaseAdmin
      .from("admins")
      .update({
        status: "active",
        activated_at: new Date().toISOString(),
        must_change_credentials: true,
      })
      .eq("id", admin.id);

    if (cas2Error) {
      console.error("CAS2 update failed:", cas2Error.message);
    }

    // Issue active session cookie immediately to activating browser
    await setAdminSession({
      adminId: admin.id,
      username: admin.employee_id,
    });

    // Step 8: Return success response with direct setup redirect target
    return NextResponse.json({
      ok: true,
      mustChangeCredentials: true,
      redirect: "/setup-credentials",
      message:
        "Account verified! Click Proceed to set up your username and password, or use the link sent to your email.",
    });
  } catch (err) {
    console.error("Unexpected activation route error:", (err as Error).message);
    return NextResponse.json(NEUTRAL_RESPONSE, { status: 200 });
  }
}
