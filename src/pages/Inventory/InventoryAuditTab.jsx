import { useEffect, useState } from "react";
import { ClipboardCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import InventoryInitializationForm from "./InventoryInitializationForm";
import InventorySpecThresholdEditor from "./InventorySpecThresholdEditor";
import InventoryAlertList from "./InventoryAlertList";
import InventoryManualAddForm from "./InventoryManualAddForm";
import InventoryTrayTransferForm from "./InventoryTrayTransferForm";
import InventoryCycleCountSection from "./InventoryCycleCountSection";

export default function InventoryAuditTab({ godownType, onRefresh }) {
  const [showInitForm, setShowInitForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const bump = () => {
    setRefreshKey((k) => k + 1);
    onRefresh?.();
  };

  useEffect(() => {
    if (window.location.hash === "#cycle-count") {
      document.getElementById("cycle-count")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [godownType, refreshKey]);

  return (
    <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <ClipboardCheck className="h-4 w-4" />
        Audit — tray transfer, cycle count, initialization, and spec thresholds for {godownType} Godown
      </div>

      <InventoryTrayTransferForm godownType={godownType} onSuccess={bump} />

      <InventoryCycleCountSection
        key={`cc-${godownType}-${refreshKey}`}
        godownType={godownType}
        onRefresh={bump}
      />

      <InventoryManualAddForm godownType={godownType} onSuccess={bump} />

      <Card className="border-dashed">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Initialize Stock</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bulk inward from power grid (moved from Dashboard)
              </p>
            </div>
            <Button onClick={() => setShowInitForm(true)} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Initialize Stock
            </Button>
          </div>
        </CardContent>
      </Card>

      <InventoryInitializationForm
        isOpen={showInitForm}
        onClose={() => setShowInitForm(false)}
        onSuccess={() => { bump(); setShowInitForm(false); }}
        godownType={godownType}
      />

      <InventorySpecThresholdEditor godownType={godownType} key={`thresh-${godownType}-${refreshKey}`} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InventoryAlertList
          key={`low-${godownType}-${refreshKey}`}
          godownType={godownType}
          alertType="low"
          title="Low Stock Alerts"
          limit={5}
        />
        <InventoryAlertList
          key={`out-${godownType}-${refreshKey}`}
          godownType={godownType}
          alertType="out"
          title="Out of Stock"
          limit={5}
        />
        <InventoryAlertList
          key={`over-${godownType}-${refreshKey}`}
          godownType={godownType}
          alertType="over"
          title="Over Stock"
          limit={5}
        />
      </div>
    </div>
  );
}
