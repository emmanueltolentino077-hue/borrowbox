import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminApi } from "@/lib/supabase/auth/guard";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let uploadedImagePath: string | null = null;
  try {
    const auth = await requireAdminApi();
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Equipment ID is required." }, { status: 400 });
    }

    const { data: currentItem, error: fetchErr } = await supabaseAdmin
      .from("equipment")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !currentItem) {
      return NextResponse.json({ message: "Equipment item not found." }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";

    let name = currentItem.name;
    let category = currentItem.category;
    let spec = currentItem.spec;
    let newTotalUnits = currentItem.total_units;
    let imageFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      if (formData.has("name")) name = (formData.get("name") as string).trim();
      if (formData.has("category")) category = (formData.get("category") as string).trim();
      if (formData.has("spec")) spec = (formData.get("spec") as string).trim();
      if (formData.has("total_units")) {
        newTotalUnits = parseInt((formData.get("total_units") as string), 10);
      }
      const fileEntry = formData.get("image");
      if (fileEntry instanceof File && fileEntry.size > 0) {
        imageFile = fileEntry;
      }
    } else {
      const body = await request.json().catch(() => ({}));
      if (typeof body.name === "string") name = body.name.trim();
      if (typeof body.category === "string") category = body.category.trim();
      if (typeof body.spec === "string") spec = body.spec.trim();
      if (body.total_units !== undefined) {
        newTotalUnits = typeof body.total_units === "number" ? body.total_units : parseInt(body.total_units, 10);
      }
    }

    // Validation
    if (!name) {
      return NextResponse.json({ message: "Product name cannot be empty." }, { status: 400 });
    }
    if (!category) {
      return NextResponse.json({ message: "Category cannot be empty." }, { status: 400 });
    }

    if (isNaN(newTotalUnits) || newTotalUnits <= 0) {
      return NextResponse.json(
        { message: "Total units must be a positive number (minimum 1)." },
        { status: 400 }
      );
    }

    // Q32 Enforcement: Edit total units when units are borrowed
    const currentlyBorrowed = currentItem.total_units - currentItem.available_units;
    if (newTotalUnits < currentlyBorrowed) {
      return NextResponse.json(
        {
          message: `Total units cannot be less than the currently borrowed units (${currentlyBorrowed} units out).`,
        },
        { status: 400 }
      );
    }

    const newAvailableUnits = currentItem.available_units + (newTotalUnits - currentItem.total_units);

    // Image upload if new file provided
    let imageUrl = currentItem.image_url;

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
        .upload(fileName, buffer, { contentType: imageFile.type });

      if (uploadError) {
        console.error("Storage upload error:", uploadError.message);
        return NextResponse.json(
          { message: "Failed to upload new image." },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from("equipment-images")
        .getPublicUrl(fileName);

      imageUrl = publicUrlData.publicUrl;
    }

    // Update equipment
    const { data: updatedItem, error: updateErr } = await supabaseAdmin
      .from("equipment")
      .update({
        name,
        category,
        spec: spec || null,
        total_units: newTotalUnits,
        available_units: newAvailableUnits,
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateErr || !updatedItem) {
      console.error("Failed to update equipment:", updateErr?.message);
      if (uploadedImagePath) {
        await supabaseAdmin.storage
          .from("equipment-images")
          .remove([uploadedImagePath])
          .catch(() => {});
      }
      return NextResponse.json({ message: "Unable to update equipment." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      message: "Equipment updated successfully.",
      item: updatedItem,
    });
  } catch (error) {
    console.error("PATCH /api/equipment/[id] error:", error);
    if (uploadedImagePath) {
      await supabaseAdmin.storage
        .from("equipment-images")
        .remove([uploadedImagePath])
        .catch(() => {});
    }
    return NextResponse.json({ message: "Server error updating equipment." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdminApi();
    if (!auth.success) {
      return NextResponse.json({ message: auth.message }, { status: auth.status });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Equipment ID is required." }, { status: 400 });
    }

    // 1. Fetch item
    const { data: item, error: fetchErr } = await supabaseAdmin
      .from("equipment")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchErr || !item) {
      return NextResponse.json({ message: "Equipment item not found." }, { status: 404 });
    }

    // 2. Q33 Rule: If units currently borrowed, block delete/archive
    const currentlyBorrowed = item.total_units - item.available_units;
    if (currentlyBorrowed > 0) {
      return NextResponse.json(
        {
          message: `Cannot remove or archive equipment with ${currentlyBorrowed} units currently borrowed. Wait for returns first.`,
        },
        { status: 400 }
      );
    }

    // 3. Q33 Rule: Check if item has any history in borrow_items
    const { count, error: countErr } = await supabaseAdmin
      .from("borrow_items")
      .select("id", { count: "exact", head: true })
      .eq("equipment_id", id);

    if (countErr) {
      console.error("Failed to check borrow_items history:", countErr.message);
      return NextResponse.json(
        { message: "Unable to verify equipment borrow history." },
        { status: 500 }
      );
    }

    const hasHistory = (count || 0) > 0;

    if (hasHistory) {
      // Safe Archive: preserves historical loan records
      const { error: archiveErr } = await supabaseAdmin
        .from("equipment")
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (archiveErr) {
        console.error("Archive error:", archiveErr.message);
        return NextResponse.json({ message: "Failed to archive equipment." }, { status: 500 });
      }

      return NextResponse.json({
        ok: true,
        action: "archived",
        message: `Equipment "${item.name}" has borrow history and was safely archived.`,
      });
    }

    // Permanent hard delete when item has never been borrowed
    const { error: deleteErr } = await supabaseAdmin
      .from("equipment")
      .delete()
      .eq("id", id);

    if (deleteErr) {
      console.error("Hard delete error:", deleteErr.message);
      return NextResponse.json({ message: "Failed to delete equipment." }, { status: 500 });
    }

    // Cleanup stored photo if exists
    if (item.image_url) {
      const parts = item.image_url.split("/");
      const fileName = parts[parts.length - 1];
      if (fileName) {
        await supabaseAdmin.storage
          .from("equipment-images")
          .remove([fileName])
          .catch(() => {});
      }
    }

    return NextResponse.json({
      ok: true,
      action: "deleted",
      message: `Equipment "${item.name}" was permanently removed.`,
    });
  } catch (error) {
    console.error("DELETE /api/equipment/[id] error:", error);
    return NextResponse.json({ message: "Server error deleting equipment." }, { status: 500 });
  }
}
