"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  CornerDownLeft,
  PackageCheck,
  Bell,
  Search,
  RefreshCw,
  LogOut,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
} from "lucide-react";
import ViewItemsModal from "./ViewItemsModal";

interface AdminUser {
  id: string;
  employee_id: string;
  company_email: string;
  full_name: string;
  username: string;
}

interface BorrowerInfo {
  id: string;
  borrower_code: string;
  full_name: string;
  email: string;
  type: string;
  department_code: string;
  department_name: string;
}

interface BorrowItem {
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

interface BorrowRecord {
  id: string;
  loan_code: string;
  borrower_id: string;
  issued_by: string;
  issued_at: string;
  due_at: string;
  returned_at: string | null;
  returned_by: string | null;
  borrower: BorrowerInfo | null;
  borrow_items: BorrowItem[];
  total_items_count: number;
  status: "Active" | "Due Today" | "Overdue" | "Returned";
}

interface ReturnsDeskStats {
  allActiveBorrows: number;
  dueToday: number;
  overdue: number;
  returnedToday: number;
}

interface ReturnsDeskClientProps {
  admin: AdminUser;
}

export default function ReturnsDeskClient({ admin }: ReturnsDeskClientProps) {
  const router = useRouter();

  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [stats, setStats] = useState<ReturnsDeskStats>({
    allActiveBorrows: 0,
    dueToday: 0,
    overdue: 0,
    returnedToday: 0,
  });

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All Departments");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(8);

  const [isLoading, setIsLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [returningId, setReturningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // View Items Modal state
  const [viewItemsBorrowId, setViewItemsBorrowId] = useState<string | null>(null);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // -------------------------------------------------------------
  // Data Fetching
  // -------------------------------------------------------------
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function fetchBorrows() {
      try {
        const params = new URLSearchParams({
          search,
          department: departmentFilter === "All Departments" ? "" : departmentFilter,
          status: statusFilter === "All Statuses" ? "" : statusFilter,
          page: String(page),
          limit: String(limit),
        });

        const res = await fetch(`/api/borrows?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (!ignore && res.ok) {
          setBorrows(data.items || []);
          setStats(
            data.stats || {
              allActiveBorrows: 0,
              dueToday: 0,
              overdue: 0,
              returnedToday: 0,
            }
          );
          setTotalItems(data.pagination?.totalItems || 0);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      } catch (err: unknown) {
        if (!ignore && (err as Error)?.name !== "AbortError") {
          console.error("Failed to fetch borrows:", err);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchBorrows();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [search, departmentFilter, statusFilter, page, limit, refreshIndex]);

  // -------------------------------------------------------------
  // Return Action Handler (Q26, Q27)
  // -------------------------------------------------------------
  const handleMarkReturned = async (borrowId: string) => {
    setReturningId(borrowId);
    setActionError(null);

    try {
      const res = await fetch(`/api/borrows/${borrowId}/return`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setActionError(data.message || "Failed to mark borrow as returned.");
        return;
      }

      // Refresh list and stats
      setIsLoading(true);
      setRefreshIndex((prev) => prev + 1);
    } catch {
      setActionError("Network error marking borrow as returned.");
    } finally {
      setReturningId(null);
    }
  };

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

  function formatDueDate(isoString: string) {
    const d = new Date(isoString);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${months[d.getMonth()]} ${d.getDate()}, 5:00 PM`;
  }

  function renderStatusBadge(status: string) {
    switch (status) {
      case "Due Today":
        return (
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-[#ffebdc] text-[#d97706] border border-[#fed7aa] font-bold uppercase flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
            DUE TODAY
          </span>
        );
      case "Overdue":
        return (
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] font-bold uppercase flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b91c1c]" />
            OVERDUE
          </span>
        );
      case "Returned":
        return (
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-[#f5ede6] text-[#78716c] border border-[#e8dfda] font-bold uppercase flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-[#78716c]" />
            RETURNED
          </span>
        );
      default:
        return (
          <span className="font-mono text-[10px] px-2.5 py-1 rounded-full bg-[#eafff1] text-[#006e2e] border border-[#a7f3d0] font-bold uppercase flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-[#006e2e]" />
            ACTIVE
          </span>
        );
    }
  }

  const adminInitials = admin.full_name
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
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#78716c] px-3 mb-2 font-semibold">
              EQUIPMENT OPERATIONS
            </p>
            <nav className="space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-3 py-2.5 rounded text-[#3d4640] hover:bg-[#efe5df] font-medium text-sm transition-colors"
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
                className="flex items-center gap-3 px-3 py-2.5 rounded bg-[#006e2e] text-white font-medium text-sm transition-colors shadow-xs"
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
                {adminInitials}
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

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">
        {/* Top Bar */}
        <div className="flex items-center justify-end gap-3 mb-2">
          <button className="w-9 h-9 rounded-full bg-white border border-[#b9c4bb] flex items-center justify-center text-[#57534e] hover:bg-neutral-50 transition-colors shadow-sm">
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-full bg-[#006e2e] text-white flex items-center justify-center font-mono text-xs font-bold shadow-sm">
            {adminInitials}
          </div>
        </div>

        {/* Page Title */}
        <div>
          <h2 className="text-3xl font-bold font-sans text-[#1f1a17]">
            Active Borrows &amp; Returns
          </h2>
          <p className="text-xs text-[#57534e] mt-1 max-w-2xl leading-relaxed">
            Manage active borrowings, verify equipment condition, and mark transactions as returned.
          </p>
        </div>

        {/* Error notification banner if any */}
        {actionError && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <span className="font-mono">{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-red-500 hover:text-red-700 font-bold"
            >
              &times;
            </button>
          </div>
        )}

        {/* 4 Metric Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: ALL ACTIVE BORROWS */}
          <div className="bg-white rounded-2xl p-5 border-2 border-[#006e2e]/80 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#78716c]">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                ALL ACTIVE BORROWS
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#eafff1] flex items-center justify-center text-[#006e2e]">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2.5">
              <span className="text-3xl font-bold font-sans text-[#1f1a17]">
                {stats.allActiveBorrows}
              </span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eafff1] text-[#006e2e] border border-[#a7f3d0]">
                Active loans
              </span>
            </div>
          </div>

          {/* Card 2: DUE TODAY */}
          <div className="bg-white rounded-2xl p-5 border border-[#b9c4bb] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#78716c]">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                DUE TODAY
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#ffebdc] flex items-center justify-center text-[#d97706]">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2.5">
              <span className="text-3xl font-bold font-sans text-[#1f1a17]">
                {stats.dueToday}
              </span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ffebdc] text-[#d97706] border border-[#fed7aa]">
                Pending return
              </span>
            </div>
          </div>

          {/* Card 3: OVERDUE */}
          <div className="bg-white rounded-2xl p-5 border border-[#b9c4bb] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#78716c]">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                OVERDUE
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#fef2f2] flex items-center justify-center text-[#b91c1c]">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2.5">
              <span className="text-3xl font-bold font-sans text-[#b91c1c]">
                {stats.overdue}
              </span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]">
                Urgent follow-up
              </span>
            </div>
          </div>

          {/* Card 4: RETURNED ITEMS */}
          <div className="bg-white rounded-2xl p-5 border border-[#b9c4bb] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#78716c]">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider">
                RETURNED ITEMS
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#eafff1] flex items-center justify-center text-[#006e2e]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2.5">
              <span className="text-3xl font-bold font-sans text-[#1f1a17]">
                {stats.returnedToday}
              </span>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eafff1] text-[#006e2e] border border-[#a7f3d0]">
                Returned today
              </span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-xl p-3 border border-[#b9c4bb] shadow-sm flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#78716c] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by borrower name, product code or, product name"
              className="w-full pl-9 pr-3 py-2 bg-[#efe5df]/60 border border-[#b9c4bb] rounded-lg text-sm text-[#1f1a17] placeholder:text-[#78716c] focus:outline-none focus:border-[#006e2e]"
            />
          </div>

          {/* Department Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-56">
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-[#efe5df]/60 border border-[#b9c4bb] rounded-lg text-xs font-mono text-[#1f1a17] focus:outline-none focus:border-[#006e2e]"
              >
                <option value="All Departments">All Departments</option>
                <option value="CECT">CECT (Engineering)</option>
                <option value="CAS">CAS (Arts &amp; Sciences)</option>
                <option value="CBA">CBA (Business School)</option>
                <option value="CON">CON (Nursing Dept)</option>
              </select>
            </div>

            {/* Status Dropdown */}
            <div className="relative w-full md:w-44">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-[#efe5df]/60 border border-[#b9c4bb] rounded-lg text-xs font-mono text-[#1f1a17] focus:outline-none focus:border-[#006e2e]"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Due Today">Due Today</option>
                <option value="Overdue">Overdue</option>
                <option value="Returned">Returned</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => {
                setIsLoading(true);
                setRefreshIndex((p) => p + 1);
              }}
              title="Refresh Borrows"
              className="p-2 rounded-lg border border-[#b9c4bb] bg-[#efe5df]/60 hover:bg-[#efe5df] text-[#57534e] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#006e2e]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Borrows Table Card */}
        <div className="bg-white rounded-2xl border border-[#b9c4bb] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e8dfda] text-[10px] font-mono uppercase tracking-wider text-[#78716c] bg-[#fbf7f4]">
                  <th className="py-3.5 px-5">BORROWER &amp; DEPT</th>
                  <th className="py-3.5 px-4">BORROWED ITEMS</th>
                  <th className="py-3.5 px-4">DUE DATE</th>
                  <th className="py-3.5 px-4">STATUS</th>
                  <th className="py-3.5 px-5 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5ede6] text-xs">
                {borrows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-[#78716c] font-mono">
                      {isLoading ? "Loading active borrowings..." : "No matching borrow records found."}
                    </td>
                  </tr>
                ) : (
                  borrows.map((b) => {
                    const isReturned = Boolean(b.returned_at);
                    const isThisReturning = returningId === b.id;

                    const borrowerInitials = b.borrower?.full_name
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
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-[#006e2e] text-white flex items-center justify-center font-mono text-xs font-bold shrink-0">
                              {borrowerInitials}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[#1f1a17]">
                                  {b.borrower?.full_name || "Unknown Borrower"}
                                </span>
                                {b.borrower?.type && (
                                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-[#f5ede6] text-[#57534e] font-semibold">
                                    {b.borrower.type}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#78716c] font-mono mt-0.5">
                                {b.borrower?.department_code} ({b.borrower?.department_name || "Campus"}) &bull; ID: #{b.borrower?.borrower_code}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Borrowed Items (View Items Action) */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => setViewItemsBorrowId(b.id)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#b9c4bb] bg-white hover:bg-[#efe5df]/60 font-mono text-xs font-semibold text-[#1f1a17] transition-colors cursor-pointer shadow-2xs"
                          >
                            <ClipboardList className="w-3.5 h-3.5 text-[#57534e]" />
                            <span>View Items</span>
                          </button>
                        </td>

                        {/* Due Date */}
                        <td className="py-3.5 px-4 font-mono text-xs text-[#1f1a17]">
                          {formatDueDate(b.due_at)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {renderStatusBadge(b.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-5 text-right">
                          {isReturned ? (
                            <button
                              disabled
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f5ede6] text-[#a8a29e] font-mono text-xs font-semibold cursor-not-allowed border border-[#e8dfda]"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Returned</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isThisReturning}
                              onClick={() => handleMarkReturned(b.id)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#006e2e] hover:bg-[#005a24] text-white font-mono text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              {isThisReturning ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              <span>{isThisReturning ? "Updating..." : "Returned"}</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <div className="p-4 border-t border-[#e8dfda] bg-[#fbf7f4] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#78716c]">
            <div>
              Showing{" "}
              <span className="font-bold text-[#1f1a17]">
                {totalItems === 0 ? 0 : (page - 1) * limit + 1}-
                {Math.min(page * limit, totalItems)}
              </span>{" "}
              of <span className="font-bold text-[#1f1a17]">{totalItems}</span> active borrowings
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-2.5 py-1.5 rounded-lg border border-[#b9c4bb] bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                const isActive = p === page;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded-lg font-mono text-xs font-bold transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[#006e2e] text-white"
                        : "bg-white border border-[#b9c4bb] text-[#1f1a17] hover:bg-[#f5ede6]"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="px-2.5 py-1.5 rounded-lg border border-[#b9c4bb] bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
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
