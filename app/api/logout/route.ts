import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/supabase/auth/cookie";

export async function POST() {
  await clearAdminSession();
  return NextResponse.json({ ok: true, redirect: "/login" });
}
