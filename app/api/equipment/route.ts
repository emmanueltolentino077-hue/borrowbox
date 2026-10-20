import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/supabase/auth/guard";
import { getStockStatus, type StockStatus } from "@/lib/borrowbox";

function mapStockStatusToLabel(status: StockStatus): "Available" | "Low Stock" | "Out of Stock" {
  if (status === "Ready") return "Available";
  if (status === "Low Stock") return "Low Stock";
  return "Out of Stock";
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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "7", 10));

    // 1. Fetch all non-archived equipment to calculate global metrics and allow in-memory filtering
    const { data: allEquipment, error } = await supabaseAdmin
      .from("equipment")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch equipment:", error.message);
      return NextResponse.json({ message: "Unable to load equipment inventory." }, { status: 500 });
    }

    const itemsWithMetrics = (allEquipment || []).map((item) => {
      const borrowedUnits = Math.max(0, item.total_units - item.available_units);
      const borrowedPercent =
        item.total_units > 0 ? Math.round((borrowedUnits / item.total_units) * 100) : 0;
      const rawStatus = getStockStatus(item.total_units, item.available_units);
      const stockStatusLabel = mapStockStatusToLabel(rawStatus);

      return {
        ...item,
        borrowed_units: borrowedUnits,
        borrowed_percent: borrowedPercent,
        stock_status: stockStatusLabel,
      };
    });

    // 2. Global stats across all non-archived inventory
    const totalInventoryUnits = itemsWithMetrics.reduce((sum, item) => sum + item.total_units, 0);
    const availableStock = itemsWithMetrics.reduce((sum, item) => sum + item.available_units, 0);
    const currentlyBorrowed = totalInventoryUnits - availableStock;
    const availablePercent =
      totalInventoryUnits > 0 ? Number(((availableStock / totalInventoryUnits) * 100).toFixed(1)) : 0;
    const borrowedPercent =
      totalInventoryUnits > 0 ? Number(((currentlyBorrowed / totalInventoryUnits) * 100).toFixed(1)) : 0;

    // 3. Filter items based on search, category, and status
    let filtered = itemsWithMetrics;

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.product_code.toLowerCase().includes(search)
      );
    }

    if (category && category !== "All" && category !== "All Categories") {
      filtered = filtered.filter(
        (item) => item.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (statusFilter && statusFilter !== "All" && statusFilter !== "All Statuses") {
      filtered = filtered.filter(
        (item) => item.stock_status.toLowerCase() === statusFilter.toLowerCase()
      );
    }

    // 4. Pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      ok: true,
      stats: {
        totalInventoryUnits,
        availableStock,
        currentlyBorrowed,
        availablePercent,
        borrowedPercent,
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
    console.error("GET /api/equipment error:", error);
    return NextResponse.json({ message: "Server error retrieving equipment." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let uploadedImagePath: string | null = null;
  try {
    const auth = await requireAdminApi();
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const contentType = request.headers.get("content-type") || "";

    let name = "";
    let productCode = "";
    let category = "";
    let spec = "";
    let quantity = 1;
    let imageFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      name = (formData.get("name") as string)?.trim() || "";
      productCode = (formData.get("product_code") as string)?.trim().toUpperCase() || "";
      category = (formData.get("category") as string)?.trim() || "";
      spec = (formData.get("spec") as string)?.trim() || "";
      quantity = parseInt((formData.get("quantity") as string) || "1", 10);
      const fileEntry = formData.get("image");
      if (fileEntry instanceof File && fileEntry.size > 0) {
        imageFile = fileEntry;
      }
    } else {
      const body = await request.json().catch(() => ({}));
      name = typeof body.name === "string" ? body.name.trim() : "";
      productCode = typeof body.product_code === "string" ? body.product_code.trim().toUpperCase() : "";
      category = typeof body.category === "string" ? body.category.trim() : "";
      spec = typeof body.spec === "string" ? body.spec.trim() : "";
      const rawQty = body.total_units !== undefined ? body.total_units : body.quantity;
      quantity = typeof rawQty === "number" ? rawQty : parseInt(rawQty !== undefined ? rawQty : "1", 10);
    }

    // Validation
    if (!name) {
      return NextResponse.json({ message: "Product name is required." }, { status: 400 });
    }
    if (!productCode) {
      return NextResponse.json({ message: "Product code is required." }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ message: "Category is required." }, { status: 400 });
    }
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json({ message: "Quantity must be a positive number." }, { status: 400 });
    }

    // Check product code uniqueness ignoring case (across both active and archived items per Q30/Q33)
    const { data: existingCode } = await supabaseAdmin
      .from("equipment")
      .select("id, product_code")
      .ilike("product_code", productCode)
      .maybeSingle();

    if (existingCode) {
      return NextResponse.json(
        { message: `Product code "${productCode}" already exists. Product codes must be unique.` },
        { status: 400 }
      );
    }

    // Photo processing (Q34: Optional, PNG/JPG/WEBP up to 4MB)
    let imageUrl: string | null = null;

    if (imageFile) {
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(imageFile.type)) {
        return NextResponse.json(
          { message: "Only PNG, JPG, or WEBP images are supported." },
          { status: 400 }
        );
      }

      if (imageFile.size > 4 * 1024 * 1024) {
        return NextResponse.json(
          { message: "Image file exceeds maximum allowed size of 4 MB." },
          { status: 400 }
        );
      }

      const extension = imageFile.name.split(".").pop() || "png";
      const sanitizedName = name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30);
      const fileName = `${Date.now()}-${sanitizedName}.${extension}`;
      uploadedImagePath = fileName;

      const buffer = Buffer.from(await imageFile.arrayBuffer());

      const { error: uploadError } = await supabaseAdmin.storage
        .from("equipment-images")
        .upload(fileName, buffer, {
          contentType: imageFile.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError.message);
        return NextResponse.json(
          { message: "Failed to upload image. Please try again." },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("equipment-images")
        .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
    }

    // Insert into database
    const { data: newItem, error: insertError } = await supabaseAdmin
      .from("equipment")
      .insert({
        name,
        product_code: productCode,
        category,
        spec: spec || null,
        image_url: imageUrl,
        total_units: quantity,
        available_units: quantity,
        is_archived: false,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Database insert equipment error:", insertError.message);

      // Clean up uploaded image if DB write failed
      if (uploadedImagePath) {
        await supabaseAdmin.storage
          .from("equipment-images")
          .remove([uploadedImagePath])
          .catch((err) => console.error("Orphan image cleanup failed:", err));
      }

      return NextResponse.json(
        { message: "Failed to create equipment record." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Equipment added successfully.",
      item: newItem,
    });
  } catch (error) {
    console.error("POST /api/equipment error:", error);
    if (uploadedImagePath) {
      await supabaseAdmin.storage
        .from("equipment-images")
        .remove([uploadedImagePath])
        .catch(() => {});
    }
    return NextResponse.json({ message: "Unable to add equipment." }, { status: 500 });
  }
}
