import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/supabase/auth/guard";
import { getBorrowStatus } from "@/lib/borrowbox";

export async function GET() {
  try {
    const auth = await requireAdminApi();
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    // 1. Equipment Inventory Stats (non-archived items)
    const { data: equipmentList, error: eqErr } = await supabaseAdmin
      .from("equipment")
      .select("id, total_units, available_units, is_archived")
      .eq("is_archived", false);

    if (eqErr || !equipmentList) {
      console.error("Dashboard equipment query error:", eqErr);
      return NextResponse.json({ message: "Error fetching inventory stats." }, { status: 500 });
    }

    let totalInventoryUnits = 0;
    let availableUnits = 0;
    const totalEquipmentCount = equipmentList.length;

    for (const eq of equipmentList) {
      totalInventoryUnits += eq.total_units || 0;
      availableUnits += eq.available_units || 0;
    }

    const availablePercent =
      totalInventoryUnits > 0
        ? Math.round((availableUnits / totalInventoryUnits) * 1000) / 10
        : 0;

    // 2. Active Borrows and Circulation Stats
    // Fetch unreturned borrows to calculate active borrow units and distinct active borrowers
    const { data: unreturnedBorrows, error: unreturnedErr } = await supabaseAdmin
      .from("borrows")
      .select(`
        id,
        borrower_id,
        borrow_items (
          quantity
        )
      `)
      .is("returned_at", null);

    if (unreturnedErr) {
      console.error("Dashboard unreturned borrows query error:", unreturnedErr);
      return NextResponse.json({ message: "Error fetching circulation stats." }, { status: 500 });
    }

    let activeBorrowUnits = 0;
    const distinctBorrowers = new Set<string>();

    interface RawUnreturnedBorrowItem {
      quantity: number;
    }

    interface RawUnreturnedBorrow {
      id: string;
      borrower_id: string;
      borrow_items: RawUnreturnedBorrowItem[];
    }

    if (unreturnedBorrows) {
      for (const b of unreturnedBorrows as unknown as RawUnreturnedBorrow[]) {
        distinctBorrowers.add(b.borrower_id);
        if (Array.isArray(b.borrow_items)) {
          for (const item of b.borrow_items) {
            activeBorrowUnits += item.quantity || 1;
          }
        }
      }
    }

    // 3. Top 5 Latest Borrows
    const { data: latestBorrowsData, error: latestErr } = await supabaseAdmin
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
            name,
            product_code
          )
        )
      `)
      .order("issued_at", { ascending: false })
      .limit(5);

    if (latestErr) {
      console.error("Dashboard latest borrows query error:", latestErr);
      return NextResponse.json({ message: "Error fetching latest borrows." }, { status: 500 });
    }

    interface RawLatestBorrowItem {
      id: string;
      equipment_id: string;
      quantity: number;
      equipment: {
        name: string;
        product_code: string;
      } | null;
    }

    interface RawLatestBorrow {
      id: string;
      loan_code: string;
      issued_at: string;
      due_at: string;
      returned_at: string | null;
      borrower: {
        id: string;
        borrower_code: string;
        full_name: string;
        email: string;
        type: string;
        department_code: string;
        department_name: string;
      } | null;
      borrow_items: RawLatestBorrowItem[];
    }

    const latestBorrows = (latestBorrowsData as unknown as RawLatestBorrow[] || []).map((b) => {
      const status = getBorrowStatus(b.due_at, b.returned_at);
      const totalItemsCount = (b.borrow_items || []).reduce(
        (sum, item) => sum + (item.quantity || 1),
        0
      );

      return {
        id: b.id,
        loan_code: b.loan_code,
        issued_at: b.issued_at,
        due_at: b.due_at,
        returned_at: b.returned_at,
        status, // "Active" | "Due Today" | "Overdue" | "Returned"
        total_items_count: totalItemsCount,
        borrower: b.borrower,
      };
    });

    return NextResponse.json({
      ok: true,
      stats: {
        totalInventoryUnits,
        availableUnits,
        availablePercent,
        totalEquipmentCount,
        activeBorrowUnits,
        distinctBorrowersCount: distinctBorrowers.size,
      },
      latestBorrows,
    });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ message: "Server error fetching dashboard data." }, { status: 500 });
  }
}
