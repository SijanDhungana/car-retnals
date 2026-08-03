import type { BookingStatus } from "@/db/schema";

/** One place defining what each status looks like, reused by every view. */
export const STATUS_STYLES: Record<
  BookingStatus,
  { label: string; badge: string; dot: string; calendar: string }
> = {
  RESERVED: {
    label: "Reserved",
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
    calendar: "bg-amber-100 text-amber-900 border-amber-300",
  },
  ACTIVE: {
    label: "Active — out now",
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    calendar: "bg-emerald-100 text-emerald-900 border-emerald-300",
  },
  RETURNED: {
    label: "Returned",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
    calendar: "bg-slate-100 text-slate-700 border-slate-300",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-red-100 text-red-800 ring-red-200",
    dot: "bg-red-500",
    calendar: "bg-red-50 text-red-700 border-red-200 line-through",
  },
};

export function StatusBadge({
  status,
  short = false,
}: {
  status: BookingStatus;
  short?: boolean;
}) {
  const style = STATUS_STYLES[status];
  const label = short && status === "ACTIVE" ? "Active" : style.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {label}
    </span>
  );
}
