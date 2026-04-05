import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Warehouse, CheckCircle2, AlertTriangle, Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { getPurchaseOrderById } from "@/services/purchaseOrder";
import { getReceiptInwardStatus, inwardReceiptToInventory } from "@/services/purchaseOrder";
import { getInventoryDropdowns } from "@/services/inventory";
import { getTraysByLocation } from "@/services/tray";

// ─── Helpers ───────────────────────────────────────────────────────────────

const fmtSph = (v) => {
  if (v == null || v === "") return "—";
  const n = parseFloat(v);
  return n > 0 ? `+${v}` : `${v}`;
};

/** Parse "sph_-2_cyl_0.25" → { spherical, cylindrical, add, eye }
 *  or   "sph_0_add_1.25_L"  → { spherical, cylindrical:"0", add:"1.25", eye:"L" } */
const parseKey = (key) => {
  const parts = key.split("_");
  const sphIdx = parts.findIndex((p) => p === "sph");
  const cylIdx = parts.findIndex((p) => p === "cyl");
  const addIdx = parts.findIndex((p) => p === "add");
  const lastPart = parts[parts.length - 1];
  const eye = (lastPart === "L" || lastPart === "R") ? lastPart : null;
  return {
    spherical: sphIdx !== -1 ? parts[sphIdx + 1] : "0",
    cylindrical: cylIdx !== -1 ? parts[cylIdx + 1] : "0",
    add: addIdx !== -1 ? parts[addIdx + 1] : null,
    eye,
  };
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
  const [trayOptionsByLocation, setTrayOptionsByLocation] = useState({});
  const [loadingTrayLocations, setLoadingTrayLocations] = useState({});

  // rowSplits: { [rowKey]: [{ location_id, tray_id, qty }] }
  const [rowSplits, setRowSplits] = useState({});
  const [highlightedKey, setHighlightedKey] = useState(null);
  const [showSubmitWarnings, setShowSubmitWarnings] = useState(false);
  const rowRefs = useRef({});

  const scrollToRow = (key) => {
    setHighlightedKey(key);
    const el = rowRefs.current[key];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setTimeout(() => setHighlightedKey(null), 1200);
  };

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
      setTrayOptionsByLocation({});
      setLoadingTrayLocations({});
      setShowSubmitWarnings(false);
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to load data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [id, receiptId]);

  useEffect(() => { load(); }, [load]);

  // ── Derived computations ─────────────────────────────────────────────────

  const receivedItems = Array.isArray(receipt?.receivedItems) ? receipt.receivedItems : [];

  const rowsWithPending = receivedItems.map((ri) => {
    const k = ri.key || `sph_${ri.spherical}_cyl_${ri.cylindrical}`;
    const parsed = parseKey(k);
    const alreadyInwarded = inwardedByRow[`${ri.spherical ?? "0"}_${ri.cylindrical ?? "0"}`] || 0;
    const pending = Math.max(0, (parseFloat(ri.receivedQty) || 0) - alreadyInwarded);
    const splitsForRow = rowSplits[k] || [];
    const splitTotal = splitsForRow.reduce((s, sp) => s + (parseFloat(sp.qty) || 0), 0);
    return {
      ...ri,
      key: k,
      alreadyInwarded,
      pending,
      splitTotal,
      spherical: ri.spherical ?? parsed.spherical,
      cylindrical: ri.cylindrical ?? parsed.cylindrical,
      add: ri.add ?? parsed.add,
      eye: ri.eye ?? parsed.eye,
    };
  });

  const pendingRows = rowsWithPending.filter((r) => r.pending > 0);

  const isProgressive = rowsWithPending.some((r) => r.add !== null && r.add !== undefined);
  const hasEyeData = rowsWithPending.some((r) => r.eye);

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

  const resetSplit = (key, idx) => {
    setRowSplits((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((sp, i) => (i === idx ? emptyRow() : sp)),
    }));
  };

  const updateSplit = (key, idx, field, value) => {
    setRowSplits((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((sp, i) =>
        i === idx ? { ...sp, [field]: value, ...(field === "location_id" ? { tray_id: "" } : {}) } : sp
      ),
    }));
  };

  const loadTraysForLocation = useCallback(async (locationId) => {
    if (!locationId || trayOptionsByLocation[locationId]) return;

    try {
      setLoadingTrayLocations((prev) => ({ ...prev, [locationId]: true }));
      const response = await getTraysByLocation(locationId);
      if (response.success) {
        setTrayOptionsByLocation((prev) => ({
          ...prev,
          [locationId]: response.data || [],
        }));
      }
    } catch (error) {
      toast({
        title: "Tray load failed",
        description: error.message || "Failed to load trays for the selected location.",
        variant: "destructive",
      });
    } finally {
      setLoadingTrayLocations((prev) => ({ ...prev, [locationId]: false }));
    }
  }, [toast, trayOptionsByLocation]);

  const handleLocationChange = async (key, idx, value) => {
    const locationId = value ? String(value) : "";
    updateSplit(key, idx, "location_id", locationId);

    if (locationId) {
      await loadTraysForLocation(parseInt(locationId));
    }
  };

  const traysForLocation = (locationId) => {
    if (!locationId) return [];
    return trayOptionsByLocation[parseInt(locationId)] || [];
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
          description: `SPH ${fmtSph(row.spherical)} / ${isProgressive ? "ADD" : "CYL"} ${fmtSph(isProgressive ? row.add : row.cylindrical)}${row.eye ? ` (${row.eye})` : ""}: split total (${splitTotal}) exceeds pending (${row.pending})`,  
          variant: "destructive",
        });
        return false;
      }

      for (const sp of activeSplits) {
        if (!sp.location_id) {
          scrollToRow(row.key);
          toast({ title: "Location required", description: "Select a location for each split.", variant: "destructive" });
          return false;
        }

        if (!sp.tray_id) {
          scrollToRow(row.key);
          toast({
            title: "Tray required",
            description: "Select a tray after choosing the location for each split.",
            variant: "destructive",
          });
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
    setShowSubmitWarnings(true);
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
        setShowSubmitWarnings(false);
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
    <div className="flex flex-col h-full p-2 md:p-3 gap-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-primary" />
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

        {/* <Alert className="bg-primary/5 border-primary/20 flex-shrink-0">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Choose <span className="font-medium">Location</span>, then select the matching <span className="font-medium">Tray</span>, then enter <span className="font-medium">Qty</span>.
            Each split creates a separate inventory item. Total per row cannot exceed pending qty.
          </AlertDescription>
        </Alert> */}

      <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0 md:overflow-hidden">
        {/* ── Left: Receipt Summary + Lens Items ── */}
        <div className="md:w-[280px] flex-shrink-0 flex flex-col gap-3 md:h-full md:overflow-y-auto md:overflow-x-hidden">
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
              {po.category?.name && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lens Category</span>
                  <span className="text-right">{po.category.name}</span>
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

          {/* SPH/CYL Items list — click to scroll */}
          {rowsWithPending.length > 0 && (
            <Card>
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Lens Items ({rowsWithPending.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y max-h-72 overflow-y-auto">
                  {rowsWithPending.map((row) => {
                    const isPending = row.pending > 0;
                    const isActive = highlightedKey === row.key;
                    return (
                      <button
                        key={row.key}
                        type="button"
                        onClick={() => isPending ? scrollToRow(row.key) : undefined}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${isPending ? "hover:bg-muted/50 cursor-pointer" : "cursor-default"} ${isActive ? "bg-primary/10" : ""}`}
                      >
                        <span className={`font-mono text-[11px] ${!isPending ? "text-muted-foreground" : ""}`}>
                          {fmtSph(row.spherical)}
                          <span className="font-normal text-muted-foreground ml-1">
                            / {fmtSph(isProgressive ? row.add : row.cylindrical)}
                          </span>
                          {hasEyeData && row.eye && (
                            <span className="ml-1 font-semibold text-primary">{row.eye}</span>
                          )}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {row.alreadyInwarded > 0 && (
                            <span className="text-green-700 font-semibold text-[10px]">{row.alreadyInwarded}✓</span>
                          )}
                          {isPending ? (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 bg-orange-50 text-orange-600 border-orange-200">
                              {row.pending} pending
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-50 text-green-700 border-green-200">
                              Done ✓
                            </Badge>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* This batch summary */}
          {totalThisBatch > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-1 text-xs space-y-1">
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
        </div>

        {/* ── Right: Inward Grid ── */}
        <div className="flex flex-col gap-3 flex-1 min-w-0 md:h-full md:overflow-y-auto md:overflow-x-hidden pb-3">
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

                return (
                  <div
                    key={row.key}
                    ref={(el) => { if (el) rowRefs.current[row.key] = el; }}
                  >
                    <Card className={`transition-all ${isOver ? "border-destructive/50" : ""} ${highlightedKey === row.key ? "ring-2 ring-primary ring-offset-1" : ""}`}>
                      <CardHeader className="p-3 pb-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="font-semibold">SPH {fmtSph(row.spherical)}</span>
                            <span className="text-muted-foreground">
                              / {isProgressive ? "ADD" : "CYL"} {fmtSph(isProgressive ? row.add : row.cylindrical)}
                            </span>
                            {hasEyeData && row.eye && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 bg-blue-50 text-blue-700 border-blue-200">
                                {row.eye === "R" ? "Right Eye" : "Left Eye"}
                              </Badge>
                            )}
                            {row.alreadyInwarded > 0 && (
                              <Badge variant="outline" className="text-[10px] h-4 px-1 bg-green-50 text-green-700 border-green-200">
                                {row.alreadyInwarded} inwarded
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs shrink-0 flex items-center gap-1.5">
                            <span className="text-muted-foreground">Pending:</span>
                            <span className={`font-semibold ${isOver ? "text-destructive" : "text-orange-600"}`}>{row.pending}</span>
                            {splitTotal > 0 && (
                              <>
                                <span className="text-muted-foreground">· Entered:</span>
                                <span className={`font-semibold ${isOver ? "text-destructive" : "text-primary"}`}>{splitTotal}</span>
                              </>
                            )}
                            {isOver && <span className="text-destructive font-semibold">⚠ Exceeds</span>}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <table className="w-full text-xs">
                          {/* <thead>
                            <tr className="border-y bg-muted/40">
                              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground w-8">#</th>
                              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Location *</th>
                              <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Tray *</th>
                              <th className="px-3 py-1.5 text-center font-medium text-muted-foreground w-32">Qty (max {row.pending})</th>
                              <th className="px-2 py-1.5 w-16"></th>
                            </tr>
                          </thead> */}
                          <tbody>
                            {splits.map((split, splitIdx) => {
                              const availableTrays = traysForLocation(split.location_id);
                              const trayOptions = availableTrays.map((tray) => ({ value: tray.id, label: tray.name }));
                              const showTrayWarning = showSubmitWarnings && Boolean(split.location_id) && !split.tray_id;
                              const isTrayLoading = Boolean(split.location_id) && loadingTrayLocations[parseInt(split.location_id)];
                              return (
                                <tr
                                  key={splitIdx}
                                  className={`border-b last:border-0 hover:bg-muted/20 ${showTrayWarning ? "bg-amber-50/70" : ""}`}
                                >
                                  <td className="px-3 py-1.5 text-muted-foreground font-medium">{splitIdx + 1}</td>
                                  <td className="px-2 py-1.5">
                                    <FormSelect
                                      name={`location_${row.key}_${splitIdx}`}
                                      value={split.location_id || null}
                                      onChange={(value) => handleLocationChange(row.key, splitIdx, value)}
                                      options={locationOptions}
                                      placeholder="Select location"
                                      isSearchable={true}
                                      isClearable={false}
                                    />
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <FormSelect
                                      name={`tray_${row.key}_${splitIdx}`}
                                      value={split.tray_id || null}
                                      onChange={(value) => updateSplit(row.key, splitIdx, "tray_id", value ? String(value) : "")}
                                      options={trayOptions}
                                      placeholder={split.location_id ? (isTrayLoading ? "Loading trays..." : "Select tray") : "Select location first"}
                                      isClearable={false}
                                      disabled={!split.location_id || isTrayLoading}
                                    />
                                    {/* {showTrayWarning && (
                                      <p className="mt-1 text-[10px] font-medium text-amber-700">
                                        Tray selection is required for this row.
                                      </p>
                                    )} */}
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <input
                                      type="number"
                                      min="0.5"
                                      step="0.5"
                                      value={split.qty}
                                      onChange={(e) => updateSplit(row.key, splitIdx, "qty", e.target.value)}
                                      placeholder="0"
                                      className="w-full text-center border rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary border-input"
                                    />
                                  </td>
                                  <td className="px-1 py-1.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="xs"
                                        className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                                        onClick={() => resetSplit(row.key, splitIdx)}
                                        title="Reset row"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="xs"
                                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                        onClick={() => removeSplit(row.key, splitIdx)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <div className="px-3 py-2 border-t">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            className="h-7 text-xs gap-1 text-primary hover:bg-primary/5"
                            onClick={() => addSplit(row.key)}
                          >
                            <Plus className="h-3.5 w-3.5" /> Add Split
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
