import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/supabase/auth/guard";
import { getBorrowStatus } from "@/lib/borrowbox";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApi();
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Borrow ID is required." }, { status: 400 });
    }

    const { data: borrow, error: fetchErr } = await supabaseAdmin
      .from("borrows")
      .select(`
        id,
        loan_code,
        issued_at,
        due_at,
        returned_at,
        borrower:borrowers (
          id,
          borrower_code,
          full_name,
          email,
          type,
          department_code,
          department_name
        ),
        borrow_items (
          id,
          equipment_id,
          quantity,
          equipment (
            id,
            product_code,
            name,
            category,
            image_url,
            spec
          )
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !borrow) {
      return NextResponse.json({ message: "Borrow transaction not found." }, { status: 404 });
    }

    interface RawBorrowItem {
      id: string;
      equipment_id: string;
      quantity: number;
      equipment: {
        id: string;
        product_code: string;
        name: string;
        category: string;
        image_url: string | null;
        spec: string | null;
      } | null;
    }

    const items = (borrow.borrow_items as unknown as RawBorrowItem[]).map((bi) => ({
      id: bi.id,
      equipment_id: bi.equipment_id,
      quantity: bi.quantity,
      name: bi.equipment?.name || "Equipment Item",
      product_code: bi.equipment?.product_code || "N/A",
      category: bi.equipment?.category || "General",
      image_url: bi.equipment?.image_url || null,
      spec: bi.equipment?.spec || null,
    }));

    const status = getBorrowStatus(borrow.due_at, borrow.returned_at);
    const totalUnits = items.reduce((acc, i) => acc + (i.quantity || 1), 0);

    return NextResponse.json({
      ok: true,
      borrow: {
        id: borrow.id,
        loan_code: borrow.loan_code,
        issued_at: borrow.issued_at,
        due_at: borrow.due_at,
        returned_at: borrow.returned_at,
        status,
        total_units: totalUnits,
        borrower: borrow.borrower,
        items,
      },
    });
  } catch (error) {
    console.error("GET /api/borrows/[id]/items error:", error);
    return NextResponse.json({ message: "Server error fetching borrow items." }, { status: 500 });
  }
}
