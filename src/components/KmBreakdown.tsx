import { formatKm, formatMoney, type BillingBreakdown } from "@/lib/billing";
import { FREE_KM_PER_DAY, OVERAGE_RATE_PER_KM } from "@/lib/settings";

function Row({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-2 ${
        emphasis ? "border-t border-slate-200 pt-3 font-semibold" : ""
      }`}
    >
      <div>
        <span className={emphasis ? "text-slate-900" : "text-slate-600"}>
          {label}
        </span>
        {hint ? (
          <span className="ml-1 text-xs text-slate-400">{hint}</span>
        ) : null}
      </div>
      <span
        className={
          emphasis ? "text-lg text-slate-900" : "tabular-nums text-slate-900"
        }
      >
        {value}
      </span>
    </div>
  );
}

/**
 * The km-overage breakdown shown on a booking. Renders "pending return" until
 * the ending odometer reading exists.
 */
export function KmBreakdown({
  billing,
  className = "",
}: {
  billing: BillingBreakdown;
  className?: string;
}) {
  return (
    <div className={`card p-4 sm:p-5 ${className}`}>
      <div className="mb-1 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Charges
        </h2>
        <span className="text-xs text-slate-500">
          {FREE_KM_PER_DAY} free km/day · {formatMoney(OVERAGE_RATE_PER_KM)}/km
          over
        </span>
      </div>

      <div className="divide-y divide-slate-100 text-sm">
        <Row
          label="Rental days"
          value={`${billing.rentalDays} ${billing.rentalDays === 1 ? "day" : "days"}`}
          hint="partial days round up"
        />
        <Row label="Free km allowed" value={formatKm(billing.freeKm)} />

        {billing.settled ? (
          <>
            <Row label="Km driven" value={formatKm(billing.kmDriven ?? 0)} />
            <Row label="Overage km" value={formatKm(billing.overageKm ?? 0)} />
            <Row
              label="Overage charge"
              value={formatMoney(billing.overageCharge ?? 0)}
            />
          </>
        ) : (
          <div className="py-3">
            <span className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-inset ring-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Pending return — enter the ending km to calculate overage.
            </span>
          </div>
        )}

        <Row label="Base rental price" value={formatMoney(billing.baseRate)} />
        <Row
          label={billing.settled ? "Total charge" : "Total so far"}
          value={formatMoney(billing.total)}
          emphasis
        />
      </div>
    </div>
  );
}
