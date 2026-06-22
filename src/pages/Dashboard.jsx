import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Package,
  FileText,
  Activity,
  Trophy,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dummyCustomers, dummyLensVariants, dummyPurchaseOrders } from "@/lib/dummyData";
import { getDashboardSummary } from "@/services/dashboard";
import { InvoiceStatusBadge } from "@/pages/Billing/InvoiceCard";

export default function Dashboard() {
  const { data: summaryRes, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  const summary = summaryRes?.data;
  const todaySales = summary?.todaySales || 0;
  const top5Sales = summary?.top5Sales || [];
  const topProduct = summary?.topProduct || null;

  // Calculate stats (still mock — out of scope for this feature)
  const outstandingPayments = dummyCustomers.reduce(
    (sum, c) => sum + c.outstandingBalance,
    0
  );

  const lowStockItems = dummyLensVariants.filter(
    (v) => v.stockQuantity <= v.reorderLevel
  ).length;

  const pendingPOs = dummyPurchaseOrders.filter((po) => po.status === "pending" || po.status === "ordered").length;

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4 animate-in fade-in duration-500">
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Overview of your lens billing system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Today's Sales"
          value={summaryLoading ? "—" : `₹${todaySales.toLocaleString("en-IN")}`}
          icon={DollarSign}
        />
        <StatCard
          title="Top Selling Product"
          value={summaryLoading ? "—" : topProduct ? topProduct.name : "No sales today"}
          trend={topProduct ? { value: `₹${topProduct.revenue.toLocaleString("en-IN")} revenue`, isPositive: true } : undefined}
          icon={Trophy}
        />
        <StatCard
          title="Outstanding Payments"
          value={`₹${outstandingPayments.toLocaleString("en-IN")}`}
          icon={TrendingUp}
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockItems}
          icon={AlertCircle}
          className={lowStockItems > 0 ? "border-warning" : ""}
        />
        <StatCard
          title="Pending POs"
          value={pendingPOs}
          icon={FileText}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Top 5 Sales Today
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {summaryLoading ? (
                <p className="text-xs text-muted-foreground py-2">Loading...</p>
              ) : top5Sales.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No sales recorded today</p>
              ) : (
                top5Sales.map((sale) => (
                  <div
                    key={sale.invoiceNo}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium text-xs">{sale.invoiceNo}</div>
                      <div className="text-xs text-muted-foreground">
                        {sale.customerName || "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-semibold text-xs">
                          ₹{sale.totalAmount.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <InvoiceStatusBadge status={sale.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Package className="h-3.5 w-3.5 text-accent" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {dummyLensVariants
                .filter((v) => v.stockQuantity <= v.reorderLevel)
                .slice(0, 5)
                .map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-warning/5 border border-warning/20"
                  >
                    <div className="space-y-0.5">
                      <div className="font-medium text-xs">{variant.name}</div>
                      <div className="text-xs text-muted-foreground">
                        SKU: {variant.sku}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-xs text-warning">
                        {variant.stockQuantity} units
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Reorder: {variant.reorderLevel}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




