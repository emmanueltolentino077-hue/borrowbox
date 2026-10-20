"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  PackageCheck,
  X,
  Laptop,
  Monitor,
  Headphones,
  Mouse,
  Keyboard,
  Projector,
  Box,
  Layers,
  AlertCircle,
} from "lucide-react";

interface BorrowItemDetail {
  id: string;
  equipment_id: string;
  name: string;
  product_code: string;
  category: string;
  quantity: number;
  image_url: string | null;
  spec: string | null;
}

interface BorrowerDetail {
  id: string;
  borrower_code: string;
  full_name: string;
  email: string;
  type: string;
  department_code: string;
  department_name: string;
}

interface BorrowDetail {
  id: string;
  loan_code: string;
  issued_at: string;
  due_at: string;
  returned_at: string | null;
  status: "Active" | "Due Today" | "Overdue" | "Returned";
  total_units: number;
  borrower: BorrowerDetail;
  items: BorrowItemDetail[];
}

interface ViewItemsModalProps {
  isOpen: boolean;
  borrowId: string | null;
  onClose: () => void;
}

export default function ViewItemsModal({
  isOpen,
  borrowId,
  onClose,
}: ViewItemsModalProps) {
  const [data, setData] = useState<BorrowDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !borrowId) return;

    let ignore = false;
    async function fetchItems() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/borrows/${borrowId}/items`);
        const json = await res.json();
        if (!ignore) {
          if (res.ok) {
            setData(json.borrow);
          } else {
            setError(json.message || "Failed to load borrow items.");
          }
        }
      } catch {
        if (!ignore) {
          setError("Network error fetching items.");
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchItems();

    return () => {
      ignore = true;
    };
  }, [isOpen, borrowId]);

  if (!isOpen) return null;

  function getCategoryIcon(cat: string) {
    const c = (cat || "").toLowerCase();
    if (c.includes("laptop")) return <Laptop className="w-5 h-5 text-neutral-600" />;
    if (c.includes("monitor")) return <Monitor className="w-5 h-5 text-neutral-600" />;
    if (c.includes("headset") || c.includes("audio"))
      return <Headphones className="w-5 h-5 text-neutral-600" />;
    if (c.includes("mouse")) return <Mouse className="w-5 h-5 text-neutral-600" />;
    if (c.includes("keyboard")) return <Keyboard className="w-5 h-5 text-neutral-600" />;
    if (c.includes("projector")) return <Projector className="w-5 h-5 text-neutral-600" />;
    return <Box className="w-5 h-5 text-neutral-600" />;
  }

  // Format Status Badge
  function renderStatusBadge(status: string) {
    switch (status) {
      case "Due Today":
        return (
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-[#ffebdc] text-[#d97706] border border-[#fed7aa] font-bold uppercase flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
            DUE TODAY
          </span>
        );
      case "Overdue":
        return (
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] font-bold uppercase flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b91c1c]" />
            OVERDUE
          </span>
        );
      case "Returned":
        return (
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-[#f5ede6] text-[#78716c] border border-[#e8dfda] font-bold uppercase flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#78716c]" />
            RETURNED
          </span>
        );
      default:
        return (
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-[#eafff1] text-[#006e2e] border border-[#a7f3d0] font-bold uppercase flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006e2e]" />
            ACTIVE
          </span>
        );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#b9c4bb] max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#e8dfda]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eafff1] border border-[#a7f3d0] flex items-center justify-center text-[#006e2e] shrink-0">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-[#1f1a17]">
                Borrowed Equipment Details
              </h3>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#78716c]">
                ACTIVE CUSTODY LEDGER &amp; ASSIGNED ITEMS CHECKLIST
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="py-16 text-center text-xs font-mono text-[#78716c]">
            Loading items checklist...
          </div>
        ) : error ? (
          <div className="my-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : data ? (
          <div className="space-y-6 mt-5">
            {/* Borrower Card */}
            <div className="p-4 rounded-2xl bg-[#fbf7f4] border border-[#e8dfda] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-[#006e2e] text-white flex items-center justify-center font-mono text-sm font-bold shrink-0 shadow-sm">
                  {data.borrower?.full_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "BR"}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-sans font-bold text-base text-[#1f1a17]">
                      {data.borrower?.full_name}
                    </h4>
                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#e8dfda] text-[#57534e]">
                      {data.borrower?.type || "Borrower"}
                    </span>
                    {renderStatusBadge(data.status)}
                  </div>
                  <p className="text-xs text-[#57534e] mt-0.5">
                    {data.borrower?.department_name} ({data.borrower?.department_code}) &bull; ID: #{data.borrower?.borrower_code}
                  </p>
                  <p className="font-mono text-[11px] text-[#78716c]">
                    {data.borrower?.email} &bull; Loan: {data.loan_code}
                  </p>
                </div>
              </div>

              {/* Assigned Items Count Box */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white border border-[#e8dfda] shrink-0">
                <div>
                  <p className="text-[10px] font-mono uppercase text-[#78716c] font-semibold">
                    ASSIGNED ITEMS
                  </p>
                  <p className="font-sans font-bold text-lg text-[#1f1a17] leading-none mt-0.5">
                    {data.total_units} Items
                  </p>
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#eafff1] flex items-center justify-center text-[#006e2e]">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Equipment Inventory Manifest Table */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] font-mono uppercase tracking-wider text-[#78716c] font-semibold">
                  EQUIPMENT INVENTORY MANIFEST
                </p>
                <span className="text-xs font-mono text-[#78716c]">
                  {data.items.length} of {data.items.length} Verified Units
                </span>
              </div>

              <div className="rounded-xl border border-[#e8dfda] overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#fbf7f4] border-b border-[#e8dfda] text-[10px] font-mono uppercase tracking-wider text-[#78716c]">
                      <th className="py-2.5 px-4">ITEM &amp; CATEGORY</th>
                      <th className="py-2.5 px-4">PRODUCT CODE</th>
                      <th className="py-2.5 px-4 text-right">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5ede6]">
                    {data.items.map((item) => (
                      <tr key={item.id} className="hover:bg-[#fbf7f4]/60">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[#f5ede6] border border-[#e8dfda] flex items-center justify-center overflow-hidden shrink-0 relative">
                              {item.image_url ? (
                                <Image
                                  src={item.image_url}
                                  alt={item.name}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                getCategoryIcon(item.category)
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-[#1f1a17]">
                                {item.name} {item.quantity > 1 ? `(${item.quantity}x)` : ""}
                              </p>
                              <span className="font-mono text-[10px] uppercase text-[#78716c]">
                                {item.category}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-xs text-[#57534e]">
                          {item.product_code}
                        </td>

                        <td className="py-3 px-4 text-right">
                          {renderStatusBadge(data.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-6 pt-3 border-t border-[#e8dfda] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-[#78716c] hover:bg-neutral-50 text-[#1f1a17] font-mono text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
