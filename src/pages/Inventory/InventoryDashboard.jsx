import { Package, TrendingUp, Layers, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "./Inventory.constants";

/**
 * Inventory Dashboard — standalone component for the Dashboard tab.
 * Receives stats from InventoryMain (no internal data loading).
 */
export default function InventoryDashboard({ stats = {}, isLoading = false }) {
  const statCards = [
    {
      label: "Total Items",
      value: stats.totalItems ?? 0,
      icon: Package,
      className: "text-primary",
      iconClass: "text-primary",
    },
    {
      label: "Available",
      value: stats.availableItems ?? 0,
      icon: TrendingUp,
      className: "text-green-600",
      iconClass: "text-green-500",
    },
    {
      label: "Reserved",
      value: stats.reservedItems ?? 0,
      icon: Layers,
      className: "text-yellow-600",
      iconClass: "text-yellow-500",
    },
    {
      label: "Low Stock",
      value: stats.lowStockItems ?? 0,
      icon: AlertTriangle,
      className: "text-red-600",
      iconClass: "text-red-500",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, className, iconClass }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold ${className}`}>
                    {isLoading ? "—" : value}
                  </p>
                </div>
                <Icon className={`h-7 w-7 opacity-60 ${iconClass}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Total Value card (only shown if backend returns it) */}
      {stats.totalValue != null && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Total Inventory Value
                </p>
                <p className="text-2xl font-bold">
                  {isLoading ? "—" : formatCurrency(stats.totalValue)}
                </p>
              </div>
              <TrendingUp className="h-7 w-7 text-primary opacity-60" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
