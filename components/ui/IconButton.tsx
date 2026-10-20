import type { ButtonHTMLAttributes, ReactNode } from "react";

export type IconAction = "edit" | "generate" | "category" | "tag" | "delete";

const colors: Record<IconAction, string> = {
  edit: "bg-tertiary-700 hover:bg-tertiary-800",
  generate: "bg-primary-700 hover:bg-primary-800",
  category: "bg-secondary-600 hover:bg-secondary-700",
  tag: "bg-tertiary-800 hover:bg-tertiary-900",
  delete: "bg-danger hover:bg-red-800",
};

/** `label` is required: it is the accessible name for the icon-only button. */
export function IconButton({
  action,
  label,
  icon,
  showLabel = false,
  className = "",
  type = "button",
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  action: IconAction;
  label: string;
  icon: ReactNode;
  showLabel?: boolean;
}) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-control text-white transition-colors disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 ${
        showLabel ? "px-4 font-mono text-label font-medium" : "w-10"
      } ${colors[action]} ${className}`}
      {...props}
    >
      {icon}
      {showLabel && <span>{label}</span>}
    </button>
  );
}
