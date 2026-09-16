import { useState, useEffect, useMemo, useRef } from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import {
  getDownloadEligiblePOs,
  downloadPurchaseOrderExcel,
  downloadBatchPurchaseOrderExcel,
} from "@/services/purchaseOrder";
import { getStatusLabel } from "./PurchaseOrder.constants";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

/**
 * Pick vendor + Single POs and download as Excel (single file or batch sheet).
 */
export default function DownloadPODialog({
  open,
  onOpenChange,
  vendors = [],
  initialVendorId,
  initialPoIds = [],
}) {
  const { toast } = useToast();
  const vendorLocked = Boolean(initialVendorId);
  const initialPoKey = (initialPoIds || []).join(",");
  const initialPoAppliedRef = useRef(false);

  const [vendorId, setVendorId] = useState("");
  const [eligiblePOs, setEligiblePOs] = useState([]);
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [selectedPoIds, setSelectedPoIds] = useState([]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!open) {
      initialPoAppliedRef.current = false;
      return;
    }
    setVendorId(initialVendorId ? String(initialVendorId) : "");
    setSelectedPoIds([]);
    setEligiblePOs([]);
  }, [open, initialVendorId]);

  useEffect(() => {
    if (!open || !vendorId) {
      if (!vendorId) setEligiblePOs([]);
      return;
    }
    setLoadingPOs(true);
    getDownloadEligiblePOs(vendorId)
      .then((res) => {
        const pos = (res.data?.purchaseOrders || []).map((po) => ({
          id: po.purchaseOrderId,
          poNumber: po.poNumber,
          orderDate: po.orderDate,
          totalValue: po.totalValue,
          status: po.status,
          customerRef: po.customerRef,
          lensName: po.lensName,
        }));
        setEligiblePOs(pos);
        const eligible = new Set(pos.map((p) => p.id));
        if (!initialPoAppliedRef.current && initialPoKey) {
          initialPoAppliedRef.current = true;
          setSelectedPoIds(
            initialPoKey
              .split(",")
              .map((id) => parseInt(id, 10))
              .filter((id) => eligible.has(id))
          );
        } else {
          setSelectedPoIds((prev) => prev.filter((id) => eligible.has(id)));
        }
      })
      .catch(() => {
        toast({ variant: "destructive", title: "Failed to load purchase orders" });
      })
      .finally(() => setLoadingPOs(false));
  }, [open, vendorId, initialPoKey, toast]);

  const selectedPOs = useMemo(
    () => eligiblePOs.filter((po) => selectedPoIds.includes(po.id)),
    [eligiblePOs, selectedPoIds]
  );

  const allSelected =
    eligiblePOs.length > 0 && eligiblePOs.every((po) => selectedPoIds.includes(po.id));
  const someSelected =
    !allSelected && eligiblePOs.some((po) => selectedPoIds.includes(po.id));

  const togglePo = (id) => {
    setSelectedPoIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked) => {
    setSelectedPoIds(checked ? eligiblePOs.map((p) => p.id) : []);
  };

  const handleDownload = async () => {
    if (!selectedPOs.length || downloading) return;
    setDownloading(true);
    try {
      if (selectedPOs.length === 1) {
        const po = selectedPOs[0];
        await downloadPurchaseOrderExcel(po.id, po.poNumber, po.orderDate);
      } else {
        await downloadBatchPurchaseOrderExcel(selectedPOs.map((p) => p.id));
      }
      toast({ title: `Downloaded ${selectedPOs.length} PO(s) successfully` });
      onOpenChange(false);
    } catch {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not export the selected POs to Excel.",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!flex !flex-col !w-[75vw] !max-w-[75vw] !h-[88vh] !max-h-[88vh] overflow-hidden gap-0 p-0">
        <DialogHeader className="shrink-0 px-6 pt-6 pb-3 pr-12">
          <DialogTitle>Download PO (Excel)</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,17.5rem)_minmax(0,1fr)] grid-rows-1 gap-0 overflow-hidden border-t">
          <div className="min-h-0 h-full overflow-y-auto space-y-4 px-4 py-4 border-b lg:border-b-0 lg:border-r">
            <FormSelect
              label="Vendor"
              name="vendorId"
              options={vendors}
              value={vendorId}
              onChange={(value) => {
                setVendorId(value != null && value !== "" ? String(value) : "");
                setSelectedPoIds([]);
                initialPoAppliedRef.current = true;
              }}
              placeholder="Select vendor"
              isSearchable
              isClearable={!vendorLocked}
              disabled={vendorLocked}
              required
            />
            <p className="text-xs text-muted-foreground">
              Only <strong>Single</strong> POs in <strong>Pending (Draft)</strong> status are listed.
            </p>
          </div>

          <div className="min-h-0 h-full flex flex-col overflow-hidden px-6 py-4">
            <div className="shrink-0 mb-3">
              <Label>
                Purchase Orders <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Select one or more POs to download. Multiple POs export as one Excel sheet.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {!vendorId ? (
                <p className="text-xs text-muted-foreground py-2">Select a vendor to load purchase orders.</p>
              ) : loadingPOs ? (
                <p className="text-xs text-muted-foreground py-2">Loading purchase orders...</p>
              ) : eligiblePOs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No pending Single purchase orders for this vendor.
                </p>
              ) : (
                <div className="border rounded-md divide-y text-xs">
                  <div className="sticky top-0 z-[2] grid grid-cols-[2rem_1fr_5rem] gap-2 px-3 py-2 bg-muted font-medium text-muted-foreground border-b shadow-[0_1px_0_0_hsl(var(--border))]">
                    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={(checked) => handleSelectAll(checked === true)}
                        aria-label="Select all"
                      />
                    </div>
                    <span>PO Number</span>
                    <span className="text-right">Total</span>
                  </div>
                  {eligiblePOs.map((po) => {
                    const selected = selectedPoIds.includes(po.id);
                    return (
                      <div
                        key={po.id}
                        className={`grid grid-cols-[2rem_1fr_5rem] gap-2 items-center px-3 py-2 ${selected ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex items-center justify-center">
                          <Checkbox
                            checked={selected}
                            onCheckedChange={() => togglePo(po.id)}
                            aria-label={`Select ${po.poNumber}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium">{po.poNumber}</p>
                          <p className="text-muted-foreground truncate">
                            {po.lensName || "—"}
                            {po.customerRef ? ` · ${po.customerRef}` : ""}
                          </p>
                          <p className="text-muted-foreground">
                            {getStatusLabel(po.status)}
                            {po.orderDate
                              ? ` · ${new Date(po.orderDate).toLocaleDateString("en-IN")}`
                              : ""}
                          </p>
                        </div>
                        <span className="text-right font-mono pr-1">{fmt(po.totalValue)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 px-6 py-4 border-t bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={downloading}>
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            disabled={downloading || selectedPOs.length === 0}
            className="gap-1.5"
          >
            {downloading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading
              ? "Downloading..."
              : `Download Excel${selectedPOs.length ? ` (${selectedPOs.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
