"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  CornerDownLeft,
  PackageCheck,
  Plus,
  PlusCircle,
  Bell,
  Box,
  CheckCircle2,
  ArrowLeftRight,
  LogOut,
  Clock,
  RefreshCw,
} from "lucide-react";
import ViewItemsModal from "@/app/returns/ViewItemsModal";

interface AdminUser {
  id: string;
  employee_id: string;
  company_email: string;
  full_name: string;
  username: string;
}

interface BorrowerSummary {
  id: string;
  borrower_code: string;
  full_name: string;
  email: string;
  type: string;
  department_code: string;
  department_name: string;
}

interface LatestBorrowRecord {
  id: string;
  loan_code: string;
  issued_at: string;
  due_at: string;
  returned_at: string | null;
  status: "Active" | "Due Today" | "Overdue" | "Returned";
  total_items_count: number;
  borrower: BorrowerSummary | null;
}

interface DashboardStats {
  totalInventoryUnits: number;
  availableUnits: number;
  availablePercent: number;
  totalEquipmentCount: number;
  activeBorrowUnits: number;
  distinctBorrowersCount: number;
}

interface DashboardClientProps {
  admin: AdminUser;
}

export default function DashboardClient({ admin }: DashboardClientProps) {
  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats>({
    totalInventoryUnits: 0,
    availableUnits: 0,
    availablePercent: 0,
    totalEquipmentCount: 0,
    activeBorrowUnits: 0,
    distinctBorrowersCount: 0,
  });

  const [latestBorrows, setLatestBorrows] = useState<LatestBorrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);

  // View Items Modal state
  const [viewItemsBorrowId, setViewItemsBorrowId] = useState<string | null>(null);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const res = await fetch("/api/dashboard", { signal: controller.signal });
        const data = await res.json();

        if (!ignore && res.ok) {
          setStats(
            data.stats || {
              totalInventoryUnits: 0,
              availableUnits: 0,
              availablePercent: 0,
              totalEquipmentCount: 0,
              activeBorrowUnits: 0,
              distinctBorrowersCount: 0,
            }
          );
          setLatestBorrows(data.latestBorrows || []);
        }
      } catch (err: unknown) {
        if (!ignore && (err as Error)?.name !== "AbortError") {
          console.error("Failed to load dashboard:", err);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [refreshIndex]);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  function formatIssueDate(isoString: string) {
    const d = new Date(isoString);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function formatIssueTime(isoString: string) {
    const d = new Date(isoString);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  function formatDueDate(isoString: string) {
    const d = new Date(isoString);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function renderStatusBadge(status: string) {
    switch (status) {
      case "Due Today":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#ffebdc] text-[#d97706] border border-[#fed7aa]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
            DUE TODAY
          </span>
        );
      case "Overdue":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b91c1c]" />
            OVERDUE
          </span>
        );
      case "Returned":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#f5ede6] text-[#78716c] border border-[#e8dfda]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#78716c]" />
            RETURNED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-[#eafff1] text-[#006e2e] border border-[#a7f3d0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006e2e]" />
            BORROWED
          </span>
        );
    }
  }

  function getAvatarColorClass(name: string) {
    const palettes = [
      "bg-[#f5ede6] text-[#1f1a17] border border-[#e8dfda]", // Beige/tan
      "bg-[#006e2e] text-white",                              // Green
      "bg-[#3d4640] text-white",                              // Dark slate
      "bg-[#991b1b] text-white",                              // Crimson
      "bg-[#0369a1] text-white",                              // Blue
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palettes.length;
    return palettes[index];
  }

  const initials = admin.full_name
    ? admin.full_name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "AD";

  return (
    <div className="min-h-screen bg-[#e0d8d2] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-[#d6cfca] flex flex-col justify-between shrink-0">
        <div className="p-4">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="w-9 h-9 rounded-lg bg-[#15803d] flex items-center justify-center text-white shrink-0 shadow-sm">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </div>
            <div>
              <h1 className="font-sans font-bold text-base leading-tight text-[#1f1a17]">
                BorrowBox
              </h1>
              <p className="font-mono text-[10px] uppercase tracking-wider text-[#565e74]">
                Campus IT Equipment
              </p>
              <p className="font-mono text-[9px] uppercase tracking-wider text-[#78716c]">
                Dispatch &amp; Logistics
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#78716c] px-3 mb-2 font-semibold">
              EQUIPMENT OPERATIONS
            </p>
            <nav className="space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded bg-[#006e2e] text-white font-medium text-sm transition-colors shadow-xs"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </Link>

              <Link
                href="/new-borrow"
                className="flex items-center gap-3 px-3 py-2.5 rounded text-[#3d4640] hover:bg-[#efe5df] font-medium text-sm transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>New Borrow</span>
              </Link>

              <Link
                href="/returns"
                className="flex items-center gap-3 px-3 py-2.5 rounded text-[#3d4640] hover:bg-[#efe5df] font-medium text-sm transition-colors"
              >
                <CornerDownLeft className="w-4 h-4" />
                <span>Returns Desk</span>
              </Link>

              <Link
                href="/inventory"
                className="flex items-center gap-3 px-3 py-2.5 rounded text-[#3d4640] hover:bg-[#efe5df] font-medium text-sm transition-colors"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Equipment Inventory</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* Admin Profile & Status */}
        <div className="p-4 border-t border-[#e8dfda] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-[#006e2e]">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="w-2 h-2 rounded-full bg-[#006e2e] animate-pulse" />
              SUPABASE DB
            </span>
            <span className="text-[#57534e]">Connected</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#f5ede6]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#006e2e] text-white flex items-center justify-center font-mono text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-[#1f1a17] truncate">
                  {admin.full_name}
                </p>
                <p className="text-[10px] text-[#78716c] truncate font-mono">
                  IT Administrator
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isLoggingOut}
              title="Sign Out"
              className="p-1.5 text-neutral-500 hover:text-red-600 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
        {/* Top Bar */}
        <div className="flex items-center justify-end gap-3 mb-2">
          <button
            onClick={() => {
              setIsLoading(true);
              setRefreshIndex((p) => p + 1);
            }}
            title="Refresh Dashboard"
            className="w-9 h-9 rounded-full bg-white border border-[#b9c4bb] flex items-center justify-center text-[#57534e] hover:bg-neutral-50 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#006e2e]" : ""}`} />
          </button>
          <button className="w-9 h-9 rounded-full bg-white border border-[#b9c4bb] flex items-center justify-center text-[#57534e] hover:bg-neutral-50 transition-colors shadow-sm">
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-full bg-[#006e2e] text-white flex items-center justify-center font-mono text-xs font-bold shadow-sm">
            {initials}
          </div>
        </div>

        {/* Dashboard Title & Action */}
        <div className="bg-white rounded-2xl p-6 border border-[#b9c4bb] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-bold font-sans text-[#1f1a17]">
                Dashboard
              </h2>
              <span className="bg-[#eafff1] border border-[#a7f3d0] text-[#006e2e] text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#006e2e] animate-pulse" />
                OPERATIONAL
              </span>
            </div>
            <p className="text-xs text-[#57534e] mt-1">
              Real-time overview of IT equipment circulation, active borrows, and inventory health.
            </p>
          </div>

          <Link
            href="/inventory?action=add"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#006e2e] hover:bg-[#005a24] text-white font-mono text-xs font-semibold uppercase tracking-wider rounded-xl transition-colors shadow-sm shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Equipment</span>
          </Link>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Total Units */}
          <div className="bg-white rounded-2xl p-6 border border-[#b9c4bb] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[#78716c]">
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  TOTAL INVENTORY UNITS
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#f5ede6] flex items-center justify-center text-[#78716c]">
                  <Box className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold font-sans text-[#1f1a17]">
                  {stats.totalInventoryUnits}
                </span>
                <span className="text-xs text-[#78716c] font-medium font-mono">Units</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f5ede6] text-xs font-mono text-[#006e2e] flex items-center gap-1.5 font-medium">
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="font-bold">+{stats.totalEquipmentCount}</span>
              <span className="text-[#57534e]">newly added equipments</span>
            </div>
          </div>

          {/* Card 2: Available Units */}
          <div className="bg-white rounded-2xl p-6 border border-[#b9c4bb] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[#78716c]">
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  AVAILABLE UNITS
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#eafff1] flex items-center justify-center text-[#006e2e]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold font-sans text-[#1f1a17]">
                  {stats.availableUnits}
                </span>
                <span className="text-xs text-[#78716c] font-medium font-mono">Units</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f5ede6]">
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-[#006e2e] font-semibold">Ready for dispatch</span>
                <span className="text-[#57534e]">{stats.availablePercent}% in hub</span>
              </div>
              <div className="w-full bg-[#f5ede6] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#006e2e] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, stats.availablePercent))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 3: Active Borrows */}
          <div className="bg-white rounded-2xl p-6 border border-[#b9c4bb] shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-[#78716c]">
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  ACTIVE BORROWS
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#ffebdc] flex items-center justify-center text-[#d97706]">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-bold font-sans text-[#1f1a17]">
                  {stats.activeBorrowUnits}
                </span>
                <span className="text-xs text-[#78716c] font-medium font-mono">Units</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-[#f5ede6] flex items-center justify-between text-xs">
              <span className="text-[#57534e]">In campus circulation</span>
              <span className="bg-[#ffebdc] text-[#8f5200] font-mono text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#fed7aa] uppercase">
                {stats.distinctBorrowersCount} BORROWERS
              </span>
            </div>
          </div>
        </div>

        {/* Latest Borrowed Table */}
        <div className="bg-white rounded-2xl p-6 border border-[#b9c4bb] shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold font-sans text-[#1f1a17]">
              Latest Borrowed
            </h3>
            <p className="text-xs text-[#57534e]">
              Top 5 recent circulation records.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e8dfda] text-[10px] font-mono uppercase tracking-wider text-[#78716c] bg-[#fbf7f4]">
                  <th className="py-2.5 px-3">BORROWER &amp; DEPT</th>
                  <th className="py-2.5 px-3">BORROWED ITEMS</th>
                  <th className="py-2.5 px-3">TIME ISSUED</th>
                  <th className="py-2.5 px-3">DUE DATE</th>
                  <th className="py-2.5 px-3 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5ede6] text-xs">
                {latestBorrows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#78716c] font-mono">
                      {isLoading ? "Loading circulation records..." : "No recent borrow records found."}
                    </td>
                  </tr>
                ) : (
                  latestBorrows.map((b) => {
                    const initialsCircle = b.borrower?.full_name
                      ? b.borrower.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : "BR";

                    return (
                      <tr key={b.id} className="hover:bg-[#fbf7f4]/80 transition-colors">
                        {/* Borrower & Dept */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${getAvatarColorClass(b.borrower?.full_name || "")} font-mono text-xs font-bold flex items-center justify-center shrink-0 shadow-xs`}>
                              {initialsCircle}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-[#1f1a17]">
                                  {b.borrower?.full_name || "Unknown Borrower"}
                                </span>
                                {b.borrower?.type && (
                                  <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-[#f5ede6] text-[#78716c] border border-[#e8dfda]">
                                    {b.borrower.type}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#78716c] font-mono">
                                {b.borrower?.department_name || b.borrower?.department_code || "Campus"} &bull; ID: #{b.borrower?.borrower_code}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Borrowed Items */}
                        <td className="py-3.5 px-3 font-mono">
                          <span className="font-semibold text-[#1f1a17]">
                            {b.total_items_count} {b.total_items_count === 1 ? "Item" : "Items"}
                          </span>{" "}
                          &bull;{" "}
                          <button
                            type="button"
                            onClick={() => setViewItemsBorrowId(b.id)}
                            className="text-[#006e2e] hover:underline font-semibold cursor-pointer"
                          >
                            View Items
                          </button>
                        </td>

                        {/* Time Issued - Two lines as in screenshot */}
                        <td className="py-3.5 px-3 font-mono">
                          <div className="text-xs text-[#1f1a17]">
                            {formatIssueDate(b.issued_at)}
                          </div>
                          <div className="text-[11px] text-[#78716c]">
                            {formatIssueTime(b.issued_at)}
                          </div>
                        </td>

                        {/* Due Date */}
                        <td className="py-3.5 px-3 font-mono text-[#57534e]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#78716c]" />
                            <span>{formatDueDate(b.due_at)}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-right">
                          {renderStatusBadge(b.status)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="-mx-6 -mb-6 mt-4 p-4 rounded-b-2xl bg-[#fbf7f4] border-t border-[#e8dfda] text-xs font-mono text-[#78716c]">
            Showing <span className="font-bold text-[#1f1a17]">top 5</span> latest active borrowings
          </div>
        </div>
      </main>

      {/* View Items Modal */}
      <ViewItemsModal
        isOpen={Boolean(viewItemsBorrowId)}
        borrowId={viewItemsBorrowId}
        onClose={() => setViewItemsBorrowId(null)}
      />
    </div>
  );
}
