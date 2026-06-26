import { useState } from "react";
import { Package, TrendingUp, Layers, AlertTriangle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "./Inventory.constants";
import InventoryInitializationForm from "./InventoryInitializationForm";
import InventorySpecTrendChart from "./InventorySpecTrendChart";
import InventoryValueTrendChart from "./InventoryValueTrendChart";
import TopSellingWidget from "./TopSellingWidget";

/**
 * Inventory Dashboard — standalone component for the Dashboard tab.
 * Receives stats from InventoryMain (no internal data loading).
 * Displays stat cards, pending inwards, low stock items, and total value.
 */
export default function InventoryDashboard({ stats = {}, isLoading = false, onRefresh = () => {} }) {
  const [showInitForm, setShowInitForm] = useState(false);
  const statCards = [
    {
      label: "Product Count",
      value: stats.productCount ?? stats.totalItems ?? 0,
      subtext: "distinct products",
      icon: Package,
      className: "text-primary",
      iconClass: "text-primary",
    },
    {
      label: "Available",
      value: stats.availableItems ?? 0,
      subtext: "physical item count at full spec level",
      icon: TrendingUp,
      className: "text-green-600",
      iconClass: "text-green-500",
    },
    {
      label: "Reserved",
      value: stats.reservedItems ?? 0,
      subtext: "physical item count at full spec level",
      icon: Layers,
      className: "text-yellow-600",
      iconClass: "text-yellow-500",
    },
    {
      label: "Low Stock",
      value: stats.lowStockItems?.length ?? stats.lowStockCount ?? 0,
      icon: AlertTriangle,
      className: "text-red-600",
      iconClass: "text-red-500",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, subtext, icon: Icon, className, iconClass }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{label}</p>
                  <p className={`text-2xl font-bold ${className}`}>
                    {isLoading ? "—" : value}
                  </p>
                  {subtext && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{subtext}</p>
                  )}
                </div>
                <Icon className={`h-7 w-7 opacity-60 ${iconClass}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics charts (Pass B) */}
      <InventorySpecTrendChart />
      <InventoryValueTrendChart />
      <TopSellingWidget />

      {/* Total Value card */}
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

      {/* Pending Inwards Widget */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            Pending Inwards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {isLoading ? "—" : stats.pendingInwardsCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Items awaiting inward completion
              </p>
            </div>
          </div>
          {!isLoading && stats.pendingInwardsList && stats.pendingInwardsList.length > 0 && (
            <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
              {stats.pendingInwardsList.slice(0, 5).map((inward) => (
                <div key={inward.id} className="flex items-center justify-between p-2 bg-blue-50 rounded text-xs">
                  <span className="font-medium truncate">
                    {inward.purchaseOrderNo || `PO #${inward.id}`}
                  </span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    {inward.pendingQty || 0} pending
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Low Stock Items Widget */}
      {stats.lowStockItems && stats.lowStockItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stats.lowStockItems.slice(0, 10).map((item) => (
                <div
                  key={item.id || `${item.lens_id}-${item.location_id}`}
                  className="flex items-center justify-between p-2 bg-red-50 rounded text-xs border-l-4 border-red-500"
                >
                  <div className="flex-1">
                    <p className="font-medium truncate">
                      {item.lensProduct?.lens_name || `Lens #${item.lens_id}`}
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {item.location?.name || "Unknown Location"}
                    </p>
                  </div>
                  <div className="ml-2 text-right">
                    <Badge variant="destructive" className="text-xs">
                      {item.currentQty || 0} / {item.minThresholdQty || 0}
                    </Badge>
                    <p className="text-xs text-red-600 mt-1 font-semibold">
                      -{(item.minThresholdQty || 0) - (item.currentQty || 0)} units
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {stats.lowStockItems.length > 10 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">
                +{stats.lowStockItems.length - 10} more items below threshold
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Initialize Stock Widget */}
      <Card className="border-dashed">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Initialize Stock</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Manually add initial inventory items to your trays
              </p>
            </div>
            <Button
              onClick={() => setShowInitForm(true)}
              className="gap-2"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add Stock
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Initialization Form Modal */}
      <InventoryInitializationForm
        isOpen={showInitForm}
        onClose={() => setShowInitForm(false)}
        onSuccess={() => {
          onRefresh();
        }}
      />
    </div>
  );
}
