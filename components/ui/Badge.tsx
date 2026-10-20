export type BadgeStatus =
  | "Active"
  | "Due Today"
  | "Overdue"
  | "Returned"
  | "Ready"
  | "Available"
  | "Low Stock"
  | "Depleted"
  | "Out of Stock"
  | "BORROWED";

const styles: Record<BadgeStatus, string> = {
  Active: "bg-[#eafff1] text-[#006e2e] border border-[#a7f3d0]",
  Available: "bg-[#eafff1] text-[#006e2e] border border-[#a7f3d0]",
  Ready: "bg-[#eafff1] text-[#006e2e] border border-[#a7f3d0]",
  BORROWED: "bg-[#eafff1] text-[#006e2e] border border-[#a7f3d0]",
  "Due Today": "bg-[#ffebdc] text-[#b26500] border border-[#fed7aa]",
  "Low Stock": "bg-[#ffebdc] text-[#b26500] border border-[#fed7aa]",
  Overdue: "bg-[#fee2e2] text-[#b91c1c] border border-red-300",
  "Out of Stock": "bg-[#fee2e2] text-[#b91c1c] border border-red-300",
  Depleted: "bg-[#fee2e2] text-[#b91c1c] border border-red-300",
  Returned: "bg-[#e8dfda] text-[#57534e] border border-[#d6cfca]",
};

export function Badge({ status }: { status: BadgeStatus }) {
  const label = status.toUpperCase();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider ${styles[status] || styles.Available}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      <span>{label}</span>
    </span>
  );
}
