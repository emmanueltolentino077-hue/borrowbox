import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  className = "",
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-card bg-card p-6 ${className}`}
      {...props}
    />
  );
}

export function StatCard({
  label,
  value,
  children,
}: {
  label: string;
  value: ReactNode;
  children?: ReactNode;
}) {
  return (
    <Card>
      <p className="font-mono text-label font-normal uppercase tracking-[0.04em] text-neutral-600">
        {label}
      </p>
      <p className="mt-2 text-display font-semibold text-ink">{value}</p>
      {children}
    </Card>
  );
}
