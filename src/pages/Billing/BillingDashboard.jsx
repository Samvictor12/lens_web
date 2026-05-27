import { Plus, Receipt, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fmt } from "./Billing.constants";
import { InvoiceStatusBadge } from "./InvoiceCard";

export default function BillingDashboard({
  stats,
  statsLoading,
  recentInvoices,
  onCreateInvoice,
  onViewInvoice,
}) {
  const statCards = [
    {
      icon: Receipt,
      label: "Total Invoices",
      value: stats.total,
      iconColor: "text-blue-500",
      valueColor: "",
    },
    {
      icon: Clock,
      label: "Pending Payment",
      value: stats.pending,
      iconColor: "text-yellow-500",
      valueColor: "text-yellow-600",
    },
    {
      icon: CheckCircle2,
      label: "Paid",
      value: stats.paid,
      iconColor: "text-green-500",
      valueColor: "text-green-600",
    },
    {
      icon: AlertCircle,
      label: "Outstanding (₹)",
      value: stats.outstanding.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
      iconColor: "text-orange-500",
      valueColor: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{s.label}</CardTitle>
                <Icon className={`h-4 w-4 ${s.iconColor}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${s.valueColor}`}>
                  {statsLoading ? "…" : s.value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <p className="text-muted-foreground text-center py-4">Loading…</p>
          ) : recentInvoices.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Receipt className="h-10 w-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">No invoices yet.</p>
              <Button onClick={onCreateInvoice}>
                <Plus className="h-4 w-4 mr-1" /> Create Invoice
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentInvoices.map((inv) => {
                const remaining = inv.totalAmount - inv.paidAmount;
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onViewInvoice(inv.id)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{inv.invoiceNo}</div>
                      <div className="text-xs text-muted-foreground">
                        {inv.customer?.name} · Due{" "}
                        {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <InvoiceStatusBadge status={inv.status} />
                      <div className="text-xs">
                        <span className="font-semibold">{fmt(inv.totalAmount)}</span>
                        {remaining > 0.01 && (
                          <span className="text-orange-600 ml-1">
                            ({fmt(remaining)} due)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
