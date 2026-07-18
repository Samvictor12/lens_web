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
import { Checkbox } from "@/components/ui/checkbox";
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

function defaultEyeSelection(summary) {
  const soRight = Boolean(summary?.rightEye);
  const soLeft = Boolean(summary?.leftEye);
  const hasShortageMeta =
    summary?.shortageRight !== undefined || summary?.shortageLeft !== undefined;
  if (hasShortageMeta) {
    const right = soRight && Boolean(summary.shortageRight);
    const left = soLeft && Boolean(summary.shortageLeft);
    if (right || left) return { rightEye: right, leftEye: left };
  }
  return { rightEye: soRight, leftEye: soLeft };
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
  const [selectRight, setSelectRight] = useState(false);
  const [selectLeft, setSelectLeft] = useState(false);

  const canRight = Boolean(summary?.rightEye);
  const canLeft = Boolean(summary?.leftEye);
  const showEyeSelection = canRight || canLeft;
  const poQty = (selectRight ? 1 : 0) + (selectLeft ? 1 : 0);

  useEffect(() => {
    if (!open) return;
    setVendorId(null);
    setError("");
    const defaults = defaultEyeSelection(summary);
    setSelectRight(defaults.rightEye);
    setSelectLeft(defaults.leftEye);
    getVendorDropdown()
      .then((res) => {
        if (res.success) setVendors(res.data || []);
      })
      .catch(() => setVendors([]));
  }, [open, summary]);

  const handleConfirm = () => {
    if (!vendorId) {
      setError("Please select a vendor");
      return;
    }
    if (showEyeSelection && !selectRight && !selectLeft) {
      setError("Select at least one eye for the PO");
      return;
    }
    setError("");
    onConfirm(vendorId, { rightEye: selectRight, leftEye: selectLeft });
  };

  const procurementType = summary?.procurementType || "RX";
  const procurementStyle =
    procurementBadgeStyles[procurementType] || procurementBadgeStyles.RX;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] !flex flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 space-y-0 border-b px-6 py-4 pr-12">
          <DialogTitle>
            {mode === "create" ? "Create SO & Raise PO" : "Raise Purchase Order"}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
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
                      {summary.shortageRight && (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-[10px]">
                          Shortage
                        </Badge>
                      )}
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
                      {summary.shortageLeft && (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-[10px]">
                          Shortage
                        </Badge>
                      )}
                    </div>
                    <p className="font-mono text-xs text-foreground break-words">
                      {formatEyeSpecLine("left", summary)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {showEyeSelection && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Eyes to procure</Label>
              <p className="text-xs text-muted-foreground">
                Defaults to shortage eyes only. You can include covered eyes before confirm.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                {canRight && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectRight}
                      onCheckedChange={(v) => setSelectRight(Boolean(v))}
                    />
                    Right
                  </label>
                )}
                {canLeft && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={selectLeft}
                      onCheckedChange={(v) => setSelectLeft(Boolean(v))}
                    />
                    Left
                  </label>
                )}
                {canRight && canLeft && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      setSelectRight(true);
                      setSelectLeft(true);
                    }}
                  >
                    Both
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PO quantity: {poQty}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Vendor <span className="text-red-500">*</span>
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

        <DialogFooter className="flex-shrink-0 border-t bg-background px-6 py-4 gap-2 sm:space-x-2">
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
