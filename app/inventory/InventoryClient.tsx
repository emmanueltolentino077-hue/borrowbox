"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  CornerDownLeft,
  PackageCheck,
  Plus,
  Download,
  Bell,
  Box,
  CheckCircle2,
  Users,
  Search,
  RefreshCw,
  MoreVertical,
  LogOut,
  Edit2,
  Trash2,
  Laptop,
  Monitor,
  Headphones,
  Mouse,
  Keyboard,
  Projector,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Badge, type BadgeStatus } from "@/components/ui/Badge";
import AddEditEquipmentModal, { type EquipmentItem } from "./AddEditEquipmentModal";

interface InventoryClientProps {
  admin: {
    id: string;
    employee_id: string;
    company_email: string;
    full_name: string;
    username: string;
  };
  initialOpenAdd?: boolean;
}

interface InventoryStats {
  totalInventoryUnits: number;
  availableStock: number;
  currentlyBorrowed: number;
  availablePercent: number;
  borrowedPercent: number;
}

export default function InventoryClient({ admin, initialOpenAdd = false }: InventoryClientProps) {
  const router = useRouter();

  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalInventoryUnits: 0,
    availableStock: 0,
    currentlyBorrowed: 0,
    availablePercent: 0,
    borrowedPercent: 0,
  });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(7);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(initialOpenAdd);
  const [itemToEdit, setItemToEdit] = useState<EquipmentItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<EquipmentItem | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Active menu dropdown id
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const refreshInventory = useCallback(() => {
    setIsLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function load() {
      try {
        const params = new URLSearchParams({
          search,
          category: categoryFilter,
          status: statusFilter,
          page: String(page),
          limit: String(limit),
        });

        const res = await fetch(`/api/equipment?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (!ignore && res.ok) {
          setItems(data.items || []);
          setStats(
            data.stats || {
              totalInventoryUnits: 0,
              availableStock: 0,
              currentlyBorrowed: 0,
              availablePercent: 0,
              borrowedPercent: 0,
            }
          );
          setTotalItems(data.pagination?.totalItems || 0);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      } catch (err: unknown) {
        if (!ignore && (err as Error)?.name !== "AbortError") {
          console.error("Failed to fetch inventory:", err);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [search, categoryFilter, statusFilter, page, limit, refreshIndex]);

  async function handleExportCSV() {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        search,
        category: categoryFilter,
        status: statusFilter,
      });

      const res = await fetch(`/api/equipment/export?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to export");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `borrowbox_inventory_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Unable to export inventory CSV. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setDeleteErrorMessage(null);

    try {
      const res = await fetch(`/api/equipment/${itemToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        setDeleteErrorMessage(data.message || "Unable to delete equipment.");
        return;
      }

      setItemToDelete(null);
      refreshInventory();
    } catch {
      setDeleteErrorMessage("Network error deleting item.");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSignOut() {
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
  }

  // Fallback category icon
  function getCategoryIcon(cat: string) {
    const c = cat.toLowerCase();
    if (c.includes("laptop")) return <Laptop className="w-5 h-5 text-neutral-600" />;
    if (c.includes("monitor")) return <Monitor className="w-5 h-5 text-neutral-600" />;
    if (c.includes("headset") || c.includes("audio"))
      return <Headphones className="w-5 h-5 text-neutral-600" />;
    if (c.includes("mouse")) return <Mouse className="w-5 h-5 text-neutral-600" />;
    if (c.includes("keyboard")) return <Keyboard className="w-5 h-5 text-neutral-600" />;
    if (c.includes("projector")) return <Projector className="w-5 h-5 text-neutral-600" />;
    return <Box className="w-5 h-5 text-neutral-600" />;
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
                className="flex items-center gap-3 px-3 py-2.5 rounded text-[#3d4640] hover:bg-[#efe5df] font-medium text-sm transition-colors"
              >
                <CornerDownLeft className="w-4 h-4" />
                <span>Returns Desk</span>
              </Link>

              <Link
                href="/inventory"
                className="flex items-center gap-3 px-3 py-2.5 rounded bg-[#006e2e] text-white font-medium text-sm transition-colors"
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

      {/* Main Inventory Area */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-end gap-3 mb-6">
          <button className="w-9 h-9 rounded-full bg-white border border-[#b9c4bb] flex items-center justify-center text-[#57534e] hover:bg-neutral-50 transition-colors shadow-sm">
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-9 h-9 rounded-full bg-[#006e2e] text-white flex items-center justify-center font-mono text-xs font-bold shadow-sm">
            {initials}
          </div>
        </div>

        {/* Title and Action Buttons */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-3xl font-bold font-sans text-[#1f1a17]">
              Equipment Inventory
            </h2>
            <p className="text-xs text-[#57534e] mt-1 max-w-2xl leading-relaxed">
              Track, add, edit, and monitor availability of all university IT hardware assets across faculties and dispensaries.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded border border-[#78716c] bg-white hover:bg-neutral-50 text-[#1f1a17] font-mono text-xs font-semibold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#78716c]" />
              <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
            </button>

            <button
              onClick={() => {
                setItemToEdit(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#006e2e] hover:bg-[#005a24] text-white font-mono text-xs font-semibold uppercase tracking-wider rounded transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Equipment</span>
            </button>
          </div>
        </div>

        {/* 3 Metric Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Card 1: Total Units */}
          <div className="bg-white rounded-2xl p-6 border border-[#b9c4bb] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#78716c]">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                TOTAL INVENTORY UNITS
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#f5ede6] flex items-center justify-center text-[#78716c]">
                <Box className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-4xl font-bold font-sans text-[#1f1a17]">
                {stats.totalInventoryUnits}
              </span>
            </div>
          </div>

          {/* Card 2: Available Stock */}
          <div className="bg-white rounded-2xl p-6 border border-[#b9c4bb] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#78716c]">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                AVAILABLE STOCK
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#eafff1] flex items-center justify-center text-[#006e2e]">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-4xl font-bold font-sans text-[#1f1a17]">
                {stats.availableStock}
              </span>
              <span className="bg-[#eafff1] text-[#006e2e] border border-[#a7f3d0] font-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                {stats.availablePercent}% of total
              </span>
            </div>
          </div>

          {/* Card 3: Currently Borrowed */}
          <div className="bg-white rounded-2xl p-6 border border-[#b9c4bb] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#78716c]">
              <span className="text-xs font-mono font-bold uppercase tracking-wider">
                CURRENTLY BORROWED
              </span>
              <div className="w-8 h-8 rounded-lg bg-[#ffebdc] flex items-center justify-center text-[#d97706]">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-4xl font-bold font-sans text-[#1f1a17]">
                {stats.currentlyBorrowed}
              </span>
              <span className="bg-[#ffebdc] text-[#8f5200] border border-[#fed7aa] font-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                {stats.borrowedPercent}% of total
              </span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-xl p-3 border border-[#b9c4bb] shadow-sm mb-6 flex flex-col md:flex-row items-center gap-3">
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
              placeholder="Search equipment by name or product code"
              className="w-full pl-9 pr-3 py-2 bg-[#efe5df]/60 border border-[#b9c4bb] rounded text-sm text-[#1f1a17] placeholder:text-[#78716c] focus:outline-none focus:border-[#006e2e] focus:ring-1 focus:ring-[#006e2e]"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-48">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 bg-[#efe5df]/60 border border-[#b9c4bb] rounded text-xs font-mono text-[#1f1a17] focus:outline-none focus:border-[#006e2e]"
              >
                <option value="All Categories">All Categories</option>
                <option value="Monitor">Monitor</option>
                <option value="PC">PC</option>
                <option value="Mouse">Mouse</option>
                <option value="Keyboard">Keyboard</option>
                <option value="Headset">Headset</option>
                <option value="Projector">Projector</option>
                <option value="Laptops">Laptops</option>
                <option value="Audio/Visual">Audio/Visual</option>
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
                className="w-full px-3 py-2 bg-[#efe5df]/60 border border-[#b9c4bb] rounded text-xs font-mono text-[#1f1a17] focus:outline-none focus:border-[#006e2e]"
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Available">Available</option>
                <option value="Low Stock">Low Stock</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => refreshInventory()}
              title="Refresh Inventory"
              className="p-2 rounded border border-[#b9c4bb] bg-[#efe5df]/60 hover:bg-[#efe5df] text-[#57534e] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-[#006e2e]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Hardware Assets Ledger Card */}
        <div className="bg-white rounded-2xl border border-[#b9c4bb] shadow-sm overflow-hidden">
          {/* Table Header Row */}
          <div className="p-5 border-b border-[#e8dfda] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-sans font-bold text-base text-[#1f1a17]">
                Hardware Assets Ledger
              </h3>
              <span className="bg-[#eafff1] border border-[#a7f3d0] text-[#006e2e] font-mono text-xs px-2.5 py-0.5 rounded-full font-semibold">
                {totalItems} items shown
              </span>
            </div>
            <div className="text-xs font-mono text-[#78716c] hidden sm:block">
              LOC: BUILD-7 / RM-104
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e8dfda] text-[11px] font-mono uppercase tracking-wider text-[#78716c] bg-[#fbf7f4]">
                  <th className="py-3 px-4">ITEM &amp; PRODUCT CODE</th>
                  <th className="py-3 px-4">TOTAL QTY</th>
                  <th className="py-3 px-4">BORROWED ITEMS</th>
                  <th className="py-3 px-4">STOCK STATUS</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5ede6] text-xs">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#78716c] font-mono">
                      {isLoading ? "Loading inventory records..." : "No matching equipment found in inventory."}
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const borrowed = item.borrowed_units ?? (item.total_units - item.available_units);
                    const pct = item.borrowed_percent ?? (item.total_units > 0 ? Math.round((borrowed / item.total_units) * 100) : 0);

                    // Tone color for progress bar
                    const barColor =
                      pct >= 100
                        ? "bg-[#b91c1c]"
                        : pct >= 70
                        ? "bg-[#d97706]"
                        : "bg-[#006e2e]";

                    return (
                      <tr key={item.id} className="hover:bg-[#fbf7f4]/80 transition-colors">
                        {/* Item and Code */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {/* Photo / Thumbnail */}
                            <div className="w-12 h-12 rounded-lg bg-[#f5ede6] border border-[#e8dfda] flex items-center justify-center overflow-hidden shrink-0 relative">
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
                              <p className="font-semibold text-sm text-[#1f1a17]">
                                {item.name}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="bg-[#f5ede6] border border-[#e8dfda] px-1.5 py-0.5 rounded font-mono text-[10px] text-[#57534e]">
                                  {item.product_code}
                                </span>
                                <span className="text-[10px] text-[#78716c]">
                                  {item.category}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Total Qty */}
                        <td className="py-3.5 px-4 font-sans font-bold text-base text-[#1f1a17]">
                          {item.total_units}
                        </td>

                        {/* Borrowed Items & Progress Bar */}
                        <td className="py-3.5 px-4 min-w-[180px]">
                          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                            <span className="font-semibold text-[#1f1a17]">
                              {borrowed} Borrowed
                            </span>
                            <span className="text-[#78716c]">{pct}%</span>
                          </div>
                          <div className="w-full bg-[#f5ede6] h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor}`}
                              style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                            />
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          <Badge
                            status={
                              (item.stock_status as BadgeStatus) || "Available"
                            }
                          />
                        </td>

                        {/* Actions Menu */}
                        <td className="py-3.5 px-4 text-right relative">
                          <button
                            onClick={() =>
                              setActiveMenuId(activeMenuId === item.id ? null : item.id)
                            }
                            className="p-1.5 rounded hover:bg-neutral-100 text-[#78716c] hover:text-[#1f1a17] transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {activeMenuId === item.id && (
                            <>
                              <div
                                className="fixed inset-0 z-20"
                                onClick={() => setActiveMenuId(null)}
                              />
                              <div className="absolute right-4 top-10 z-30 w-36 bg-white rounded-lg shadow-xl border border-[#b9c4bb] py-1 text-left">
                                <button
                                  onClick={() => {
                                    setItemToEdit(item);
                                    setActiveMenuId(null);
                                    setIsAddModalOpen(true);
                                  }}
                                  className="w-full px-3 py-2 text-xs flex items-center gap-2 text-[#1f1a17] hover:bg-[#f5ede6] cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-[#006e2e]" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setItemToDelete(item);
                                    setActiveMenuId(null);
                                    setDeleteErrorMessage(null);
                                  }}
                                  className="w-full px-3 py-2 text-xs flex items-center gap-2 text-red-600 hover:bg-red-50 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Archive / Delete</span>
                                </button>
                              </div>
                            </>
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
              of <span className="font-bold text-[#1f1a17]">{totalItems}</span>{" "}
              hardware entries
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-2.5 py-1.5 rounded border border-[#b9c4bb] bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
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
                    className={`w-7 h-7 rounded font-mono text-xs font-bold transition-colors cursor-pointer ${
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
                className="px-2.5 py-1.5 rounded border border-[#b9c4bb] bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Add / Edit Modal */}
      <AddEditEquipmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => refreshInventory()}
        itemToEdit={itemToEdit}
      />

      {/* Delete / Archive Confirmation Dialog */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#b9c4bb]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-lg text-[#1f1a17]">
                  Archive or Delete Equipment
                </h3>
                <p className="text-xs text-[#57534e] mt-1">
                  Are you sure you want to remove{" "}
                  <span className="font-bold text-[#1f1a17]">
                    {itemToDelete.name} ({itemToDelete.product_code})
                  </span>
                  ?
                </p>
              </div>
            </div>

            <div className="my-4 p-3 rounded bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed font-mono">
              Policy Rule (Q33): If this equipment has prior borrowing history, it will be safely archived to preserve records. If it has never been borrowed, it will be permanently deleted.
            </div>

            {deleteErrorMessage && (
              <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-xs">
                {deleteErrorMessage}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded border border-[#78716c] text-[#1f1a17] hover:bg-neutral-50 font-mono text-xs font-semibold uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-semibold uppercase rounded transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Processing..." : "Confirm Removal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
