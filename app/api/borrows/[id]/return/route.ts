import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/supabase/auth/guard";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApi();
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const admin = auth.admin;
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Borrow ID is required." }, { status: 400 });
    }

    // 1. Try atomic database function `return_borrow`
    try {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("return_borrow", {
        p_borrow_id: id,
        p_returned_by: admin.id,
      });

      if (!rpcError && rpcResult) {
        if (!rpcResult.success) {
          return NextResponse.json(
            { ok: false, message: rpcResult.message || "Failed to process return." },
            { status: rpcResult.status || 409 }
          );
        }

        return NextResponse.json({
          ok: true,
          message: rpcResult.message || "Borrow marked as returned.",
          returned_at: rpcResult.returned_at,
        });
      }
    } catch {
      // Fall back to PostgREST transactional operations if RPC not present
    }

    // 2. PostgREST Fallback Execution (Atomic concurrency check via WHERE returned_at IS NULL)
    const { data: borrow, error: fetchErr } = await supabaseAdmin
      .from("borrows")
      .select("id, returned_at")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !borrow) {
      return NextResponse.json({ message: "Borrow transaction not found." }, { status: 404 });
    }

    if (borrow.returned_at !== null) {
      return NextResponse.json({ message: "Already returned." }, { status: 409 });
    }

    const nowIso = new Date().toISOString();

    // Atomic update: only updates if returned_at IS STILL NULL (prevents double-clicks / concurrent returns)
    const { data: updatedBorrow, error: updateErr } = await supabaseAdmin
      .from("borrows")
      .update({
        returned_at: nowIso,
        returned_by: admin.id,
      })
      .eq("id", id)
      .is("returned_at", null)
      .select("id, returned_at");

    if (updateErr || !updatedBorrow || updatedBorrow.length === 0) {
      // Concurrent admin or double-click already marked it returned!
      return NextResponse.json({ message: "Already returned." }, { status: 409 });
    }

    // Fetch borrow items to restore inventory stock
    const { data: borrowItems, error: itemsErr } = await supabaseAdmin
      .from("borrow_items")
      .select("equipment_id, quantity")
      .eq("borrow_id", id);

    if (!itemsErr && borrowItems) {
      for (const item of borrowItems) {
        // Fetch current stock to increment safely
        const { data: currentEquipment } = await supabaseAdmin
          .from("equipment")
          .select("available_units")
          .eq("id", item.equipment_id)
          .maybeSingle();

        if (currentEquipment) {
          await supabaseAdmin
            .from("equipment")
            .update({
              available_units: currentEquipment.available_units + (item.quantity || 1),
            })
            .eq("id", item.equipment_id);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Borrow marked as returned.",
      returned_at: nowIso,
    });
  } catch (error) {
    console.error("POST /api/borrows/[id]/return error:", error);
    return NextResponse.json({ message: "Server error marking borrow as returned." }, { status: 500 });
  }
}
