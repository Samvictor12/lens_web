import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Warehouse, CheckCircle2, AlertTriangle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormSelect } from "@/components/ui/form-select";
import { FormInput } from "@/components/ui/form-input";
import { useToast } from "@/hooks/use-toast";
import { getPurchaseOrderById } from "@/services/purchaseOrder";
import { getReceiptInwardStatus, inwardReceiptToInventory } from "@/services/purchaseOrder";
import { getInventoryDropdowns } from "@/services/inventory";

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmtSph = (v) => {
  if (v == null || v === "") return "—";
  const n = parseFloat(v);
  return n > 0 ? `+${v}` : `${v}`;
};

const emptyRow = () => ({ location_id: "", tray_id: "", qty: "" });

export default function POInwardToInventory() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id, receiptId } = useParams(); // id = poId, receiptId = purchaseOrderReceiptId
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [po, setPo] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [inwardedByRow, setInwardedByRow] = useState({});

  const [locations, setLocations] = useState([]);
  const [allTrays, setAllTrays] = useState([]);

  // rowSplits: { [rowKey]: [{ location_id, tray_id, qty }] }
  const [rowSplits, setRowSplits] = useState({});

  const closeRoute = useMemo(() => {
    if (location.pathname.startsWith("/inventory/inward/")) {
      return "/inventory/inward";
    }

    return `/masters/purchase-orders/receive/${id}/edit/${receiptId}`;
  }, [id, location.pathname, receiptId]);

  // ── Data loading ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const [poRes, statusRes, dropdownRes] = await Promise.all([
        getPurchaseOrderById(parseInt(id)),
        getReceiptInwardStatus(parseInt(id), parseInt(receiptId)),
        getInventoryDropdowns(),
      ]);

      if (!poRes.success) throw new Error("Purchase order not found");
      if (!statusRes.success) throw new Error("Receipt not found");

      setPo(poRes.data);
      setReceipt(statusRes.data.receipt);
      setInwardedByRow(statusRes.data.inwardedByRow || {});

      if (dropdownRes.success) {
        setLocations(dropdownRes.data?.locations || []);
        setAllTrays(dropdownRes.data?.trays || []);
      }

      // Build initial rowSplits from receivedItems
      const receivedItems = Array.isArray(statusRes.data.receipt?.receivedItems)
        ? statusRes.data.receipt.receivedItems
        : [];
      const initial = {};
      for (const ri of receivedItems) {
        const k = ri.key || `sph_${ri.spherical}_cyl_${ri.cylindrical}`;
        const alreadyInwarded = (statusRes.data.inwardedByRow || {})[`${ri.spherical ?? "0"}_${ri.cylindrical ?? "0"}`] || 0;
        const pending = (parseFloat(ri.receivedQty) || 0) - alreadyInwarded;
        if (pending > 0) {
          initial[k] = [emptyRow()];
        }
      }
      setRowSplits(initial);
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to load data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [id, receiptId]);

  useEffect(() => { load(); }, [load]);

  // ── Derived computations ─────────────────────────────────────────────────

  const receivedItems = Array.isArray(receipt?.receivedItems) ? receipt.receivedItems : [];
  const isBulk = receivedItems.length > 0 && receivedItems[0]?.spherical != null;

  const rowsWithPending = receivedItems.map((ri) => {
    const k = ri.key || `sph_${ri.spherical}_cyl_${ri.cylindrical}`;
    const alreadyInwarded = inwardedByRow[`${ri.spherical ?? "0"}_${ri.cylindrical ?? "0"}`] || 0;
    const pending = Math.max(0, (parseFloat(ri.receivedQty) || 0) - alreadyInwarded);
    const splitsForRow = rowSplits[k] || [];
    const splitTotal = splitsForRow.reduce((s, sp) => s + (parseFloat(sp.qty) || 0), 0);
    return { ...ri, key: k, alreadyInwarded, pending, splitTotal };
  });

  const pendingRows = rowsWithPending.filter((r) => r.pending > 0);
  const fullyDoneRows = rowsWithPending.filter((r) => r.pending === 0);

  const totalPending = pendingRows.reduce((s, r) => s + r.pending, 0);
  const totalThisBatch = pendingRows.reduce((s, r) => s + r.splitTotal, 0);

  // ── Split management ─────────────────────────────────────────────────────

  const addSplit = (key) => {
    setRowSplits((prev) => ({ ...prev, [key]: [...(prev[key] || []), emptyRow()] }));
  };

  const removeSplit = (key, idx) => {
    setRowSplits((prev) => {
      const updated = (prev[key] || []).filter((_, i) => i !== idx);
      return { ...prev, [key]: updated.length > 0 ? updated : [emptyRow()] };
    });
  };

  const updateSplit = (key, idx, field, value) => {
    setRowSplits((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((sp, i) =>
        i === idx ? { ...sp, [field]: value, ...(field === "location_id" ? { tray_id: "" } : {}) } : sp
      ),
    }));
  };

  const traysForLocation = (locationId) => {
    if (!locationId) return allTrays;
    return allTrays.filter((t) => !t.location_id || t.location_id === parseInt(locationId));
  };

  const locationOptions = locations.map((loc) => ({
    value: loc.id,
    label: loc.name,
  }));

  // ── Validate ─────────────────────────────────────────────────────────────

  const validate = () => {
    if (pendingRows.length === 0) {
      toast({ title: "Nothing to inward", description: "All items have already been inwarded.", variant: "destructive" });
      return false;
    }

    for (const row of pendingRows) {
      const splits = rowSplits[row.key] || [];
      const activeSplits = splits.filter((sp) => parseFloat(sp.qty) > 0);
      if (activeSplits.length === 0) continue; // row will be skipped

      const splitTotal = activeSplits.reduce((s, sp) => s + (parseFloat(sp.qty) || 0), 0);
      if (splitTotal > row.pending + 0.001) {
        toast({
          title: "Quantity exceeds pending",
          description: `SPH ${fmtSph(row.spherical)} / CYL ${fmtSph(row.cylindrical)}: split total (${splitTotal}) exceeds pending (${row.pending})`,
          variant: "destructive",
        });
        return false;
      }

      for (const sp of activeSplits) {
        if (!sp.location_id) {
          toast({ title: "Location required", description: "Select a location for each split.", variant: "destructive" });
          return false;
        }
      }
    }

    if (totalThisBatch <= 0) {
      toast({ title: "No quantity entered", description: "Enter at least one quantity to inward.", variant: "destructive" });
      return false;
    }

    return true;
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!validate()) return;

    const inwardRows = [];
    for (const row of pendingRows) {
      const splits = (rowSplits[row.key] || []).filter((sp) => parseFloat(sp.qty) > 0);
      if (splits.length === 0) continue;

      inwardRows.push({
        key: row.key,
        spherical: row.spherical ?? "0",
        cylindrical: row.cylindrical ?? "0",
        splits: splits.map((sp) => ({
          location_id: parseInt(sp.location_id),
          tray_id: sp.tray_id ? parseInt(sp.tray_id) : null,
          qty: parseFloat(sp.qty),
        })),
      });
    }

    if (inwardRows.length === 0) {
      toast({ title: "No quantity entered", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      const res = await inwardReceiptToInventory(parseInt(id), parseInt(receiptId), inwardRows);
      if (res.success) {
        toast({
          title: "Inventory updated",
          description: `${res.data.createdCount} item(s) created · ${res.data.totalInwardedQty} units pushed to stock`,
        });
        // Reload to reflect updated inward status
        await load();
      } else {
        throw new Error(res.message || "Failed to inward items");
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading inward data...</p>
        </div>
      </div>
    );
  }

  if (!po || !receipt) return null;

  const totalReceived = receipt.totalReceivedQty || 0;
  const totalInwarded = receipt.inwardedQty || 0;

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-primary" />
            Inventory Inward
          </h1>
          <p className="text-xs text-muted-foreground">
            Push received items from <span className="font-medium">{receipt.receiptNumber}</span> ({po.poNumber}) into stock
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-8 gap-1.5"
            onClick={() => navigate(closeRoute)}
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Close
          </Button>
          <Button
            size="xs"
            className="h-8 gap-1.5"
            onClick={handleSave}
            disabled={isSaving || totalPending === 0 || totalThisBatch <= 0}
          >
            {isSaving ? (
              <><span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> Saving...</>
            ) : (
              <><Save className="h-3.5 w-3.5" /> Push to Inventory</>
            )}
          </Button>
        </div>
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Use the same master-form flow here: choose <span className="font-medium">Location</span>, optionally choose <span className="font-medium">Tray</span>, then enter <span className="font-medium">Qty</span>.
          Each split creates a separate inventory item, and total entered quantity for a row cannot exceed the pending quantity.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-3 items-start">
        {/* ── Left: Receipt Summary ── */}
        <div className="flex flex-col gap-3 xl:sticky xl:top-3">
          {/* Receipt Info */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">Receipt Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">PO Number</span>
                <span className="font-semibold">{po.poNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt</span>
                <span className="font-semibold text-primary">{receipt.receiptNumber}</span>
              </div>
              {po.vendor?.name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor</span>
                  <span>{po.vendor.name}</span>
                </div>
              )}
              {po.lensProduct?.lens_name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lens</span>
                  <span className="text-right font-medium">{po.lensProduct.lens_name}</span>
                </div>
              )}
              {receipt.supplierInvoiceNo && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice No</span>
                  <span>{receipt.supplierInvoiceNo}</span>
                </div>
              )}
              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Received</span>
                  <span className="font-semibold">{totalReceived} pcs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Already Inwarded</span>
                  <span className={`font-semibold ${totalInwarded > 0 ? "text-green-700" : "text-foreground"}`}>
                    {totalInwarded} pcs
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending Inward</span>
                  <span className={`font-semibold ${totalPending > 0 ? "text-orange-600" : "text-muted-foreground"}`}>
                    {totalPending} pcs
                  </span>
                </div>
              </div>
              {totalPending === 0 && totalInwarded > 0 && (
                <div className="border rounded-md bg-green-50 p-2 flex items-center gap-1.5 text-green-700 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                  All items inwarded to stock
                </div>
              )}
            </CardContent>
          </Card>

          {/* This batch summary */}
          {totalThisBatch > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-3 text-xs space-y-1">
                <p className="font-semibold text-primary">This Inward Batch</p>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Units to push</span>
                  <span className="font-semibold">{totalThisBatch}</span>
                </div>
                {receipt.unitPrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost price / unit</span>
                    <span>₹{receipt.unitPrice}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Already inwarded rows (done) */}
          {fullyDoneRows.length > 0 && (
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm text-green-700 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Fully Inwarded Rows
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-xs">
                  <tbody>
                    {fullyDoneRows.map((row, idx) => (
                      <tr key={idx} className="border-b last:border-0 px-3 py-2">
                        <td className="px-3 py-2 font-medium">{fmtSph(row.spherical)}</td>
                        <td className="px-3 py-2 text-muted-foreground">{fmtSph(row.cylindrical)}</td>
                        <td className="px-3 py-2 text-right text-green-700 font-semibold">{row.alreadyInwarded} pcs</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-50 text-green-700 border-green-200">Done</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: Inward Grid ── */}
        <div className="flex flex-col gap-3 min-w-0">
          {totalPending === 0 ? (
            <Card className="border-green-300 bg-green-50">
              <CardContent className="p-6 flex flex-col items-center justify-center gap-2 text-green-700">
                <CheckCircle2 className="h-8 w-8" />
                <p className="font-semibold">All items from this receipt have been inwarded to inventory.</p>
                <p className="text-xs text-green-600">No further action needed.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Rows to inward */}
              {pendingRows.map((row) => {
                const splits = rowSplits[row.key] || [emptyRow()];
                const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.qty) || 0), 0);
                const isOver = splitTotal > row.pending + 0.001;
                const remaining = Math.max(0, row.pending - splitTotal);

                return (
                  <Card key={row.key} className={isOver ? "border-destructive/50" : ""}>
                    <CardHeader className="p-3 pb-2 flex flex-row items-start gap-2">
                      <div className="flex-1 flex items-center gap-2 text-sm flex-wrap">
                        {isBulk ? (
                          <>
                            <span className="font-semibold">SPH {fmtSph(row.spherical)}</span>
                            <span className="text-muted-foreground">/ CYL {fmtSph(row.cylindrical)}</span>
                          </>
                        ) : (
                          <span className="font-semibold">Single Lens</span>
                        )}
                        {row.alreadyInwarded > 0 && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-50 text-green-700 border-green-200">
                            {row.alreadyInwarded} already inwarded
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-right shrink-0">
                        <span className="text-muted-foreground">Pending: </span>
                        <span className={`font-semibold ${isOver ? "text-destructive" : "text-orange-600"}`}>{row.pending}</span>
                        {splitTotal > 0 && (
                          <span className="text-muted-foreground ml-2">
                            · Entered: <span className={`font-semibold ${isOver ? "text-destructive" : "text-primary"}`}>{splitTotal}</span>
                            {!isOver && <span className="ml-1">(rem: {remaining})</span>}
                          </span>
                        )}
                        {isOver && <span className="text-destructive ml-2 font-semibold"> ⚠ Exceeds pending</span>}
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 space-y-2">
                      {/* Split rows */}
                      {splits.map((split, splitIdx) => {
                        const availableTrays = traysForLocation(split.location_id);
                        const trayOptions = availableTrays.map((tray) => ({
                          value: tray.id,
                          label: tray.name,
                        }));

                        return (
                          <div key={splitIdx} className="rounded-md border bg-muted/10 p-3">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-medium text-muted-foreground">Split {splitIdx + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                className="h-7 px-2 text-destructive hover:text-destructive"
                                onClick={() => removeSplit(row.key, splitIdx)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_140px] gap-3 items-start">
                            {/* Location */}
                            <div className="min-w-0">
                              <FormSelect
                                label="Location"
                                required
                                name={`location_${row.key}_${splitIdx}`}
                                value={split.location_id || null}
                                onChange={(value) => updateSplit(row.key, splitIdx, "location_id", value ? String(value) : "")}
                                options={locationOptions}
                                placeholder="Select location"
                                isSearchable={true}
                                isClearable={false}
                              />
                            </div>
                            {/* Tray */}
                            <div className="min-w-0">
                              <FormSelect
                                label="Tray"
                                name={`tray_${row.key}_${splitIdx}`}
                                value={split.tray_id || null}
                                onChange={(value) => updateSplit(row.key, splitIdx, "tray_id", value ? String(value) : "")}
                                options={trayOptions}
                                placeholder="No tray"
                                isClearable
                                disabled={!split.location_id && trayOptions.length === 0}
                                helperText={!split.location_id ? "Select location first" : undefined}
                              />
                            </div>
                            {/* Qty */}
                            <div>
                              <FormInput
                                label="Qty"
                                required
                                name={`qty_${row.key}_${splitIdx}`}
                                type="number"
                                min="0.5"
                                step="0.5"
                                max={row.pending}
                                value={split.qty}
                                onChange={(e) => updateSplit(row.key, splitIdx, "qty", e.target.value)}
                                placeholder="0"
                                className="text-center"
                                helperText={`Max ${row.pending}`}
                              />
                            </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Add split button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        className="h-7 text-xs gap-1 text-primary hover:bg-primary/5 mt-1"
                        onClick={() => addSplit(row.key)}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Split
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
