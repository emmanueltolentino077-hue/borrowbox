import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/supabase/auth/guard";
import {
  calculateDueDate,
  getBorrowStatus,
  isSameDayInAppTimezone,
  getNow,
} from "@/lib/borrowbox";

interface RequestedItem {
  equipment_id: string;
  quantity: number;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const department = searchParams.get("department")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "8", 10));

    // Fetch all borrows with joined borrower and equipment
    const { data: allBorrows, error } = await supabaseAdmin
      .from("borrows")
      .select(`
        id,
        loan_code,
        borrower_id,
        issued_by,
        issued_at,
        due_at,
        returned_at,
        returned_by,
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
            image_url
          )
        )
      `)
      .order("issued_at", { ascending: false });

    if (error || !allBorrows) {
      console.error("GET /api/borrows query error:", error);
      return NextResponse.json({ message: "Error fetching borrows." }, { status: 500 });
    }

    const now = getNow();

    // Map and enrich each borrow with status & metrics
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
      } | null;
    }

    interface RawBorrow {
      id: string;
      loan_code: string;
      borrower_id: string;
      issued_by: string;
      issued_at: string;
      due_at: string;
      returned_at: string | null;
      returned_by: string | null;
      borrower: {
        id: string;
        borrower_code: string;
        full_name: string;
        email: string;
        type: string;
        department_code: string;
        department_name: string;
      } | null;
      borrow_items: RawBorrowItem[];
    }

    let allActiveBorrowsCount = 0;
    let dueTodayCount = 0;
    let overdueCount = 0;
    let returnedTodayCount = 0;

    const enrichedBorrows = (allBorrows as unknown as RawBorrow[]).map((b) => {
      const status = getBorrowStatus(b.due_at, b.returned_at);
      const isReturned = Boolean(b.returned_at);
      const dueDate = new Date(b.due_at);

      // Card 1: All Active Borrows (every unreturned borrow)
      if (!isReturned) {
        allActiveBorrowsCount++;
      }

      // Card 2: Due Today (unreturned, now < due_at, due date is today in Manila)
      if (!isReturned && now.getTime() < dueDate.getTime() && isSameDayInAppTimezone(now, dueDate)) {
        dueTodayCount++;
      }

      // Card 3: Overdue (unreturned, now >= due_at)
      if (!isReturned && now.getTime() >= dueDate.getTime()) {
        overdueCount++;
      }

      // Card 4: Returned Today (returned_at between local midnight and next midnight)
      if (isReturned && b.returned_at) {
        const returnedDate = new Date(b.returned_at);
        if (isSameDayInAppTimezone(now, returnedDate)) {
          returnedTodayCount++;
        }
      }

      const totalItemsCount = b.borrow_items.reduce((sum, item) => sum + (item.quantity || 1), 0);

      return {
        id: b.id,
        loan_code: b.loan_code,
        borrower_id: b.borrower_id,
        issued_by: b.issued_by,
        issued_at: b.issued_at,
        due_at: b.due_at,
        returned_at: b.returned_at,
        returned_by: b.returned_by,
        borrower: b.borrower,
        borrow_items: b.borrow_items,
        total_items_count: totalItemsCount,
        status, // "Active" | "Due Today" | "Overdue" | "Returned"
      };
    });

    // Filtering
    let filtered = enrichedBorrows;

    if (search) {
      filtered = filtered.filter((b) => {
        const borrowerMatch =
          b.borrower?.full_name.toLowerCase().includes(search) ||
          b.borrower?.borrower_code.toLowerCase().includes(search) ||
          b.borrower?.email.toLowerCase().includes(search);

        const equipmentMatch = b.borrow_items.some(
          (bi) =>
            bi.equipment?.name.toLowerCase().includes(search) ||
            bi.equipment?.product_code.toLowerCase().includes(search)
        );

        return borrowerMatch || equipmentMatch;
      });
    }

    if (department && department !== "All" && department !== "All Departments") {
      filtered = filtered.filter(
        (b) =>
          b.borrower?.department_code.toLowerCase() === department.toLowerCase() ||
          b.borrower?.department_name.toLowerCase().includes(department.toLowerCase())
      );
    }

    if (statusFilter && statusFilter !== "All" && statusFilter !== "All Statuses") {
      filtered = filtered.filter(
        (b) => b.status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // Pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      ok: true,
      stats: {
        allActiveBorrows: allActiveBorrowsCount,
        dueToday: dueTodayCount,
        overdue: overdueCount,
        returnedToday: returnedTodayCount,
      },
      items: paginatedItems,
      pagination: {
        totalItems,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error("GET /api/borrows error:", error);
    return NextResponse.json({ message: "Server error fetching borrows." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const admin = auth.admin;
    const body = await request.json().catch(() => ({}));

    const borrowerId = typeof body.borrower_id === "string" ? body.borrower_id.trim() : "";
    const rawItems: unknown[] = Array.isArray(body.items) ? body.items : [];
    const dueOption = body.due_option as "3days" | "1week" | "custom";
    const customDueDate = typeof body.custom_due_date === "string" ? body.custom_due_date.trim() : undefined;

    // 1. Validations
    if (!borrowerId) {
      return NextResponse.json({ message: "Borrower selection is required." }, { status: 400 });
    }

    if (rawItems.length === 0) {
      return NextResponse.json({ message: "At least one equipment item must be in the tray." }, { status: 400 });
    }

    // Consolidate duplicate equipment IDs if any
    const itemMap = new Map<string, number>();
    for (const item of rawItems) {
      if (!item || typeof item !== "object") continue;
      const i = item as { equipment_id?: string; quantity?: number };
      const eqId = typeof i.equipment_id === "string" ? i.equipment_id.trim() : "";
      const qty = typeof i.quantity === "number" ? Math.floor(i.quantity) : parseInt(String(i.quantity), 10);

      if (!eqId || isNaN(qty) || qty <= 0) {
        return NextResponse.json(
          { message: "All item quantities must be positive whole numbers." },
          { status: 400 }
        );
      }

      itemMap.set(eqId, (itemMap.get(eqId) || 0) + qty);
    }

    if (itemMap.size === 0) {
      return NextResponse.json({ message: "No valid items in borrow request." }, { status: 400 });
    }

    const items: RequestedItem[] = Array.from(itemMap.entries()).map(([equipment_id, quantity]) => ({
      equipment_id,
      quantity,
    }));

    if (!["3days", "1week", "custom"].includes(dueOption)) {
      return NextResponse.json({ message: "Invalid duration option." }, { status: 400 });
    }

    // Calculate due date (enforces 17:00 Asia/Manila, and custom date >= tomorrow)
    let dueAt: Date;
    try {
      dueAt = calculateDueDate(dueOption, customDueDate);
    } catch (err: unknown) {
      return NextResponse.json(
        { message: (err as Error)?.message || "Invalid due date specification." },
        { status: 400 }
      );
    }

    // 2. Try atomic database function `issue_borrow`
    try {
      const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc("issue_borrow", {
        p_borrower_id: borrowerId,
        p_issued_by: admin.id,
        p_due_at: dueAt.toISOString(),
        p_items: items,
      });

      if (!rpcError && rpcResult) {
        if (!rpcResult.success) {
          return NextResponse.json(
            {
              ok: false,
              message: rpcResult.message || "Unable to issue borrow due to stock conflict.",
              short_item: rpcResult.short_item,
              available: rpcResult.available,
              requested: rpcResult.requested,
            },
            { status: 409 }
          );
        }

        return NextResponse.json({
          ok: true,
          borrow_id: rpcResult.borrow_id,
          loan_code: rpcResult.loan_code,
          due_at: rpcResult.due_at,
          message: rpcResult.message,
        });
      }
    } catch {
      // Fallback to transactional PostgREST operations if RPC is not present
    }

    // 3. PostgREST Fallback Execution (ACID guaranteed via row updates and rollback on conflict)
    // Check borrower
    const { data: borrower, error: borrowerErr } = await supabaseAdmin
      .from("borrowers")
      .select("id, full_name")
      .eq("id", borrowerId)
      .maybeSingle();

    if (borrowerErr || !borrower) {
      return NextResponse.json({ message: "Borrower not found." }, { status: 404 });
    }

    // Sort items by equipment_id to prevent deadlocks
    items.sort((a, b) => a.equipment_id.localeCompare(b.equipment_id));

    // Fetch and check current available units for each item
    const equipmentIds = items.map((i) => i.equipment_id);
    const { data: equipmentList, error: eqErr } = await supabaseAdmin
      .from("equipment")
      .select("id, name, product_code, total_units, available_units, is_archived")
      .in("id", equipmentIds);

    if (eqErr || !equipmentList || equipmentList.length !== equipmentIds.length) {
      return NextResponse.json({ message: "One or more equipment items not found." }, { status: 404 });
    }

    // Check stock availability
    for (const reqItem of items) {
      const eq = equipmentList.find((e) => e.id === reqItem.equipment_id);
      if (!eq || eq.is_archived) {
        return NextResponse.json(
          { message: `Equipment "${eq?.name || reqItem.equipment_id}" is no longer active.` },
          { status: 409 }
        );
      }

      if (eq.available_units < reqItem.quantity) {
        return NextResponse.json(
          {
            ok: false,
            message: `Not enough stock for ${eq.name}. Available: ${eq.available_units}, requested: ${reqItem.quantity}. Refresh and review your tray.`,
            short_item: eq.name,
            available: eq.available_units,
            requested: reqItem.quantity,
          },
          { status: 409 }
        );
      }
    }

    // Deduct stock sequentially
    const updatedItems: { id: string; deducted: number }[] = [];
    let deductionFailed = false;
    let failedItemName = "";
    let failedAvailable = 0;
    let failedRequested = 0;

    for (const reqItem of items) {
      const eq = equipmentList.find((e) => e.id === reqItem.equipment_id)!;
      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("equipment")
        .update({ available_units: eq.available_units - reqItem.quantity })
        .eq("id", reqItem.equipment_id)
        .gte("available_units", reqItem.quantity) // Optimistic concurrency check
        .select("id, available_units");

      if (updateErr || !updated || updated.length === 0) {
        deductionFailed = true;
        failedItemName = eq.name;
        failedAvailable = eq.available_units;
        failedRequested = reqItem.quantity;
        break;
      }

      updatedItems.push({ id: reqItem.equipment_id, deducted: reqItem.quantity });
    }

    if (deductionFailed) {
      // Roll back already deducted units
      for (const item of updatedItems) {
        const eq = equipmentList.find((e) => e.id === item.id)!;
        await supabaseAdmin
          .from("equipment")
          .update({ available_units: eq.available_units })
          .eq("id", item.id);
      }

      return NextResponse.json(
        {
          ok: false,
          message: `Not enough stock for ${failedItemName}. Refresh and review your tray.`,
          short_item: failedItemName,
          available: failedAvailable,
          requested: failedRequested,
        },
        { status: 409 }
      );
    }

    // Generate loan_code (BB-YYYY-XXXXX)
    const year = new Date().getFullYear();
    const randCode = Math.floor(10000 + Math.random() * 90000);
    const loanCode = `BB-${year}-${randCode}`;

    // Insert borrows record
    const { data: borrow, error: borrowInsertErr } = await supabaseAdmin
      .from("borrows")
      .insert({
        loan_code: loanCode,
        borrower_id: borrowerId,
        issued_by: admin.id,
        issued_at: new Date().toISOString(),
        due_at: dueAt.toISOString(),
      })
      .select("id, loan_code, due_at")
      .single();

    if (borrowInsertErr || !borrow) {
      console.error("Failed to insert borrow:", borrowInsertErr);
      // Rollback stock deductions
      for (const item of updatedItems) {
        const eq = equipmentList.find((e) => e.id === item.id)!;
        await supabaseAdmin
          .from("equipment")
          .update({ available_units: eq.available_units })
          .eq("id", item.id);
      }
      return NextResponse.json({ message: "Failed to record borrow transaction." }, { status: 500 });
    }

    // Insert borrow_items
    const borrowItemsPayload = items.map((item) => ({
      borrow_id: borrow.id,
      equipment_id: item.equipment_id,
      quantity: item.quantity,
    }));

    const { error: itemsInsertErr } = await supabaseAdmin
      .from("borrow_items")
      .insert(borrowItemsPayload);

    if (itemsInsertErr) {
      console.error("Failed to insert borrow items:", itemsInsertErr);
      // Clean up borrow row and rollback stock
      await supabaseAdmin.from("borrows").delete().eq("id", borrow.id);
      for (const item of updatedItems) {
        const eq = equipmentList.find((e) => e.id === item.id)!;
        await supabaseAdmin
          .from("equipment")
          .update({ available_units: eq.available_units })
          .eq("id", item.id);
      }
      return NextResponse.json({ message: "Failed to record borrow items." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      borrow_id: borrow.id,
      loan_code: borrow.loan_code,
      due_at: borrow.due_at,
      message: "Equipment borrow issued successfully.",
    });
  } catch (error) {
    console.error("POST /api/borrows error:", error);
    return NextResponse.json({ message: "Server error issuing borrow." }, { status: 500 });
  }
}
