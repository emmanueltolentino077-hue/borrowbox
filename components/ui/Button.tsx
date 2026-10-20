import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "inverted" | "outlined";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary-700 text-white hover:bg-primary-800",
  secondary: "bg-neutral-200 text-neutral-800 hover:bg-neutral-300",
  inverted: "bg-neutral-900 text-white hover:bg-neutral-950",
  outlined:
    "bg-transparent text-neutral-900 border border-neutral-600 hover:bg-neutral-200",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-control px-4 font-mono text-label font-medium transition-colors disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 disabled:border-transparent ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
