import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getVendorDropdown } from "@/services/vendor";
import { STATUS_LABELS } from "@/constants/saleOrderStatus";
import { procurementBadgeStyles } from "@/pages/Inventory/InventoryRequestQueue.constants";

function hasSpecValue(value) {
  return value !== null && value !== undefined && value !== "";
}

function formatEyeSpecLine(prefix, summary) {
  const fields = [
    ["SPH", `${prefix}Spherical`],
    ["CYL", `${prefix}Cylindrical`],
    ["AXIS", `${prefix}Axis`],
    ["ADD", `${prefix}Add`],
    ["DIA", `${prefix}Dia`],
  ];
  const parts = fields
    .map(([label, key]) => {
      const value = summary?.[key];
      if (!hasSpecValue(value)) return null;
      return `${label}: ${value}`;
    })
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : "—";
}

function SummaryRow({ label, value }) {
  if (!hasSpecValue(value) && value !== 0) return null;
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default function RaisePoModal({
  open,
  onOpenChange,
  summary,
  onConfirm,
  loading = false,
  mode = "raise", // "raise" | "create" | "inventory"
}) {
  const confirmLabel =
    mode === "create"
      ? "Save SO & Raise PO"
      : mode === "inventory"
        ? "Raise PO"
        : "Save & Raise PO";
  const loadingLabel = mode === "inventory" ? "Raising..." : "Saving...";
  const [vendors, setVendors] = useState([]);
  const [vendorId, setVendorId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setVendorId(null);
    setError("");
    getVendorDropdown()
      .then((res) => {
        if (res.success) setVendors(res.data || []);
      })
      .catch(() => setVendors([]));
  }, [open]);

  const handleConfirm = () => {
    if (!vendorId) {
      setError("Please select a vendor");
      return;
    }
    setError("");
    onConfirm(vendorId);
  };

  const procurementType = summary?.procurementType || "RX";
  const procurementStyle =
    procurementBadgeStyles[procurementType] || procurementBadgeStyles.RX;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create SO & Raise PO" : "Raise Purchase Order"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sale Order Summary
            </p>
            <SummaryRow label="Order #" value={summary?.orderNo || "New order"} />
            <SummaryRow label="Customer" value={summary?.customerName} />
            <SummaryRow label="Customer Ref" value={summary?.customerRefNo} />
            <SummaryRow label="Lens Product" value={summary?.lensProductName} />
            <SummaryRow label="Category" value={summary?.categoryName} />
            <SummaryRow label="Type" value={summary?.typeName} />
            <SummaryRow label="Coating" value={summary?.coatingName} />
            <SummaryRow
              label="Status"
              value={summary?.status ? STATUS_LABELS[summary.status] || summary.status : "DRAFT"}
            />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Procurement</span>
              <Badge variant="outline" className={`text-xs border ${procurementStyle}`}>
                {procurementType}
              </Badge>
            </div>
            {(summary?.rightEye || summary?.leftEye) && (
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Specifications
                </p>
                {summary.rightEye && (
                  <div className="rounded-md bg-background border px-2.5 py-2 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 text-[10px]">
                        R
                      </Badge>
                      <span className="text-xs font-medium text-muted-foreground">Right Eye</span>
                    </div>
                    <p className="font-mono text-xs text-foreground break-words">
                      {formatEyeSpecLine("right", summary)}
                    </p>
                  </div>
                )}
                {summary.leftEye && (
                  <div className="rounded-md bg-background border px-2.5 py-2 text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 text-[10px]">
                        L
                      </Badge>
                      <span className="text-xs font-medium text-muted-foreground">Left Eye</span>
                    </div>
                    <p className="font-mono text-xs text-foreground break-words">
                      {formatEyeSpecLine("left", summary)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Vendor <span className="text-destructive">*</span>
            </Label>
            <FormSelect
              name="vendorId"
              options={vendors}
              value={vendorId}
              onChange={setVendorId}
              placeholder="Select vendor"
              isSearchable
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? loadingLabel : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
