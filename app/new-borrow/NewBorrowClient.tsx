"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  CornerDownLeft,
  PackageCheck,
  Bell,
  Search,
  UserCheck,
  User,
  Box,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Calendar,
  Zap,
  RotateCcw,
  LogOut,
  Laptop,
  Monitor,
  Headphones,
  Mouse,
  Keyboard,
  Projector,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Check,
} from "lucide-react";
import ConfirmBorrowModal, { type Borrower, type TrayItem } from "./ConfirmBorrowModal";
import SuccessBorrowModal from "./SuccessBorrowModal";

interface AdminUser {
  id: string;
  employee_id: string;
  company_email: string;
  full_name: string;
  username: string;
}

interface EquipmentCatalogItem {
  id: string;
  product_code: string;
  name: string;
  category: string;
  total_units: number;
  available_units: number;
  spec?: string | null;
  image_url?: string | null;
  stock_status?: string;
}

interface NewBorrowClientProps {
  admin: AdminUser;
}

export default function NewBorrowClient({ admin }: NewBorrowClientProps) {
  const router = useRouter();

  // 1. Borrower State
  const [borrowerSearch, setBorrowerSearch] = useState("");
  const [borrowerResults, setBorrowerResults] = useState<Borrower[]>([]);
  const [isSearchingBorrower, setIsSearchingBorrower] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);

  // 2. Equipment Catalog State
  const [catalogItems, setCatalogItems] = useState<EquipmentCatalogItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogCategory, setCatalogCategory] = useState("All Categories");
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [catalogTotalItems, setCatalogTotalItems] = useState(0);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [refreshCatalogCount, setRefreshCatalogCount] = useState(0);

  // 3. Tray State (In-Memory per Q17)
  const [tray, setTray] = useState<TrayItem[]>([]);

  // 4. Duration State (Q22)
  const [durationOption, setDurationOption] = useState<"3days" | "1week" | "custom">("3days");
  
  // Calculate tomorrow's date string for custom date min attribute
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }, []);
  const [customDueDate, setCustomDueDate] = useState<string>(tomorrowStr);

  // 5. Modals & Submission State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdBorrowInfo, setCreatedBorrowInfo] = useState<{
    loan_code: string;
    due_at: string;
  } | null>(null);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // -------------------------------------------------------------
  // Borrower Live Search
  // -------------------------------------------------------------
  useEffect(() => {
    const term = borrowerSearch.trim();
    if (!term) return;

    let ignore = false;
    const controller = new AbortController();

    const timeout = setTimeout(async () => {
      setIsSearchingBorrower(true);
      try {
        const res = await fetch(
          `/api/borrowers/search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!ignore && res.ok) {
          setBorrowerResults(data.borrowers || []);
        }
      } catch (err: unknown) {
        if (!ignore && (err as Error)?.name !== "AbortError") {
          console.error("Borrower search error:", err);
        }
      } finally {
        if (!ignore) {
          setIsSearchingBorrower(false);
        }
      }
    }, 250);

    return () => {
      ignore = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [borrowerSearch]);

  // -------------------------------------------------------------
  // Catalog Fetching (6 items per page)
  // -------------------------------------------------------------
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    async function fetchCatalog() {
      try {
        const params = new URLSearchParams({
          search: catalogSearch,
          category: catalogCategory === "All Categories" || catalogCategory === "All Equipment" ? "" : catalogCategory,
          page: String(catalogPage),
          limit: "6",
        });

        const res = await fetch(`/api/equipment?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (!ignore && res.ok) {
          setCatalogItems(data.items || []);
          setCatalogTotalItems(data.pagination?.totalItems || 0);
          setCatalogTotalPages(data.pagination?.totalPages || 1);
        }
      } catch (err: unknown) {
        if (!ignore && (err as Error)?.name !== "AbortError") {
          console.error("Fetch catalog error:", err);
        }
      } finally {
        if (!ignore) {
          setCatalogLoading(false);
        }
      }
    }

    fetchCatalog();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [catalogSearch, catalogCategory, catalogPage, refreshCatalogCount]);

  // -------------------------------------------------------------
  // Tray Manipulation
  // -------------------------------------------------------------
  const addToTray = (item: EquipmentCatalogItem) => {
    if (item.available_units <= 0) return;

    setTray((prev) => {
      const existing = prev.find((t) => t.equipment.id === item.id);
      if (existing) {
        if (existing.quantity >= item.available_units) return prev;
        return prev.map((t) =>
          t.equipment.id === item.id ? { ...t, quantity: t.quantity + 1 } : t
        );
      }
      return [...prev, { equipment: item, quantity: 1 }];
    });
  };

  const updateTrayQuantity = (equipmentId: string, delta: number) => {
    setTray((prev) =>
      prev
        .map((t) => {
          if (t.equipment.id !== equipmentId) return t;
          const nextQty = t.quantity + delta;
          if (nextQty <= 0) return null;
          if (nextQty > t.equipment.available_units) return t;
          return { ...t, quantity: nextQty };
        })
        .filter(Boolean) as TrayItem[]
    );
  };

  const removeFromTray = (equipmentId: string) => {
    setTray((prev) => prev.filter((t) => t.equipment.id !== equipmentId));
  };

  const clearTray = () => {
    setTray([]);
  };

  // Helper: check quantity currently staged in tray for an item
  const getStagedQuantity = (equipmentId: string): number => {
    const found = tray.find((t) => t.equipment.id === equipmentId);
    return found ? found.quantity : 0;
  };

  // -------------------------------------------------------------
  // Form Validation (Q14)
  // -------------------------------------------------------------
  const isIssueEnabled = useMemo(() => {
    if (!selectedBorrower) return false;
    if (tray.length === 0) return false;
    const allValidQuantities = tray.every(
      (t) => t.quantity > 0 && t.quantity <= t.equipment.available_units
    );
    if (!allValidQuantities) return false;
    if (durationOption === "custom") {
      if (!customDueDate || customDueDate < tomorrowStr) return false;
    }
    return true;
  }, [selectedBorrower, tray, durationOption, customDueDate, tomorrowStr]);

  // Formatted labels for Confirm Modal
  const durationLabel = useMemo(() => {
    if (durationOption === "3days") return "3 Days (Standard)";
    if (durationOption === "1week") return "1 Week";
    return `Custom Date (${customDueDate})`;
  }, [durationOption, customDueDate]);

  const dueAtFormatted = useMemo(() => {
    const d = new Date();
    if (durationOption === "3days") {
      d.setDate(d.getDate() + 3);
    } else if (durationOption === "1week") {
      d.setDate(d.getDate() + 7);
    } else {
      const [y, m, day] = customDueDate.split("-").map((v) => parseInt(v, 10));
      d.setFullYear(y, m - 1, day);
    }
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${monthNames[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, 5:00 PM`;
  }, [durationOption, customDueDate]);

  // -------------------------------------------------------------
  // Issue Borrow Submission
  // -------------------------------------------------------------
  const handleConfirmIssue = async () => {
    if (!selectedBorrower || tray.length === 0) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/borrows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          borrower_id: selectedBorrower.id,
          items: tray.map((t) => ({
            equipment_id: t.equipment.id,
            quantity: t.quantity,
          })),
          due_option: durationOption,
          custom_due_date: durationOption === "custom" ? customDueDate : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Failed to issue borrow.");
        return;
      }

      // Success! Close confirm modal and open success modal (Q13)
      setIsConfirmOpen(false);
      setCreatedBorrowInfo({
        loan_code: data.loan_code,
        due_at: dueAtFormatted,
      });
      setIsSuccessOpen(true);
    } catch {
      setErrorMessage("Network error while issuing borrow.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset after success (Q16)
  const handleDoneAndNewBorrow = () => {
    setIsSuccessOpen(false);
    setSelectedBorrower(null);
    setBorrowerSearch("");
    setTray([]);
    setDurationOption("3days");
    setCustomDueDate(tomorrowStr);
    setErrorMessage(null);
    setRefreshCatalogCount((prev) => prev + 1);
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

  // Category Icon Mapper
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
                className="flex items-center gap-3 px-3 py-2.5 rounded bg-[#006e2e] text-white font-medium text-sm transition-colors shadow-xs"
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
            Equipment Dispatch
          </h2>
          <p className="text-xs text-[#57534e] mt-1 max-w-2xl leading-relaxed">
            Pick hardware items from university inventory, and record equipment borrowings immediately.
          </p>
        </div>

        {/* ======================================================== */}
        {/* SECTION 1: BORROWER IDENTIFICATION                       */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-6 border border-[#b9c4bb] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#eafff1] border border-[#a7f3d0] flex items-center justify-center text-[#006e2e] shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-[#1f1a17]">
                1. Borrower Identification
              </h3>
              <p className="text-xs text-[#78716c]">
                Lookup faculty, staff, or student borrower credentials
              </p>
            </div>
          </div>

          {/* Search Box / Live Autocomplete */}
          {!selectedBorrower && (
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-[#78716c] absolute left-3.5 top-3" />
              <input
                type="text"
                value={borrowerSearch}
                onChange={(e) => {
                  setBorrowerSearch(e.target.value);
                  if (!e.target.value.trim()) {
                    setBorrowerResults([]);
                    setIsSearchingBorrower(false);
                  }
                }}
                placeholder="Search borrower by name, ID number, or university email..."
                className="w-full pl-9 pr-3 py-2 bg-[#efe5df]/60 border border-[#b9c4bb] rounded-lg text-sm text-[#1f1a17] placeholder:text-[#78716c] focus:outline-none focus:border-[#006e2e] focus:ring-1 focus:ring-[#006e2e]"
              />

              {/* Autocomplete Dropdown */}
              {borrowerSearch.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-11 z-30 bg-white rounded-xl shadow-xl border border-[#b9c4bb] overflow-hidden max-h-60 overflow-y-auto">
                  {isSearchingBorrower ? (
                    <div className="p-4 text-center text-xs font-mono text-[#78716c]">
                      Searching directory...
                    </div>
                  ) : borrowerResults.length === 0 ? (
                    <div className="p-4 text-center text-xs font-mono text-[#78716c]">
                      No borrower matched &ldquo;{borrowerSearch}&rdquo;
                    </div>
                  ) : (
                    <div className="divide-y divide-[#f5ede6]">
                      {borrowerResults.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => {
                            setSelectedBorrower(b);
                            setBorrowerSearch("");
                            setBorrowerResults([]);
                          }}
                          className="p-3 hover:bg-[#fbf7f4] cursor-pointer flex items-center justify-between transition-colors"
                        >
                          <div>
                            <p className="font-bold text-xs text-[#1f1a17]">
                              {b.full_name}
                            </p>
                            <p className="text-[10px] text-[#78716c] font-mono">
                              ID: #{b.borrower_code} &bull; {b.email}
                            </p>
                          </div>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#f5ede6] text-[#57534e]">
                            {b.type} &bull; {b.department_code}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Borrower Display State */}
          {selectedBorrower ? (
            <div className="p-4 rounded-xl bg-[#fbf7f4] border border-[#a7f3d0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#006e2e] text-white flex items-center justify-center font-mono text-sm font-bold shrink-0">
                  {selectedBorrower.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <h4 className="font-sans font-bold text-sm text-[#1f1a17]">
                    {selectedBorrower.full_name}
                  </h4>
                  <p className="font-mono text-xs text-[#57534e]">
                    ID: #{selectedBorrower.borrower_code} &bull; {selectedBorrower.email}
                  </p>
                  <p className="text-[10px] text-[#78716c] uppercase font-mono mt-0.5">
                    {selectedBorrower.type} &bull; {selectedBorrower.department_name} ({selectedBorrower.department_code})
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBorrower(null)}
                className="px-3 py-1.5 rounded-lg border border-[#78716c] hover:bg-white text-[#1f1a17] font-mono text-xs font-semibold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                <span>Change</span>
              </button>
            </div>
          ) : (
            <div className="border border-dashed border-[#b9c4bb] rounded-xl p-8 text-center flex flex-col items-center justify-center bg-[#fbf7f4]/40">
              <div className="w-10 h-10 rounded-full bg-[#efe5df] flex items-center justify-center text-[#78716c] mb-2">
                <User className="w-5 h-5" />
              </div>
              <h4 className="font-sans font-bold text-sm text-[#1f1a17]">
                No borrower selected
              </h4>
              <p className="text-xs text-[#78716c] mt-1 max-w-md">
                Search by name, ID number, or university email above to verify credentials and assign equipment.
              </p>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* SECTION 2: AVAILABLE EQUIPMENT CATALOG                   */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-6 border border-[#b9c4bb] shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-[#eafff1] border border-[#a7f3d0] flex items-center justify-center text-[#006e2e] shrink-0">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-[#1f1a17]">
                2. Available Equipment Catalog
              </h3>
              <p className="text-xs text-[#78716c]">
                Pick hardware devices or scan barcode to add to staging tray
              </p>
            </div>
          </div>

          {/* Catalog Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#78716c] absolute left-3.5 top-3" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => {
                  setCatalogSearch(e.target.value);
                  setCatalogPage(1);
                }}
                placeholder="Search equipment by name or product code"
                className="w-full pl-9 pr-3 py-2 bg-[#efe5df]/60 border border-[#b9c4bb] rounded-lg text-sm text-[#1f1a17] placeholder:text-[#78716c] focus:outline-none focus:border-[#006e2e]"
              />
            </div>

            <div className="w-full sm:w-60">
              <select
                value={catalogCategory}
                onChange={(e) => {
                  setCatalogCategory(e.target.value);
                  setCatalogPage(1);
                }}
                className="w-full px-3 py-2 bg-[#efe5df]/60 border border-[#b9c4bb] rounded-lg text-xs font-mono text-[#1f1a17] focus:outline-none focus:border-[#006e2e]"
              >
                <option value="All Categories">Filter by: All Equipment</option>
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
          </div>

          {/* 6-Card Catalog Grid */}
          {catalogLoading ? (
            <div className="py-16 text-center text-xs font-mono text-[#78716c]">
              Loading catalog hardware...
            </div>
          ) : catalogItems.length === 0 ? (
            <div className="py-16 text-center text-xs font-mono text-[#78716c]">
              No matching equipment available.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {catalogItems.map((item) => {
                const stagedQty = getStagedQuantity(item.id);
                const isStaged = stagedQty > 0;
                const isDepleted = item.available_units <= 0;
                const isLowStock =
                  item.available_units > 0 &&
                  item.available_units <= Math.floor((item.total_units + 4) / 5);

                // Status Pill formatting
                let statusBadge = (
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#f5ede6] text-[#78716c] border border-[#e8dfda]">
                    Ready
                  </span>
                );

                if (isStaged) {
                  statusBadge = (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#eafff1] text-[#006e2e] border border-[#a7f3d0] font-bold flex items-center gap-1">
                      <Check className="w-3 h-3 stroke-[3]" />
                      Staged ({stagedQty})
                    </span>
                  );
                } else if (isDepleted) {
                  statusBadge = (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#f5ede6] text-[#78716c] border border-[#e8dfda]">
                      Depleted
                    </span>
                  );
                } else if (isLowStock) {
                  statusBadge = (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-[#ffebdc] text-[#d97706] border border-[#fed7aa] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]" />
                      Low Stock
                    </span>
                  );
                }

                // Dot color
                const dotColor = isDepleted
                  ? "bg-neutral-400"
                  : isLowStock
                  ? "bg-[#d97706]"
                  : "bg-[#006e2e]";

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-4 flex flex-col justify-between transition-all ${
                      isStaged
                        ? "border-[#006e2e] bg-white ring-1 ring-[#006e2e]/20 shadow-xs"
                        : "border-[#e8dfda] bg-white hover:border-[#b9c4bb] shadow-2xs"
                    }`}
                  >
                    <div>
                      {/* Card Top: Icon & Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg bg-[#f5ede6] border border-[#e8dfda] flex items-center justify-center overflow-hidden relative shrink-0">
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
                        {statusBadge}
                      </div>

                      {/* Code & Specs */}
                      <p className="font-mono text-[11px] text-[#78716c] truncate">
                        {item.product_code} &bull; {item.category}
                      </p>
                      <h4 className="font-sans font-bold text-sm text-[#1f1a17] mt-0.5 truncate">
                        {item.name}
                      </h4>
                      <p className="text-xs text-[#57534e] line-clamp-1 mt-1 font-mono text-[11px]">
                        {item.spec || "Standard university IT inventory asset"}
                      </p>
                    </div>

                    {/* Card Footer: Stock & Add Action */}
                    <div className="mt-4 pt-3 border-t border-[#f5ede6] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                        <span className="font-semibold text-[#1f1a17]">
                          {item.available_units} / {item.total_units} Avail
                        </span>
                      </div>

                      {isDepleted ? (
                        <button
                          disabled
                          className="px-2.5 py-1 rounded bg-[#f5ede6] text-[#a8a29e] text-[11px] font-mono font-semibold cursor-not-allowed flex items-center gap-1"
                        >
                          <span>⊘ Out of Stock</span>
                        </button>
                      ) : isStaged ? (
                        <button
                          type="button"
                          onClick={() => addToTray(item)}
                          disabled={stagedQty >= item.available_units}
                          className="px-2.5 py-1 rounded bg-[#eafff1] border border-[#a7f3d0] text-[#006e2e] text-[11px] font-mono font-bold hover:bg-[#d1fae5] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          + +1 More
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToTray(item)}
                          className="px-2.5 py-1 rounded bg-[#efe5df]/80 border border-[#b9c4bb] text-[#1f1a17] text-[11px] font-mono font-semibold hover:bg-[#efe5df] transition-colors cursor-pointer"
                        >
                          + + Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Catalog Pagination Footer */}
          <div className="pt-3 border-t border-[#e8dfda] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-[#78716c]">
            <div>
              Showing{" "}
              <span className="font-bold text-[#1f1a17]">
                {catalogTotalItems === 0 ? 0 : (catalogPage - 1) * 6 + 1}-
                {Math.min(catalogPage * 6, catalogTotalItems)}
              </span>{" "}
              of <span className="font-bold text-[#1f1a17]">{catalogTotalItems}</span> items
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={catalogPage <= 1}
                onClick={() => setCatalogPage(1)}
                className="p-1.5 rounded border border-[#b9c4bb] bg-white hover:bg-[#f5ede6] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={catalogPage <= 1}
                onClick={() => setCatalogPage(catalogPage - 1)}
                className="p-1.5 rounded border border-[#b9c4bb] bg-white hover:bg-[#f5ede6] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Previous"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: catalogTotalPages }).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setCatalogPage(p)}
                    className={`w-7 h-7 rounded font-mono text-xs font-bold transition-colors cursor-pointer ${
                      p === catalogPage
                        ? "bg-[#006e2e] text-white"
                        : "bg-white border border-[#b9c4bb] text-[#1f1a17] hover:bg-[#f5ede6]"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                disabled={catalogPage >= catalogTotalPages}
                onClick={() => setCatalogPage(catalogPage + 1)}
                className="p-1.5 rounded border border-[#b9c4bb] bg-white hover:bg-[#f5ede6] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Next"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={catalogPage >= catalogTotalPages}
                onClick={() => setCatalogPage(catalogTotalPages)}
                className="p-1.5 rounded border border-[#b9c4bb] bg-white hover:bg-[#f5ede6] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SECTION 3: CHECKOUT TRAY & ISSUE DISPATCH                */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl p-6 border border-[#b9c4bb] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#eafff1] border border-[#a7f3d0] flex items-center justify-center text-[#006e2e] shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-sans font-bold text-base text-[#1f1a17]">
                  3. Register Checkout Tray &amp; Issue Dispatch
                </h3>
                <p className="text-xs text-[#78716c]">
                  Review staged hardware, adjust loan period, and record issue
                </p>
              </div>
            </div>

            {tray.length > 0 && (
              <button
                type="button"
                onClick={clearTray}
                className="text-xs font-mono font-semibold text-[#78716c] hover:text-red-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Tray</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Staged Hardware Tray List */}
            <div className="lg:col-span-2 space-y-3">
              <p className="text-[11px] font-mono uppercase tracking-wider text-[#78716c] font-semibold">
                STAGED HARDWARE IN TRAY ({tray.reduce((acc, t) => acc + t.quantity, 0)} total units)
              </p>

              {tray.length === 0 ? (
                <div className="border border-dashed border-[#b9c4bb] rounded-xl p-8 text-center flex flex-col items-center justify-center bg-[#fbf7f4]/40">
                  <div className="w-10 h-10 rounded-full bg-[#efe5df] flex items-center justify-center text-[#78716c] mb-2">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <h4 className="font-sans font-bold text-sm text-[#1f1a17]">
                    Tray is empty
                  </h4>
                  <p className="text-xs text-[#78716c] mt-1">
                    Pick equipment from the catalog above to add to staging tray.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tray.map(({ equipment, quantity }) => (
                    <div
                      key={equipment.id}
                      className="p-3.5 rounded-xl border border-[#e8dfda] bg-[#fbf7f4] flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-lg bg-white border border-[#e8dfda] flex items-center justify-center shrink-0">
                          {getCategoryIcon(equipment.category)}
                        </div>
                        <div className="overflow-hidden">
                          <h5 className="font-sans font-bold text-xs text-[#1f1a17] truncate">
                            {equipment.name}
                          </h5>
                          <p className="font-mono text-[10px] text-[#78716c]">
                            {equipment.product_code} &bull;{" "}
                            <span className="text-[#006e2e]">
                              Max {equipment.available_units} avail
                            </span>
                          </p>
                        </div>
                      </div>

                      {/* Stepper and Delete Controls */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center border border-[#b9c4bb] rounded-lg bg-white overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateTrayQuantity(equipment.id, -1)}
                            className="p-1.5 hover:bg-neutral-100 text-[#78716c] cursor-pointer"
                            title="Decrease Quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center font-mono text-xs font-bold text-[#1f1a17]">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateTrayQuantity(equipment.id, 1)}
                            disabled={quantity >= equipment.available_units}
                            className="p-1.5 hover:bg-neutral-100 text-[#78716c] disabled:opacity-40 cursor-pointer"
                            title="Increase Quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromTray(equipment.id)}
                          className="p-1.5 text-neutral-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                          title="Remove Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right 1 Col: Duration & Issue Button */}
            <div className="p-5 rounded-2xl border border-[#e8dfda] bg-[#fbf7f4] flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-wider text-[#78716c] font-semibold mb-3">
                  EXPECTED RETURN DURATION
                </p>

                {/* Duration Options */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setDurationOption("3days")}
                    className={`py-2 px-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      durationOption === "3days"
                        ? "bg-[#006e2e] text-white shadow-sm"
                        : "bg-white border border-[#b9c4bb] text-[#1f1a17] hover:bg-[#efe5df]"
                    }`}
                  >
                    3 Days (Std)
                  </button>

                  <button
                    type="button"
                    onClick={() => setDurationOption("1week")}
                    className={`py-2 px-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      durationOption === "1week"
                        ? "bg-[#006e2e] text-white shadow-sm"
                        : "bg-white border border-[#b9c4bb] text-[#1f1a17] hover:bg-[#efe5df]"
                    }`}
                  >
                    1 Week
                  </button>

                  <button
                    type="button"
                    onClick={() => setDurationOption("custom")}
                    className={`py-2 px-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      durationOption === "custom"
                        ? "bg-[#006e2e] text-white shadow-sm"
                        : "bg-white border border-[#b9c4bb] text-[#1f1a17] hover:bg-[#efe5df]"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Custom</span>
                  </button>
                </div>

                {/* Custom Date Input if selected */}
                {durationOption === "custom" && (
                  <div className="mb-4 p-3 rounded-lg bg-white border border-[#b9c4bb]">
                    <label className="block text-[10px] font-mono uppercase text-[#78716c] mb-1 font-semibold">
                      Select Return Date (Min Tomorrow)
                    </label>
                    <input
                      type="date"
                      min={tomorrowStr}
                      value={customDueDate}
                      onChange={(e) => setCustomDueDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-[#b9c4bb] rounded font-mono text-xs text-[#1f1a17] focus:outline-none focus:border-[#006e2e]"
                    />
                    <p className="text-[10px] text-[#78716c] mt-1 font-mono">
                      Due at 5:00 PM Manila Time
                    </p>
                  </div>
                )}

                {/* Due Deadline Preview */}
                <div className="p-3 rounded-xl bg-white border border-[#e8dfda] mb-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#006e2e]">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span className="font-bold">Deadline: {dueAtFormatted}</span>
                  </div>
                </div>
              </div>

              {/* Big Issue Button */}
              <div>
                <button
                  type="button"
                  disabled={!isIssueEnabled}
                  onClick={() => {
                    setErrorMessage(null);
                    setIsConfirmOpen(true);
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-[#006e2e] hover:bg-[#005a24] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Issue Borrow</span>
                </button>

                {!isIssueEnabled && (
                  <p className="text-[10px] text-center font-mono text-[#78716c] mt-2">
                    {!selectedBorrower
                      ? "Select a borrower to enable dispatch."
                      : tray.length === 0
                      ? "Add at least 1 item to the tray."
                      : "Check quantities and due date."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Confirm Modal */}
      <ConfirmBorrowModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmIssue}
        borrower={selectedBorrower}
        tray={tray}
        durationLabel={durationLabel}
        dueAtFormatted={dueAtFormatted}
        isSubmitting={isSubmitting}
        errorMessage={errorMessage}
      />

      {/* Success Modal */}
      <SuccessBorrowModal
        isOpen={isSuccessOpen}
        onDoneAndNewBorrow={handleDoneAndNewBorrow}
        loanCode={createdBorrowInfo?.loan_code}
        dueAtFormatted={createdBorrowInfo?.due_at}
      />
    </div>
  );
}
