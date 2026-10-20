import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/supabase/auth/guard";
import { getStockStatus } from "@/lib/borrowbox";

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request: Request) {
  try {
    const auth = await requireAdminApi();
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const category = searchParams.get("category")?.trim() || "";
    const statusFilter = searchParams.get("status")?.trim() || "";

    const { data: allEquipment, error } = await supabaseAdmin
      .from("equipment")
      .select("*")
      .eq("is_archived", false)
      .order("product_code", { ascending: true });

    if (error || !allEquipment) {
      return NextResponse.json({ message: "Unable to export inventory." }, { status: 500 });
    }

    let items = allEquipment.map((item) => {
      const borrowedUnits = Math.max(0, item.total_units - item.available_units);
      const rawStatus = getStockStatus(item.total_units, item.available_units);
      const stockStatus =
        rawStatus === "Ready" ? "Available" : rawStatus === "Low Stock" ? "Low Stock" : "Out of Stock";

      return {
        ...item,
        borrowed_units: borrowedUnits,
        stock_status: stockStatus,
      };
    });

    if (search) {
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(search) ||
          i.product_code.toLowerCase().includes(search)
      );
    }

    if (category && category !== "All" && category !== "All Categories") {
      items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
    }

    if (statusFilter && statusFilter !== "All" && statusFilter !== "All Statuses") {
      items = items.filter((i) => i.stock_status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Build CSV
    const csvRows = [
      [
        "Product Code",
        "Product Name",
        "Category",
        "Total Units",
        "Available Units",
        "Currently Borrowed",
        "Stock Status",
        "Specification",
        "Created At",
      ].map(escapeCsv).join(","),
    ];

    for (const item of items) {
      csvRows.push(
        [
          item.product_code,
          item.name,
          item.category,
          item.total_units,
          item.available_units,
          item.borrowed_units,
          item.stock_status,
          item.spec || "",
          new Date(item.created_at).toISOString().split("T")[0],
        ]
          .map(escapeCsv)
          .join(",")
      );
    }

    const csvContent = csvRows.join("\r\n");
    const dateStr = new Date().toISOString().split("T")[0];

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="borrowbox_inventory_${dateStr}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/equipment/export error:", error);
    return NextResponse.json({ message: "Server error during CSV export." }, { status: 500 });
  }
}
