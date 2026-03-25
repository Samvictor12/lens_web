import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Package, CheckCircle2, Clock, ChevronDown, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getPurchaseOrderById, getPOReceipts, receivePurchaseOrder, updatePOReceipt, getPOReceiptLogs } from "@/services/purchaseOrder";
import { FormSelect } from "@/components/ui/form-select";
import { getStatusColor, getStatusLabel } from "./PurchaseOrder.constants";

// ─── Helpers ───────────────────────────────────────────────────────────────

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

/** Build rows from lensBulkSelection.selections + past receipts cumulative map */
const buildRows = (lensBulkSelection, cumulativeMap, unitPrice) => {
  if (!lensBulkSelection?.selections) return [];
  return Object.entries(lensBulkSelection.selections)
    .filter(([, val]) => {
      // per-eye: { L: N } or { R: N } — sum values; otherwise use .quantity
      if (typeof val === "object" && val !== null && val.quantity == null) {
        return Object.values(val).reduce((s, v) => s + (parseInt(v) || 0), 0) > 0;
      }
      const qty = typeof val === "object" ? val.quantity : val;
      return parseInt(qty) > 0;
    })
    .map(([key, val]) => {
      // orderedQty: handle per-eye { L: N } format as well as { quantity: N } and plain number
      const orderedQty = typeof val === "object" && val !== null
        ? (val.quantity != null
            ? parseInt(val.quantity) || 0
            : Object.values(val).reduce((s, v) => s + (parseInt(v) || 0), 0))
        : parseInt(val) || 0;
      const itemUnitPrice =
        typeof val === "object" && val?.unitPrice ? parseFloat(val.unitPrice) : parseFloat(unitPrice) || 0;
      const alreadyReceived = cumulativeMap[key] || 0;
      const remaining = Math.max(0, orderedQty - alreadyReceived);
      const { spherical, cylindrical, add, eye } = parseKey(key);
      return { key, spherical, cylindrical, add, eye, orderedQty, alreadyReceived, remaining, unitPrice: itemUnitPrice, receivedQty: "" };
    });
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function PurchaseOrderReceive() {
  const navigate = useNavigate();
  const { id, receiptId } = useParams();
  const isEditMode = Boolean(receiptId);
  const { toast } = useToast();
  const { user } = useAuth();

  const [po, setPo] = useState(null);
  const [poVendor, setPoVendor] = useState(null);
  const [receiptsData, setReceiptsData] = useState(null);
  const [openReceipts, setOpenReceipts] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxType, setTaxType] = useState("Amount"); // "Amount" | "Percent"
  const [taxAmount, setTaxAmount] = useState("");
  const [taxPercentage, setTaxPercentage] = useState("");

  // Supplier invoice + delivery state
  const [actualDeliveryDate, setActualDeliveryDate] = useState("");
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState("");
  const [purchaseType, setPurchaseType] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("");
  const [itemDescription, setItemDescription] = useState("");

  // Purchase type options (can be moved to constants if needed)
  const purchaseTypeOptions = [
    { value: "Local", label: "Local" },
    { value: "Interstate", label: "Interstate" },
  ];

  // Rows: one per SPH/CYL combination (bulk) or single row (single PO)
  const [rows, setRows] = useState([]);

  const [receiptLogs, setReceiptLogs] = useState([]);

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
        setPlaceOfSupply(`${poData.vendor?.city || ""} - ${poData.vendor?.state || ""}`);
        setPoVendor(poData.vendor);
        setReceiptsData(rcpData);
        // Pre-fill pricing from PO
        if (poData.unitPrice) setUnitPrice(poData.unitPrice);
        if (poData.taxAmount && parseFloat(poData.taxAmount) > 0) setTaxAmount(poData.taxAmount);
        if (poData.supplierInvoiceNo) setSupplierInvoiceNo(poData.supplierInvoiceNo);
        if (poData.purchaseType) setPurchaseType(poData.purchaseType);
        if (poData.placeOfSupply) setPlaceOfSupply(poData.placeOfSupply);
        if (poData.itemDescription) setItemDescription(poData.itemDescription);

        // Build cumulative received qty per key from past receipts
        // In edit mode, exclude the receipt being edited so rows show correct remaining
        const editReceiptId = receiptId ? parseInt(receiptId) : null;
        const editReceipt = editReceiptId
          ? (rcpData.receipts || []).find((r) => r.id === editReceiptId)
          : null;

        // Pre-fill receipt-level fields when editing
        if (isEditMode && editReceipt) {
          if (editReceipt.receivedDate)
            setReceivedDate(editReceipt.receivedDate.split("T")[0]);
          if (editReceipt.actualDeliveryDate)
            setActualDeliveryDate(editReceipt.actualDeliveryDate.split("T")[0]);
          if (editReceipt.notes) setNotes(editReceipt.notes);
          if (editReceipt.unitPrice) setUnitPrice(String(editReceipt.unitPrice));
          if (editReceipt.taxAmount && parseFloat(editReceipt.taxAmount) > 0)
            setTaxAmount(String(editReceipt.taxAmount));
          if (editReceipt.supplierInvoiceNo) setSupplierInvoiceNo(editReceipt.supplierInvoiceNo);
          if (editReceipt.purchaseType) setPurchaseType(editReceipt.purchaseType);
          if (editReceipt.placeOfSupply) setPlaceOfSupply(editReceipt.placeOfSupply);
          if (editReceipt.itemDescription) setItemDescription(editReceipt.itemDescription);
        }

        const cumulativeMap = {};
        (rcpData.receipts || []).forEach((receipt) => {
          // Exclude the receipt being edited so remaining qty is recalculated correctly
          if (isEditMode && receipt.id === editReceiptId) return;
          (receipt.receivedItems || []).forEach((item) => {
            if (item.key) {
              cumulativeMap[item.key] = (cumulativeMap[item.key] || 0) + (parseFloat(item.receivedQty) || 0);
            }
          });
        });

        if (poData.lensBulkSelection) {
          // API returns array format; convert to selections-map expected by buildRows
          let bulkSelectionForRows = poData.lensBulkSelection;
          if (Array.isArray(poData.lensBulkSelection)) {
            const selections = {};
            poData.lensBulkSelection.forEach((item) => {
              // Progressive items have `add`; Single/Bifocal use `cylindrical`
              const colPart = (item.add != null) ? `add_${item.add}` : `cyl_${item.cylindrical}`;
              const eyePart = item.eye ? `_${item.eye}` : "";
              const key = `sph_${item.spherical}_${colPart}${eyePart}`;
              if (item.eye) {
                if (!selections[key]) selections[key] = {};
                selections[key][item.eye] = item.quantity;
              } else {
                selections[key] = { quantity: item.quantity, unitPrice: item.unitPrice };
              }
            });
            bulkSelectionForRows = { selections };
          }
          const builtRows = buildRows(bulkSelectionForRows, cumulativeMap, poData.unitPrice);
          // In edit mode, pre-fill receivedQty from the existing receipt's items
          if (isEditMode && editReceipt?.receivedItems) {
            const editItemMap = {};
            editReceipt.receivedItems.forEach((item) => {
              if (item.key) editItemMap[item.key] = item.receivedQty;
            });
            builtRows.forEach((row) => {
              if (editItemMap[row.key] !== undefined)
                row.receivedQty = String(editItemMap[row.key]);
            });
          }
          setRows(builtRows);
        } else {
          // Single PO — one row
          const alreadyReceived = isEditMode
            ? (rcpData.totalReceivedQty || 0) - (editReceipt?.totalReceivedQty || 0)
            : rcpData.totalReceivedQty || 0;
          const preFillQty = isEditMode && editReceipt ? String(editReceipt.totalReceivedQty) : "";
          setRows([{
            key: "single",
            spherical: poData.rightSpherical || poData.leftSpherical || "-",
            cylindrical: poData.rightCylindrical || poData.leftCylindrical || "-",
            orderedQty: poData.quantity || 1,
            alreadyReceived,
            remaining: Math.max(0, (poData.quantity || 1) - alreadyReceived),
            unitPrice: poData.unitPrice || 0,
            receivedQty: preFillQty,
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
    }
    if (!actualDeliveryDate) {
      toast({ title: "Validation", description: "Actual Delivery Date is required.", variant: "destructive" });
      return false;
    }
    const up = parseFloat(unitPrice) || 0;
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
      .map((r) => {
        const item = {
          key: r.key,
          spherical: r.spherical,
          cylindrical: r.cylindrical,
          orderedQty: r.orderedQty,
          receivedQty: parseFloat(r.receivedQty) || 0,
          unitPrice: up,
        };
        if (r.add !== null && r.add !== undefined) item.add = parseFloat(r.add);
        if (r.eye) item.eye = r.eye;
        return item;
      });

    try {
      setIsSaving(true);
      const payload = {
        receivedDate,
        actualDeliveryDate,
        receivedItems,
        notes,
        unitPrice: up,
        taxAmount: computedTaxAmount,
        subtotal,
        totalValue,
        supplierInvoiceNo,
        purchaseType,
        placeOfSupply,
        itemDescription,
      };

      const res = isEditMode
        ? await updatePOReceipt(parseInt(id), parseInt(receiptId), payload)
        : await receivePurchaseOrder(parseInt(id), payload);

      if (res.success) {
        const desc = isEditMode
          ? `Receipt updated. PO status: ${res.data.poStatus}`
          : `Receipt ${res.data.receipt.receiptNumber} created. PO status: ${res.data.poStatus}`;
        toast({ title: "Success", description: desc });
        const nextReceiptId = isEditMode ? parseInt(receiptId) : res.data.receipt?.id;

        if (nextReceiptId) {
          navigate(`/masters/purchase-orders/receive/${id}/edit/${nextReceiptId}`, {
            replace: true,
          });
        } else {
          navigate("/masters/purchase-orders", { replace: true });
        }
      } else {
        throw new Error(res.message || "Failed to save receipt");
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Load receipt logs for this PO
  useEffect(() => {
    async function fetchLogs() {
      if (!id) return;
      try {
        const res = await getPOReceiptLogs(id);
        if (res.success) setReceiptLogs(res.data);
        else setReceiptLogs([]);
      } catch (e) {
        setReceiptLogs([]);
      }
    }
    fetchLogs();
  }, [id]);

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

  const statusColor = getStatusColor(po.status);
  const alreadyReceived = receiptsData?.totalReceivedQty || 0;
  const orderedQty = po.quantity || 0;
  const pendingQty = Math.max(0, orderedQty - alreadyReceived);

  // In edit mode, unlock RECEIVED status so fields can be edited
  // Locked when fully received or in terminal status (RECEIVED is still editable/receivable if pendingQty > 0)
  const isLocked = ["INVOICE_RECEIVED", "CLOSED", "CANCELLED"].includes(po.status)
    || (!isEditMode && pendingQty <= 0);

  // The specific receipt being edited (needed for inward-warning check)
  const editingReceipt = isEditMode && receiptId && receiptsData?.receipts
    ? receiptsData.receipts.find(r => r.id === parseInt(receiptId))
    : null;

  const isStockPO = po.lensType?.name === "STOCK";

  return (
    <div className="flex flex-col h-full p-2 md:p-3 gap-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold">
            {isEditMode ? "Edit Receipt" : "Receive Purchase Order"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {isEditMode ? `Editing receipt for ${po.poNumber}` : `Record goods received against ${po.poNumber}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-8 gap-1.5"
            onClick={() => navigate("/masters/purchase-orders")}
          >
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
              <><Save className="h-3.5 w-3.5" /> {isEditMode ? "Update Receipt" : "Save Receipt"}</>
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0">
        {/* ── Left: PO Summary + Receipt meta ── */}
        <div className="md:w-[35%] flex flex-col gap-3 md:h-full md:overflow-y-auto md:overflow-x-hidden">
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
                <span className="font-medium">{poVendor?.name || "-"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Order Type</span>
                <Badge variant="outline" className="text-xs h-5">{po.orderType}</Badge>
              </div>
              {po.category?.name && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Category</span>
                  <span className="text-right max-w-[60%] truncate">{po.category.name}</span>
                </div>
              )}
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
                label="Actual Delivery Date"
                name="actualDeliveryDate"
                type="date"
                value={actualDeliveryDate}
                onChange={(e) => setActualDeliveryDate(e.target.value)}
                disabled={isLocked}
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

          {/* Supplier Invoice Details — editable on receive, styled like PurchaseOrderForm */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">Supplier Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-4">
              {/* Vendor Name (read-only) */}
              {po?.vendor?.name && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground min-w-[60px] w-[100px]">Vendor</span>
                  <span className="font-medium text-blue-700">{poVendor?.name}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormInput
                  label="Supplier Invoice No (Optional)"
                  name="supplierInvoiceNo"
                  value={supplierInvoiceNo}
                  onChange={(e) => setSupplierInvoiceNo(e.target.value)}
                  disabled={isLocked}
                  placeholder="e.g., BL080984-25/26"
                />
                <FormSelect
                  label="Purchase Type (Optional)"
                  name="purchaseType"
                  options={purchaseTypeOptions}
                  value={purchaseType}
                  onChange={(val) => setPurchaseType(val)}
                  placeholder="Select purchase type"
                  isSearchable={false}
                  isClearable={true}
                  disabled={isLocked}
                />
              </div>
              <FormInput
                label="Place of Supply (Optional)"
                name="placeOfSupply"
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                disabled={isLocked}
                placeholder={poVendor?.city || poVendor?.state ? `e.g., ${poVendor.city || ""}${poVendor.city && poVendor.state ? ", " : ""}${poVendor.state || ""}` : "e.g., Maharashtra"}
              />
              <FormInput
                label="Item Description (Optional)"
                name="itemDescription"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                disabled={isLocked}
                placeholder="Item or service description"
              />
            </CardContent>
          </Card>
          {/* Warning: editing a receipt that has already been partially/fully inwarded to inventory */}
          {isEditMode && editingReceipt && (editingReceipt.inwardedQty || 0) > 0 && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-3 flex items-start gap-2 text-xs text-amber-800">
                <Warehouse className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Caution:</strong> {editingReceipt.inwardedQty} of {editingReceipt.totalReceivedQty} units from this receipt have already been pushed to inventory.
                  Editing received quantities may create discrepancies with existing stock.
                </span>
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
        <div className="md:w-[65%] flex flex-col gap-3 md:h-full md:overflow-auto pb-3">
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
                    {(() => {
                      const isProgressive = rows.some(r => r.add !== null && r.add !== undefined);
                      const hasEyeData = rows.some(r => r.eye);
                      return (
                      <tr className="border-b bg-muted/50">
                        {po.orderType === "Bulk" && (
                          <>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">SPH</th>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground">{isProgressive ? "ADD" : "CYL"}</th>
                            {hasEyeData && <th className="px-3 py-2 text-left font-medium text-muted-foreground">Eye</th>}
                          </>
                        )}
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">PO Qty</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Received</th>
                        <th className="px-3 py-2 text-right font-medium text-muted-foreground">Remaining</th>
                        <th className="px-3 py-2 text-center font-medium text-primary min-w-[110px]">Receiving Qty ↓</th>
                      </tr>
                      );
                    })()}
                  </thead>
                  <tbody>
                    {(() => {
                      const isProgressive = rows.some(r => r.add !== null && r.add !== undefined);
                      const hasEyeData = rows.some(r => r.eye);
                      return rows.map((row, idx) => {
                      const qty = parseFloat(row.receivedQty) || 0;

                      const overReceive = qty > row.remaining && row.remaining >= 0;
                      return (
                        <tr key={row.key} className={`border-b hover:bg-muted/30 ${overReceive ? "bg-destructive/5" : ""}`}>
                          {po.orderType === "Bulk" && (
                            <>
                              <td className="px-3 py-2 font-medium">{row.spherical}</td>
                              <td className="px-3 py-2">{isProgressive ? row.add : row.cylindrical}</td>
                              {hasEyeData && <td className="px-3 py-2">{row.eye || "-"}</td>}
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
                    });
                    })()}
                    {rows.length === 0 && (() => {
                      const hasEyeData = rows.some(r => r.eye);
                      const bulkCols = po.orderType === "Bulk" ? (2 + (hasEyeData ? 1 : 0)) : 0;
                      return (
                      <tr>
                        <td colSpan={bulkCols + 4} className="px-3 py-8 text-center text-muted-foreground">
                          No items to receive
                        </td>
                      </tr>
                      );
                    })()}
                  </tbody>
                  {rows.length > 0 && (() => {
                    const hasEyeData = rows.some(r => r.eye);
                    const bulkCols = po.orderType === "Bulk" ? (2 + (hasEyeData ? 1 : 0)) : 0;
                    return (
                    <tfoot>
                      <tr className="bg-muted/50 font-semibold border-t">
                        {po.orderType === "Bulk" && <td colSpan={2 + (hasEyeData ? 1 : 0)} />}
                        <td className="px-3 py-2 text-right">{orderedQty}</td>
                        <td className="px-3 py-2 text-right text-green-600">{alreadyReceived}</td>
                        <td className="px-3 py-2 text-right text-orange-600">{pendingQty}</td>
                        <td className="px-3 py-2 text-center text-primary">{totalThisQty}</td>
                      </tr>
                    </tfoot>
                    );
                  })()}
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Receipts — Inventory Inward (only for STOCK-type POs) */}
          {isStockPO && receiptsData?.receipts?.length > 0 && (
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Warehouse className="h-3.5 w-3.5 text-primary" />
                  Inventory Inward
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {receiptsData.receipts.map((receipt) => {
                    const inwarded = receipt.inwardedQty || 0;
                    const pending = Math.max(0, receipt.totalReceivedQty - inwarded);
                    const fullyInwarded = pending === 0 && inwarded > 0;
                    return (
                      <div key={receipt.id} className="flex items-center gap-2 px-3 py-2.5 text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-primary">{receipt.receiptNumber}</span>
                          <span className="text-muted-foreground ml-2">
                            Received: <span className="font-medium text-foreground">{receipt.totalReceivedQty}</span>
                            {" · "}
                            Inwarded: <span className={`font-medium ${inwarded > 0 ? "text-green-700" : "text-foreground"}`}>{inwarded}</span>
                            {pending > 0 && (
                              <span className="text-orange-600"> · Pending: {pending}</span>
                            )}
                          </span>
                        </div>
                        {fullyInwarded ? (
                          <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-green-50 text-green-700 border-green-200 flex-shrink-0">
                            <CheckCircle2 className="h-3 w-3 mr-0.5" /> Inwarded
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            size="xs"
                            variant="outline"
                            className="h-6 px-2 text-[11px] gap-1 flex-shrink-0 border-primary/50 text-primary hover:bg-primary/5"
                            onClick={() => navigate(`/masters/purchase-orders/receive/${id}/inward/${receipt.id}`)}
                          >
                            <Warehouse className="h-3 w-3" /> Push to Inventory
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Receipt History */}
          {receiptLogs.length > 0 && (
            <Card>
              <CardHeader className="p-3 pb-2">
                <CardTitle className="text-sm">Receipt History ({receiptLogs.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {receiptLogs.map((log) => {
                    const isOpen = openReceipts.has(log.id);
                    const items = Array.isArray(log.receivedItems) ? log.receivedItems : [];
                    const isBulk = items.length > 0 && items[0].spherical != null;
                    return (
                      <div key={log.id}>
                        {/* Accordion Header */}
                        <button
                          type="button"
                          onClick={() => setOpenReceipts(prev => {
                            const next = new Set(prev);
                            isOpen ? next.delete(log.id) : next.add(log.id);
                            return next;
                          })}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-muted/40 transition-colors text-left"
                        >
                          <ChevronDown
                            className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                          <span className="font-semibold text-primary min-w-[70px]">{log.receiptNumber}</span>
                          <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleDateString("en-IN")}</span>
                          <span className="ml-auto flex items-center gap-3">
                            <span className="font-semibold">{log.totalReceivedQty} pcs</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] h-4 px-1.5 ${
                                log.status === "COMPLETE"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {log.status || "LOG"}
                            </Badge>
                            <span className="text-muted-foreground hidden sm:inline">{log.createdByUser?.name || "—"}</span>
                          </span>
                        </button>

                        {/* Accordion Body */}
                        {isOpen && (
                          <div className="bg-muted/20 border-t px-3 pb-3 pt-2 space-y-2">
                            {/* Lens Combinations Table */}
                            {items.length > 0 && (
                              <div className="rounded-md border overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-muted/60 border-b">
                                      {isBulk ? (
                                        <>
                                          <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">SPH</th>
                                          <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">CYL</th>
                                        </>
                                      ) : (
                                        <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Lens</th>
                                      )}
                                      <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Ordered</th>
                                      <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">Received</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {items.map((item, idx) => (
                                      <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                                        {isBulk ? (
                                          <>
                                            <td className="px-2 py-1.5 font-medium">
                                              {Number(item.spherical) > 0 ? `+${item.spherical}` : item.spherical}
                                            </td>
                                            <td className="px-2 py-1.5">
                                              {Number(item.cylindrical) > 0 ? `+${item.cylindrical}` : item.cylindrical}
                                            </td>
                                          </>
                                        ) : (
                                          <td className="px-2 py-1.5 text-muted-foreground">Single Lens</td>
                                        )}
                                        <td className="px-2 py-1.5 text-right text-muted-foreground">{item.orderedQty ?? "—"}</td>
                                        <td className="px-2 py-1.5 text-right font-semibold text-green-700">{item.receivedQty}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
