import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, Save, Package, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPurchaseOrderById, getPOReceipts, receivePurchaseOrder } from "@/services/purchaseOrder";
import { getStatusColor, getStatusLabel } from "./PurchaseOrder.constants";

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Parse "sph_-2_cyl_0.25" → { spherical: "-2", cylindrical: "0.25" } */
const parseKey = (key) => {
  const parts = key.split("_");
  const sphIdx = parts.findIndex((p) => p === "sph");
  const cylIdx = parts.findIndex((p) => p === "cyl");
  return {
    spherical: sphIdx !== -1 ? parts[sphIdx + 1] : "0",
    cylindrical: cylIdx !== -1 ? parts[cylIdx + 1] : "0",
  };
};

/** Build rows from lensBulkSelection.selections + past receipts cumulative map */
const buildRows = (lensBulkSelection, cumulativeMap, unitPrice) => {
  if (!lensBulkSelection?.selections) return [];
  return Object.entries(lensBulkSelection.selections)
    .filter(([, val]) => {
      const qty = typeof val === "object" ? val.quantity : val;
      return parseInt(qty) > 0;
    })
    .map(([key, val]) => {
      const orderedQty = typeof val === "object" ? parseInt(val.quantity) || 0 : parseInt(val) || 0;
      const itemUnitPrice =
        typeof val === "object" && val.unitPrice ? parseFloat(val.unitPrice) : parseFloat(unitPrice) || 0;
      const alreadyReceived = cumulativeMap[key] || 0;
      const remaining = Math.max(0, orderedQty - alreadyReceived);
      const { spherical, cylindrical } = parseKey(key);
      return { key, spherical, cylindrical, orderedQty, alreadyReceived, remaining, unitPrice: itemUnitPrice, receivedQty: "" };
    });
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function PurchaseOrderReceive() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();

  const [po, setPo] = useState(null);
  const [receiptsData, setReceiptsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxType, setTaxType] = useState("Amount"); // "Amount" | "Percent"
  const [taxAmount, setTaxAmount] = useState("");
  const [taxPercentage, setTaxPercentage] = useState("");

  // Rows: one per SPH/CYL combination (bulk) or single row (single PO)
  const [rows, setRows] = useState([]);

  // ── Load PO + receipts ────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [poRes, rcpRes] = await Promise.all([
          getPurchaseOrderById(parseInt(id)),
          getPOReceipts(parseInt(id)),
        ]);

        if (!poRes.success) throw new Error("PO not found");

        const poData = poRes.data;
        const rcpData = rcpRes.success ? rcpRes.data : { receipts: [], totalReceivedQty: 0, orderedQty: poData.quantity };
        setPo(poData);
        setReceiptsData(rcpData);
        // Pre-fill pricing from PO
        if (poData.unitPrice) setUnitPrice(poData.unitPrice);
        if (poData.taxAmount && parseFloat(poData.taxAmount) > 0) setTaxAmount(poData.taxAmount);

        // Build cumulative received qty per key from past receipts
        const cumulativeMap = {};
        (rcpData.receipts || []).forEach((receipt) => {
          (receipt.receivedItems || []).forEach((item) => {
            if (item.key) {
              cumulativeMap[item.key] = (cumulativeMap[item.key] || 0) + (parseFloat(item.receivedQty) || 0);
            }
          });
        });

        if (poData.orderType === "Bulk" && poData.lensBulkSelection) {
          // API returns array format; convert to selections-map expected by buildRows
          let bulkSelectionForRows = poData.lensBulkSelection;
          if (Array.isArray(poData.lensBulkSelection)) {
            const selections = {};
            poData.lensBulkSelection.forEach((item) => {
              const key = `sph_${item.spherical}_cyl_${item.cylindrical}`;
              selections[key] = { quantity: item.quantity, unitPrice: item.unitPrice };
            });
            bulkSelectionForRows = { selections };
          }
          setRows(buildRows(bulkSelectionForRows, cumulativeMap, poData.unitPrice));
        } else {
          // Single PO — one row
          const alreadyReceived = rcpData.totalReceivedQty || 0;
          setRows([{
            key: "single",
            spherical: poData.rightSpherical || poData.leftSpherical || "-",
            cylindrical: poData.rightCylindrical || poData.leftCylindrical || "-",
            orderedQty: poData.quantity || 1,
            alreadyReceived,
            remaining: Math.max(0, (poData.quantity || 1) - alreadyReceived),
            unitPrice: poData.unitPrice || 0,
            receivedQty: "",
          }]);
        }
      } catch (err) {
        toast({ title: "Error", description: err.message || "Failed to load PO", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id]);

  // ── Row change handler ────────────────────────────────────────────────
  const handleRowChange = (index, field, value) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  // ── Derived totals ────────────────────────────────────────────────────
  const { totalThisQty, subtotal, taxValue, totalValue } = useMemo(() => {
    const totalThisQty = rows.reduce((s, r) => s + (parseFloat(r.receivedQty) || 0), 0);
    const up = parseFloat(unitPrice) || 0;
    const subtotal = totalThisQty * up;
    const taxValue = taxType === "Percent"
      ? (subtotal * (parseFloat(taxPercentage) || 0)) / 100
      : (parseFloat(taxAmount) || 0);
    const totalValue = subtotal + taxValue;
    return { totalThisQty, subtotal, taxValue, totalValue };
  }, [rows, unitPrice, taxType, taxAmount, taxPercentage]);

  // ── Validation ────────────────────────────────────────────────────────
  const validate = () => {
    if (totalThisQty <= 0) {
      toast({ title: "Validation", description: "Enter at least one received quantity.", variant: "destructive" });
      return false;
    }    const up = parseFloat(unitPrice) || 0;
    if (up > 0 && taxValue <= 0) {
      toast({ title: "Validation", description: "GST / Tax is required when unit price is entered.", variant: "destructive" });
      return false;
    }    for (const row of rows) {
      const qty = parseFloat(row.receivedQty) || 0;
      if (qty < 0) {
        toast({ title: "Validation", description: "Received qty cannot be negative.", variant: "destructive" });
        return false;
      }
      if (qty > row.remaining && row.remaining >= 0) {
        toast({
          title: "Validation",
          description: `SPH ${row.spherical} / CYL ${row.cylindrical}: received qty (${qty}) exceeds remaining (${row.remaining}).`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;

    const up = parseFloat(unitPrice) || 0;
    const computedTaxAmount = taxType === "Percent"
      ? ((subtotal * (parseFloat(taxPercentage) || 0)) / 100)
      : (parseFloat(taxAmount) || 0);

    const receivedItems = rows
      .filter((r) => parseFloat(r.receivedQty) > 0)
      .map((r) => ({
        key: r.key,
        spherical: r.spherical,
        cylindrical: r.cylindrical,
        orderedQty: r.orderedQty,
        receivedQty: parseFloat(r.receivedQty) || 0,
        unitPrice: up,
      }));

    try {
      setIsSaving(true);
      const res = await receivePurchaseOrder(parseInt(id), {
        receivedDate,
        receivedItems,
        notes,
        unitPrice: up,
        taxAmount: computedTaxAmount,
        subtotal,
        totalValue,
      });

      if (res.success) {
        toast({ title: "Success", description: `Receipt ${res.data.receipt.receiptNumber} created. PO status: ${res.data.poStatus}` });
        window.close();
      } else {
        throw new Error(res.message || "Failed to save receipt");
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full">
        <div className="flex flex-col items-center gap-3 ">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading purchase order...</p>
        </div>
      </div>
    );
  }

  if (!po) return null;

  const isLocked = ["RECEIVED", "INVOICE_RECEIVED", "CLOSED", "CANCELLED"].includes(po.status);
  const statusColor = getStatusColor(po.status);
  const alreadyReceived = receiptsData?.totalReceivedQty || 0;
  const orderedQty = po.quantity || 0;
  const pendingQty = Math.max(0, orderedQty - alreadyReceived);

  return (
    <div className="flex flex-col h-full p-2 md:p-3 gap-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">Receive Purchase Order</h1>
          <p className="text-xs text-muted-foreground">
            Record goods received against {po.poNumber}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="xs" className="h-8 gap-1.5" onClick={() => window.close()}>
            <ArrowLeft className="h-3.5 w-3.5" /> Close
          </Button>
          <Button
            size="xs"
            className="h-8 gap-1.5"
            onClick={handleSave}
            disabled={isSaving || isLocked || totalThisQty <= 0}
          >
            {isSaving ? (
              <><span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> Saving...</>
            ) : (
              <><Save className="h-3.5 w-3.5" /> Save Receipt</>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0">
        {/* ── Left: PO Summary + Receipt meta ── */}
        <div className="md:w-[30%] flex flex-col gap-3 md:h-full md:overflow-y-auto md:overflow-x-hidden">
          {/* PO Info */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">PO Summary</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">PO Number</span>
                <span className="font-semibold">{po.poNumber}</span>
              </div>
              {po.reference_id && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Reference</span>
                  <span>{po.reference_id}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Vendor</span>
                <span className="font-medium">{po.vendor?.name || "-"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Order Type</span>
                <Badge variant="outline" className="text-xs h-5">{po.orderType}</Badge>
              </div>
              {po.lensProduct?.lens_name && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Lens</span>
                  <span className="text-right max-w-[60%] truncate">{po.lensProduct.lens_name}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={`${statusColor} text-xs h-5`}>{getStatusLabel(po.status)}</Badge>
              </div>
              <div className="border-t pt-2 mt-1 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> Ordered</span>
                  <span className="font-semibold">{orderedQty}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-500" /> Received</span>
                  <span className="font-semibold text-green-600">{alreadyReceived}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3 text-orange-400" /> Pending</span>
                  <span className="font-semibold text-orange-600">{pendingQty}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Receipt Details */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">Receipt Details</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-3">
              <FormInput
                label="Received Date"
                name="receivedDate"
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                required
                singleLine
              />
              <FormInput
                label="Notes (Optional)"
                name="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Partial shipment from vendor"
                singleLine
              />
            </CardContent>
          </Card>

          {/* This receipt totals */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">This Receipt</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Qty receiving</span>
                <span className="font-bold text-sm text-primary">{totalThisQty}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t">
                <span className="text-muted-foreground">After this receipt</span>
                <span className={`font-semibold ${alreadyReceived + totalThisQty >= orderedQty ? "text-green-600" : "text-orange-600"}`}>
                  {alreadyReceived + totalThisQty >= orderedQty
                    ? "Fully Received ✓"
                    : `${pendingQty - totalThisQty} still pending`}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Details — editable */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">Pricing Details</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2.5">
              <FormInput
                label="Unit Price (Optional)"
                name="unitPrice"
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                disabled={isLocked}
                prefix="₹"
                singleLine
              />

              {/* Tax toggle */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">GST / Tax {parseFloat(unitPrice) > 0 && <span className="text-destructive">*</span>}</Label>
                  <div className="flex rounded-md border overflow-hidden text-xs">
                    <button
                      type="button"
                      onClick={() => !isLocked && setTaxType("Amount")}
                      className={`px-2 py-0.5 transition-colors ${
                        taxType === "Amount" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >₹ Amount</button>
                    <button
                      type="button"
                      onClick={() => !isLocked && setTaxType("Percent")}
                      className={`px-2 py-0.5 transition-colors ${
                        taxType === "Percent" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
                      }`}
                    >% Rate</button>
                  </div>
                </div>
                {taxType === "Percent" ? (
                  <FormInput
                    name="taxPercentage"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxPercentage}
                    onChange={(e) => setTaxPercentage(e.target.value)}
                    disabled={isLocked}
                    suffix="%"
                  />
                ) : (
                  <FormInput
                    name="taxAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(e.target.value)}
                    disabled={isLocked}
                    prefix="₹"
                  />
                )}
              </div>

              {/* Computed summary — always visible */}
              <div className="border-t pt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Subtotal{totalThisQty > 0 && parseFloat(unitPrice) > 0 ? ` (${totalThisQty} × ₹${unitPrice})` : ""}
                  </span>
                  <span>₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>₹{taxValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-1">
                  <span>Total Value</span>
                  <span className="text-primary">₹{totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Invoice Details */}
          {(po.supplierInvoiceNo || po.purchaseType || po.placeOfSupply || po.itemDescription) && (
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">Supplier Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-1.5 text-xs">
                {po.supplierInvoiceNo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice No</span>
                    <span className="font-medium">{po.supplierInvoiceNo}</span>
                  </div>
                )}
                {po.purchaseType && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Purchase Type</span>
                    <span>{po.purchaseType}</span>
                  </div>
                )}
                {po.placeOfSupply && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Place of Supply</span>
                    <span>{po.placeOfSupply}</span>
                  </div>
                )}
                {po.itemDescription && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground">Item Description</span>
                    <span className="text-foreground">{po.itemDescription}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Alert if already fully received */}
          {isLocked && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-3 text-xs text-destructive">
                {po.status === "RECEIVED" ? "This PO has already been fully received."
                  : po.status === "INVOICE_RECEIVED" ? "Invoice has been received for this PO. No further receiving allowed."
                  : po.status === "CLOSED" ? "This PO is closed."
                  : "This PO has been cancelled and cannot be received."}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right: Receive Grid + Receipt History ── */}
        <div className="md:w-[70%] flex flex-col gap-3 md:h-full md:overflow-auto pb-3">
          {/* Receive Quantities Grid */}
          <Card>
            <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm">
                {po.orderType === "Bulk" ? "Lens Combinations — Enter Received Quantities" : "Receive Quantities"}
              </CardTitle>
              <span className="text-xs text-muted-foreground">{rows.length} item{rows.length !== 1 ? "s" : ""}</span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {po.orderType === "Bulk" && (
                        <>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">SPH</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">CYL</th>
                        </>
                      )}
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">PO Qty</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Received</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Remaining</th>
                      <th className="px-3 py-2 text-center font-medium text-primary min-w-[110px]">Receiving Qty ↓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const qty = parseFloat(row.receivedQty) || 0;

                      const overReceive = qty > row.remaining && row.remaining >= 0;
                      return (
                        <tr key={row.key} className={`border-b hover:bg-muted/30 ${overReceive ? "bg-destructive/5" : ""}`}>
                          {po.orderType === "Bulk" && (
                            <>
                              <td className="px-3 py-2 font-medium">{row.spherical}</td>
                              <td className="px-3 py-2">{row.cylindrical}</td>
                            </>
                          )}
                          <td className="px-3 py-2 text-right">{row.orderedQty}</td>
                          <td className="px-3 py-2 text-right text-green-600">{row.alreadyReceived}</td>
                          <td className={`px-3 py-2 text-right font-medium ${row.remaining === 0 ? "text-muted-foreground line-through" : "text-orange-600"}`}>
                            {row.remaining}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <input
                              type="number"
                              min="0"
                              max={row.remaining >= 0 ? row.remaining : undefined}
                              step="1"
                              value={row.receivedQty}
                              onChange={(e) => handleRowChange(idx, "receivedQty", e.target.value)}
                              placeholder="0"
                              className={`w-20 text-center border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary ${
                                overReceive ? "border-destructive focus:ring-destructive" : "border-input"
                              }`}
                              disabled={row.remaining === 0 || isLocked}
                            />
                            {overReceive && <p className="text-destructive text-[10px] mt-0.5">Exceeds remaining</p>}
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={po.orderType === "Bulk" ? 6 : 4} className="px-3 py-8 text-center text-muted-foreground">
                          No items to receive
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot>
                      <tr className="bg-muted/50 font-semibold border-t">
                        {po.orderType === "Bulk" && <td colSpan={2} />}
                        <td className="px-3 py-2 text-right">{orderedQty}</td>
                        <td className="px-3 py-2 text-right text-green-600">{alreadyReceived}</td>
                        <td className="px-3 py-2 text-right text-orange-600">{pendingQty}</td>
                        <td className="px-3 py-2 text-center text-primary">{totalThisQty}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Receipt History */}
          {receiptsData?.receipts?.length > 0 && (
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">Receipt History ({receiptsData.receipts.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Receipt #</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Qty Received</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Value (₹)</th>
                        <th className="px-3 py-2 text-center font-medium text-muted-foreground">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">Notes</th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {receiptsData.receipts.map((receipt) => (
                        <tr key={receipt.id} className="border-b hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium text-primary">{receipt.receiptNumber}</td>
                          <td className="px-3 py-2">{new Date(receipt.receivedDate).toLocaleDateString("en-IN")}</td>
                          <td className="px-3 py-2 text-right font-semibold">{receipt.totalReceivedQty}</td>
                          <td className="px-3 py-2 text-right">
                            ₹{(receipt.totalValue || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-4 px-1 ${
                                receipt.status === "COMPLETE"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {receipt.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{receipt.notes || "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">{receipt.createdByUser?.name || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
