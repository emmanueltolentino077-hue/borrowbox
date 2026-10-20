export type ProgressTone = "healthy" | "info" | "caution" | "danger";

const fills: Record<ProgressTone, string> = {
  healthy: "bg-primary-700",
  info: "bg-secondary-600",
  caution: "bg-tertiary-800",
  danger: "bg-danger",
};

export function ProgressBar({
  value,
  tone = "healthy",
  label,
}: {
  /** Percentage, 0 to 100. */
  value: number;
  tone?: ProgressTone;
  label: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className="h-1.5 w-full rounded-pill bg-neutral-200"
    >
      <div
        className={`h-full rounded-pill ${fills[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
