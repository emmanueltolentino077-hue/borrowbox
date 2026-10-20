import type { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";

const base =
  "w-full rounded-control border border-line bg-field text-ink placeholder:text-neutral-600";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${base} h-11 px-3 ${className}`} {...props} />;
}

export function SearchField({
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <div className={`relative ${className}`}>
      <Search
        aria-hidden="true"
        size={20}
        strokeWidth={1.5}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
      />
      <input type="search" className={`${base} h-11 pl-10 pr-3`} {...props} />
    </div>
  );
}
