import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtMoney(n) {
  const amount = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN");
}

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
      <span className="text-[11px] text-muted-foreground sm:w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value || "—"}</span>
    </div>
  );
}

function MetricTile({ label, value, valueClass }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 truncate ${valueClass || ""}`}>{value}</div>
    </div>
  );
}

/**
 * Section 1 — customer identity (left) + financial metrics (right).
 */
export default function Customer360Metrics({ overview, loading }) {
  const c = overview?.customer;
  const m = overview?.metrics;

  if (loading) {
    return (
      <Card className="shadow-none">
        <CardContent className="p-4 text-sm text-muted-foreground">Loading metrics…</CardContent>
      </Card>
    );
  }

  if (!c) return null;

  const fullAddress = [c.address, c.city, c.state, c.pincode].filter(Boolean).join(", ");

  const financialItems = [
    {
      label: "Billing cycle",
      value: m?.billingCycle != null ? `${m.billingCycle} days` : "—",
    },
    {
      label: "Credit limit",
      value: m?.creditLimit != null ? fmtMoney(m.creditLimit) : "—",
    },
    {
      label: "Outstanding",
      value: fmtMoney(m?.outstandingCredit),
      valueClass: "text-orange-600",
    },
    {
      label: "Open credit notes",
      value: m?.openCreditNoteCount
        ? `${fmtMoney(m.openCreditNotes)} (${m.openCreditNoteCount})`
        : "—",
    },
    {
      label: "Last payment",
      value: m?.lastPayment
        ? `${fmtMoney(m.lastPayment.amount)} · ${fmtDate(m.lastPayment.paymentDate)}`
        : "—",
    },
    {
      label: "Discount total",
      value: fmtMoney(m?.discountTotal),
    },
  ];

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">Customer details</h2>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-base font-semibold">
              {c.name}
              {c.code ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">({c.code})</span>
              ) : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0 space-y-2">
            <DetailRow label="Shop name" value={c.shopname} />
            <DetailRow label="Email" value={c.email} />
            <DetailRow label="Phone" value={c.phone} />
            <DetailRow label="Sales person" value={c.salePerson?.name} />
            <DetailRow label="Delivery person" value={c.deliveryPerson?.name} />
            <DetailRow label="Address" value={fullAddress} />
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Financial metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="grid grid-cols-2 gap-2">
              {financialItems.map((it) => (
                <MetricTile
                  key={it.label}
                  label={it.label}
                  value={it.value}
                  valueClass={it.valueClass}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
