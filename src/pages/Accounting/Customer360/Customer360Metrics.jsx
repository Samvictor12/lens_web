import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtMoney(n) {
  const amount = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN");
}

/**
 * Section 1 — customer details + key metrics.
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

  const items = [
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
      label: "Discounts",
      value: m?.discounts?.label || "—",
    },
    {
      label: "Total credit notes",
      value: m?.creditNoteCount
        ? `${fmtMoney(m.totalCreditNotes)} (${m.creditNoteCount})`
        : "—",
    },
    {
      label: "Last payment",
      value: m?.lastPayment
        ? `${fmtMoney(m.lastPayment.amount)} · ${fmtDate(m.lastPayment.paymentDate)}`
        : "—",
    },
  ];

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">Customer details</h2>
      <Card className="shadow-none">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-base font-semibold">
            {c.name}
            {c.code ? (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({c.code})</span>
            ) : null}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {[c.shopname, c.city, c.phone, c.gstin].filter(Boolean).join(" · ") || "—"}
          </p>
          {(c.address || c.state || c.pincode) && (
            <p className="text-xs text-muted-foreground">
              {[c.address, c.state, c.pincode].filter(Boolean).join(", ")}
            </p>
          )}
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {items.map((it) => (
              <div key={it.label} className="rounded-md border bg-muted/30 p-2">
                <div className="text-[11px] text-muted-foreground">{it.label}</div>
                <div className={`text-sm font-semibold mt-0.5 truncate ${it.valueClass || ""}`}>
                  {it.value}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
