import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/supabase/auth/guard";

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() || "";

    let query = supabaseAdmin
      .from("borrowers")
      .select("id, borrower_code, full_name, email, type, department_code, department_name")
      .order("full_name", { ascending: true })
      .limit(10);

    if (q) {
      // Escape special characters for PostgREST
      const cleanQ = q.replace(/[%_,]/g, "");
      query = query.or(
        `full_name.ilike.%${cleanQ}%,borrower_code.ilike.%${cleanQ}%,email.ilike.%${cleanQ}%`
      );
    }

    const { data: borrowers, error } = await query;

    if (error) {
      console.error("GET /api/borrowers/search query error:", error);
      return NextResponse.json({ message: "Error searching borrowers." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      borrowers: borrowers || [],
    });
  } catch (error) {
    console.error("GET /api/borrowers/search error:", error);
    return NextResponse.json({ message: "Server error searching borrowers." }, { status: 500 });
  }
}
