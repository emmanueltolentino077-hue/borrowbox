"use client";

import { CheckCircle2 } from "lucide-react";

interface SuccessBorrowModalProps {
  isOpen: boolean;
  onDoneAndNewBorrow: () => void;
  loanCode?: string;
  dueAtFormatted?: string;
}

export default function SuccessBorrowModal({
  isOpen,
  onDoneAndNewBorrow,
  loanCode,
  dueAtFormatted,
}: SuccessBorrowModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl border border-[#b9c4bb] text-center flex flex-col items-center">
        {/* Large Rounded Icon Container */}
        <div className="w-16 h-16 rounded-2xl border-2 border-[#15803d] flex items-center justify-center text-[#15803d] mb-5 shadow-xs">
          <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
        </div>

        {/* Success Message */}
        <h3 className="font-sans font-bold text-xl text-[#1f1a17] leading-tight">
          Equipment Borrow Successfully!
        </h3>

        {loanCode && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fbf7f4] border border-[#e8dfda] font-mono text-xs text-[#57534e]">
            <span>LOAN:</span>
            <span className="font-bold text-[#1f1a17]">{loanCode}</span>
          </div>
        )}

        {dueAtFormatted && (
          <p className="mt-2 text-xs font-mono text-[#78716c]">
            Expected Return: <span className="font-semibold text-[#1f1a17]">{dueAtFormatted}</span>
          </p>
        )}

        {/* Action Button: Done & New Borrow */}
        <button
          type="button"
          onClick={onDoneAndNewBorrow}
          className="mt-6 w-full py-3 px-4 rounded-xl bg-[#006e2e] hover:bg-[#005a24] text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
        >
          <svg
            className="w-4 h-4 stroke-[2.5]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Done &amp; New Borrow</span>
        </button>
      </div>
    </div>
  );
}
