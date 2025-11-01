import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  Package,
  FileText,
  Activity,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dummySaleOrders, dummyCustomers, dummyLensVariants, dummyPurchaseOrders } from "@/lib/dummyData";

export default function Dashboard() {
  // Calculate stats
  const totalSales = dummySaleOrders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const outstandingPayments = dummyCustomers.reduce(
    (sum, c) => sum + c.outstandingBalance,
    0
  );

  const lowStockItems = dummyLensVariants.filter(
    (v) => v.stockQuantity <= v.reorderLevel
  ).length;

  const pendingPOs = dummyPurchaseOrders.filter((po) => po.status === "pending" || po.status === "ordered").length;

  const recentOrders = dummySaleOrders.slice(0, 5);

  const statusColors = {
    pending: "bg-warning/10 text-warning border-warning/20",
    "in-production": "bg-primary/10 text-primary border-primary/20",
    "ready-for-dispatch": "bg-accent/10 text-accent border-accent/20",
    dispatched: "bg-success/10 text-success border-success/20",
    delivered: "bg-success/10 text-success border-success/20",
    returned: "bg-destructive/10 text-destructive border-destructive/20",
  };

  return (
    <div className="p-6 space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your lens billing system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales (MTD)"
          value={`₹${totalSales.toLocaleString("en-IN")}`}
          icon={DollarSign}
          trend={{ value: "12.5% vs last month", isPositive: true }}
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
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="space-y-1">
                    <div className="font-medium text-sm">{order.orderNumber}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold text-sm">
                        ₹{order.totalAmount.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <Badge className={statusColors[order.status]} variant="outline">
                      {order.status.replace(/-/g, " ")}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dummyLensVariants
                .filter((v) => v.stockQuantity <= v.reorderLevel)
                .slice(0, 5)
                .map((variant) => (
                  <div
                    key={variant.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20"
                  >
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{variant.name}</div>
                      <div className="text-xs text-muted-foreground">
                        SKU: {variant.sku}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm text-warning">
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




