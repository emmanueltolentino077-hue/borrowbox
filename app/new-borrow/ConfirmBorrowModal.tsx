"use client";

import {
  ClipboardCheck,
  X,
  Clock,
  Calendar,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";

export interface Borrower {
  id: string;
  borrower_code: string;
  full_name: string;
  email: string;
  type: string;
  department_code: string;
  department_name: string;
}

export interface TrayItem {
  equipment: {
    id: string;
    name: string;
    product_code: string;
    category: string;
    available_units: number;
    total_units: number;
  };
  quantity: number;
}

interface ConfirmBorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  borrower: Borrower | null;
  tray: TrayItem[];
  durationLabel: string;
  dueAtFormatted: string;
  isSubmitting: boolean;
  errorMessage: string | null;
}

export default function ConfirmBorrowModal({
  isOpen,
  onClose,
  onConfirm,
  borrower,
  tray,
  durationLabel,
  dueAtFormatted,
  isSubmitting,
  errorMessage,
}: ConfirmBorrowModalProps) {
  if (!isOpen || !borrower) return null;

  const initials = borrower.full_name
    ? borrower.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "BR";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#b9c4bb] max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-[#e8dfda]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eafff1] border border-[#a7f3d0] flex items-center justify-center text-[#006e2e] shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-lg text-[#1f1a17]">
                Confirm Equipment Borrow
              </h3>
              <p className="text-xs text-[#78716c]">
                Please confirm the details before finalizing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Borrower Info Card */}
        <div className="mt-5 p-4 rounded-xl bg-[#fbf7f4] border border-[#e8dfda] flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-[#006e2e] text-white flex items-center justify-center font-mono text-sm font-bold shrink-0 shadow-sm">
            {initials}
          </div>
          <div className="overflow-hidden">
            <h4 className="font-sans font-bold text-sm text-[#1f1a17] truncate">
              {borrower.full_name}
            </h4>
            <p className="font-mono text-xs text-[#78716c]">
              ID: #{borrower.borrower_code} &bull; {borrower.department_code}
            </p>
          </div>
        </div>

        {/* Staged Hardware Summary */}
        <div className="mt-5">
          <p className="text-[11px] font-mono uppercase tracking-wider text-[#78716c] font-semibold mb-2.5">
            STAGED HARDWARE SUMMARY
          </p>
          <div className="space-y-2">
            {tray.map(({ equipment, quantity }) => (
              <div
                key={equipment.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-[#e8dfda] bg-white shadow-xs"
              >
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-[#eafff1] border border-[#a7f3d0] font-mono text-xs font-bold text-[#006e2e]">
                  {quantity}x
                </span>
                <span className="font-medium text-xs text-[#1f1a17] truncate">
                  {equipment.name}
                </span>
                <span className="ml-auto font-mono text-[10px] text-[#78716c]">
                  {equipment.product_code}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Duration and Due Date */}
        <div className="mt-5 p-3.5 rounded-xl border border-[#e8dfda] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#78716c]" />
            <div>
              <p className="text-[10px] font-mono uppercase text-[#78716c]">DURATION</p>
              <p className="text-xs font-bold text-[#1f1a17]">{durationLabel}</p>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#eafff1] border border-[#a7f3d0] text-[#006e2e] font-mono text-xs font-semibold">
            <Calendar className="w-3.5 h-3.5" />
            <span>Due: {dueAtFormatted}</span>
          </div>
        </div>

        {/* Stock conflict error if any */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="font-mono">{errorMessage}</div>
          </div>
        )}

        {/* Warning Callout */}
        <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Once confirmed, items will be marked as{" "}
            <span className="font-bold">Borrowed</span> in inventory and
            deducted from available hub stock.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-[#e8dfda]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-lg border border-[#78716c] hover:bg-neutral-50 text-[#1f1a17] font-mono text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
          >
            Cancel / Edit Tray
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-lg bg-[#006e2e] hover:bg-[#005a24] text-white font-mono text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {isSubmitting ? (
              <span>Issuing Dispatch...</span>
            ) : (
              <>
                <svg
                  className="w-4 h-4 stroke-[2.5]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Yes, Confirm &amp; Issue Borrow</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
