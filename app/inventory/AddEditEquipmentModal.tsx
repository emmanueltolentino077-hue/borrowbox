"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  X,
  UploadCloud,
  Box,
  Check,
  AlertCircle,
} from "lucide-react";

export interface EquipmentItem {
  id: string;
  product_code: string;
  name: string;
  category: string;
  spec?: string | null;
  image_url?: string | null;
  total_units: number;
  available_units: number;
  borrowed_units?: number;
  borrowed_percent?: number;
  stock_status?: string;
  is_archived: boolean;
}

interface AddEditEquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemToEdit?: EquipmentItem | null;
}

const CATEGORIES = [
  "Monitor",
  "PC",
  "Mouse",
  "Keyboard",
  "Headset",
  "Projector",
  "Laptops",
  "Audio/Visual",
];

export default function AddEditEquipmentModal({
  isOpen,
  onClose,
  onSuccess,
  itemToEdit,
}: AddEditEquipmentModalProps) {
  const isEditing = Boolean(itemToEdit);

  const [name, setName] = useState(itemToEdit?.name || "");
  const [productCode, setProductCode] = useState(itemToEdit?.product_code || "");
  const [category, setCategory] = useState(itemToEdit?.category || "Monitor");
  const [spec, setSpec] = useState(itemToEdit?.spec || "");
  const [quantity, setQuantity] = useState(
    itemToEdit ? itemToEdit.total_units : 5
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    itemToEdit?.image_url || null
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentlyBorrowed = itemToEdit
    ? itemToEdit.total_units - itemToEdit.available_units
    : 0;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      setErrorMessage("Please select a PNG, JPG, or WEBP image.");
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      setErrorMessage("Image file cannot exceed 4 MB.");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setErrorMessage(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Product name is required.");
      return;
    }
    if (!isEditing && !productCode.trim()) {
      setErrorMessage("Product code is required.");
      return;
    }
    if (quantity <= 0) {
      setErrorMessage("Quantity must be greater than 0.");
      return;
    }
    if (isEditing && quantity < currentlyBorrowed) {
      setErrorMessage(
        `Total units cannot be less than the currently borrowed units (${currentlyBorrowed} units out).`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("category", category);
      formData.append("spec", spec.trim());
      formData.append("quantity", String(quantity));

      if (isEditing) {
        formData.append("total_units", String(quantity));
      } else {
        formData.append("product_code", productCode.trim().toUpperCase());
      }

      if (selectedFile) {
        formData.append("image", selectedFile);
      }

      const url = isEditing
        ? `/api/equipment/${itemToEdit?.id}`
        : "/api/equipment";

      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.message || "Failed to save equipment.");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setErrorMessage("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-[#b9c4bb] overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-6 border-b border-[#e8dfda] flex items-start justify-between bg-white">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#006e2e] flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-xl text-[#1f1a17]">
                {isEditing ? "Edit Equipment" : "Add New Equipment"}
              </h3>
              <p className="text-xs text-[#57534e] mt-1">
                Enter hardware catalog specifications to register units into campus inventory.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Photo Upload Area */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#44403c] mb-1.5">
              EQUIPMENT IMAGE (OPTIONAL)
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#b9c4bb] hover:border-[#006e2e] bg-[#fbf7f4] rounded-lg p-4 text-center cursor-pointer transition-colors relative flex flex-col items-center justify-center gap-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative group w-32 h-24 rounded overflow-hidden border border-[#b9c4bb]">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-mono transition-opacity">
                    Change Photo
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-9 h-9 rounded-full bg-[#f5ede6] flex items-center justify-center text-[#78716c]">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="text-xs text-[#3d4640]">
                    Drop image here or <span className="text-[#006e2e] font-semibold underline">browse file</span>
                  </div>
                  <p className="text-[10px] font-mono text-[#78716c]">
                    PNG, JPG or WEBP up to 4MB
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Product Name */}
          <div>
            <label
              htmlFor="prod-name"
              className="block text-xs font-mono font-bold uppercase tracking-wider text-[#44403c] mb-1.5"
            >
              PRODUCT NAME <span className="text-red-600">*</span>
            </label>
            <input
              id="prod-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Apple MacBook Pro 14&quot; M3"
              className="w-full px-3.5 py-2.5 bg-[#fbf7f4] border border-[#d6cfca] rounded text-sm text-[#1f1a17] placeholder:text-neutral-400 focus:outline-none focus:border-[#006e2e] focus:ring-1 focus:ring-[#006e2e]"
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="prod-category"
                className="block text-xs font-mono font-bold uppercase tracking-wider text-[#44403c]"
              >
                CATEGORY <span className="text-red-600">*</span>
              </label>
              <span className="text-[10px] font-mono text-[#78716c]">Taxonomy Group</span>
            </div>
            <select
              id="prod-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#fbf7f4] border border-[#d6cfca] rounded text-sm text-[#1f1a17] focus:outline-none focus:border-[#006e2e] focus:ring-1 focus:ring-[#006e2e]"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Specifications (Optional) */}
          <div>
            <label
              htmlFor="prod-spec"
              className="block text-xs font-mono font-bold uppercase tracking-wider text-[#44403c] mb-1.5"
            >
              SPECIFICATIONS (OPTIONAL)
            </label>
            <input
              id="prod-spec"
              type="text"
              value={spec}
              onChange={(e) => setSpec(e.target.value)}
              placeholder="e.g., 22-inch Full HD, 16GB RAM, Wireless"
              className="w-full px-3.5 py-2.5 bg-[#fbf7f4] border border-[#d6cfca] rounded text-sm text-[#1f1a17] placeholder:text-neutral-400 focus:outline-none focus:border-[#006e2e] focus:ring-1 focus:ring-[#006e2e]"
            />
          </div>

          {/* Product Code */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="prod-code"
                className="block text-xs font-mono font-bold uppercase tracking-wider text-[#44403c]"
              >
                PRODUCT CODE <span className="text-red-600">*</span>
              </label>
              <span className="text-[10px] font-mono text-[#78716c]">SKU / Catalog ID</span>
            </div>
            <input
              id="prod-code"
              type="text"
              required
              disabled={isEditing}
              value={productCode}
              onChange={(e) => setProductCode(e.target.value.toUpperCase())}
              placeholder="e.g., EQ-LP-105"
              className={`w-full px-3.5 py-2.5 font-mono text-sm border rounded focus:outline-none ${
                isEditing
                  ? "bg-neutral-100 text-neutral-500 border-neutral-300 cursor-not-allowed"
                  : "bg-[#fbf7f4] text-[#1f1a17] border-[#d6cfca] focus:border-[#006e2e] focus:ring-1 focus:ring-[#006e2e]"
              }`}
            />
            <p className="text-[11px] text-[#78716c] mt-1 font-mono">
              Unique catalog identifier / SKU code for logistics tagging
            </p>
          </div>

          {/* Quantity */}
          <div>
            <label
              htmlFor="prod-qty"
              className="block text-xs font-mono font-bold uppercase tracking-wider text-[#44403c] mb-1.5"
            >
              {isEditing ? "TOTAL PHYSICAL UNITS" : "QUANTITY"} <span className="text-red-600">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                id="prod-qty"
                type="number"
                min={isEditing ? currentlyBorrowed : 1}
                max={9999}
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                className="w-24 px-3.5 py-2.5 bg-[#fbf7f4] border border-[#d6cfca] rounded text-sm text-[#1f1a17] font-mono font-bold focus:outline-none focus:border-[#006e2e] focus:ring-1 focus:ring-[#006e2e]"
              />
              <span className="text-xs text-[#57534e] bg-[#f5ede6] px-3 py-2 rounded font-mono">
                {isEditing
                  ? `${currentlyBorrowed} units currently borrowed`
                  : "Initial physical units available for borrowing"}
              </span>
            </div>
          </div>

          {/* Default Status Assignment Banner */}
          {!isEditing && (
            <div className="p-3 bg-[#eafff1] border border-[#a7f3d0] rounded-lg flex items-center justify-between text-xs font-mono">
              <span className="text-[#006e2e] font-medium flex items-center gap-1.5">
                <Check className="w-4 h-4 stroke-[2.5]" />
                Default Status Assignment
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-[#a7f3d0] text-[#006e2e] font-bold text-[10px]">
                IN STOCK / READY FOR BORROW
              </span>
            </div>
          )}

          {/* Modal Buttons */}
          <div className="pt-4 border-t border-[#e8dfda] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded border border-[#78716c] text-[#1f1a17] hover:bg-neutral-50 font-mono text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#006e2e] hover:bg-[#005a24] text-white font-mono text-xs font-semibold uppercase tracking-wider rounded flex items-center gap-2 shadow-sm transition-colors disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Saving Equipment...</span>
              ) : (
                <>
                  <span>{isEditing ? "Save Changes" : "+ Add Equipment"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
