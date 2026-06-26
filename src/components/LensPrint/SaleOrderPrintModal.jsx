import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { Printer, Tag, FileText, Check, X, RefreshCw } from "lucide-react";
import LensSpecificationPrint from "./LensSpecificationPrint";
import {
  checkPrintServiceHealth,
  getPrinterConfigs,
  printBarcodeLabels,
} from "@/services/printerConfig";

export function SaleOrderPrintModal({
  isOpen,
  onClose,
  onConfirm,
  saleOrder,
  coatings,
  isPrinting = false,
}) {
  const { toast } = useToast();
  const { company } = useCompany();
  const specPrintRef = useRef(null);

  // Print selection states
  const [printInvoice, setPrintInvoice] = useState(true);
  const [printSpec, setPrintSpec] = useState(true);
  const [printLabel, setPrintLabel] = useState(true);

  // UI state
  const [activePreview, setActivePreview] = useState("invoice"); // "invoice" | "spec"
  const [configs, setConfigs] = useState({});
  const [serviceStatus, setServiceStatus] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  // Load printer configurations & check service health
  const loadPrintConfigs = async () => {
    setLoadingConfig(true);
    try {
      const health = await checkPrintServiceHealth();
      setServiceStatus(!!health);

      const cfgRes = await getPrinterConfigs();
      if (cfgRes?.success && Array.isArray(cfgRes.data)) {
        const map = {};
        cfgRes.data.forEach((c) => {
          map[c.config_type] = c.printer_name || "";
        });
        setConfigs(map);
      }
    } catch (err) {
      console.error("Failed to load printer configs:", err);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPrintConfigs();
      // Default print selection based on data availability
      setPrintSpec(!!(saleOrder?.leftEye || saleOrder?.rightEye));
    }
  }, [isOpen, saleOrder]);

  const getCoatingName = (coatingId) => {
    if (!coatingId || !coatings) return "None";
    const coating = coatings.find((c) => c.id === coatingId);
    return coating ? coating.coating_name : "None";
  };

  // ─── Generate Invoice HTML ───
  const getInvoiceHtml = () => {
    const custName = saleOrder?.customer_name || saleOrder?.customer?.name || "Cash Customer";
    const shopName = saleOrder?.shopname || saleOrder?.customer?.shopname || "";
    const custPhone = saleOrder?.phone || saleOrder?.customer?.phone || "";
    const custAddress = saleOrder?.address || saleOrder?.customer?.address || "";
    const custGstin = saleOrder?.gstin || saleOrder?.customer?.gstin || "";
    const orderNo = saleOrder?.order_number || saleOrder?.orderNo || `SO-${saleOrder?.id || ""}`;
    const orderDateStr = saleOrder?.orderDate
      ? new Date(saleOrder.orderDate).toLocaleDateString("en-IN")
      : new Date().toLocaleDateString("en-IN");

    const rightEyeText = saleOrder?.rightEye
      ? `SPH: ${saleOrder.rightSpherical || "-"} | CYL: ${saleOrder.rightCylindrical || "-"} | AXIS: ${saleOrder.rightAxis || "-"} | ADD: ${saleOrder.rightAdd || "-"}`
      : "No specifications";

    const leftEyeText = saleOrder?.leftEye
      ? `SPH: ${saleOrder.leftSpherical || "-"} | CYL: ${saleOrder.leftCylindrical || "-"} | AXIS: ${saleOrder.leftAxis || "-"} | ADD: ${saleOrder.leftAdd || "-"}`
      : "No specifications";

    const hasSpecs = saleOrder?.rightEye || saleOrder?.leftEye;

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice - ${orderNo}</title>
          <style>
            @page {
              size: A4;
              margin: 15mm 20mm;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              color: #333;
              line-height: 1.4;
              margin: 0;
              padding: 0;
            }
            .invoice-container {
              width: 100%;
            }
            .header-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .header-left {
              width: 65%;
              vertical-align: top;
            }
            .header-right {
              width: 35%;
              text-align: right;
              vertical-align: top;
            }
            .company-name {
              font-size: 20px;
              font-weight: bold;
              color: #0d9488;
              margin: 0 0 5px 0;
            }
            .title {
              font-size: 22px;
              font-weight: bold;
              margin: 0 0 5px 0;
              letter-spacing: 0.5px;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 25px;
            }
            .details-cell {
              width: 50%;
              vertical-align: top;
              border: 1px solid #e5e7eb;
              padding: 10px;
              background-color: #fafafa;
            }
            .details-title {
              font-size: 10px;
              color: #6b7280;
              text-transform: uppercase;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .details-val {
              font-size: 13px;
              font-weight: 600;
            }
            .section-title {
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
              border-bottom: 2px solid #333;
              padding-bottom: 3px;
              margin: 20px 0 8px 0;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table th {
              background-color: #f3f4f6;
              padding: 8px;
              font-size: 11px;
              font-weight: bold;
              text-align: left;
              border: 1px solid #e5e7eb;
            }
            .items-table td {
              padding: 8px;
              border: 1px solid #e5e7eb;
              vertical-align: top;
            }
            .total-row td {
              font-weight: bold;
              text-align: right;
              background-color: #fafafa;
            }
            .prescription-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .prescription-table th {
              background-color: #f3f4f6;
              padding: 6px;
              font-size: 10px;
              font-weight: bold;
              border: 1px solid #e5e7eb;
            }
            .prescription-table td {
              padding: 8px;
              border: 1px solid #e5e7eb;
              text-align: center;
            }
            .footer {
              margin-top: 30px;
              font-size: 10px;
              color: #6b7280;
              text-align: center;
              border-top: 1px solid #e5e7eb;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <table class="header-table">
              <tr>
                <td class="header-left">
                  <div class="company-name">${company?.companyName || "Lens Management Shop"}</div>
                  <div>${company?.address || ""}</div>
                  <div>${company?.city || ""}, ${company?.state || ""} ${company?.pincode || ""}</div>
                  ${company?.phone ? `<div>Phone: ${company.phone}</div>` : ""}
                  ${company?.email ? `<div>Email: ${company.email}</div>` : ""}
                  ${company?.gstin ? `<div><strong>GSTIN: ${company.gstin}</strong></div>` : ""}
                </td>
                <td class="header-right">
                  <div class="title">SALE ORDER INVOICE</div>
                  <div style="font-size: 15px; font-weight: bold; color: #4f46e5;">No: ${orderNo}</div>
                  <div style="margin-top: 8px;">Date: ${orderDateStr}</div>
                  <div>Status: <strong>${saleOrder?.status || "CONFIRMED"}</strong></div>
                </td>
              </tr>
            </table>

            <table class="details-table">
              <tr>
                <td class="details-cell">
                  <div class="details-title">Bill To / Customer</div>
                  <div class="details-val">${custName}</div>
                  ${shopName ? `<div>${shopName}</div>` : ""}
                  ${custAddress ? `<div>${custAddress}</div>` : ""}
                  ${custPhone ? `<div>Phone: ${custPhone}</div>` : ""}
                  ${custGstin ? `<div style="margin-top: 5px;">GSTIN: ${custGstin}</div>` : ""}
                </td>
                <td class="details-cell">
                  <div class="details-title">Delivery Details</div>
                  <div>Expected Delivery: ${saleOrder?.expectedDeliveryDate ? new Date(saleOrder.expectedDeliveryDate).toLocaleDateString("en-IN") : "Standard Timeline"}</div>
                  ${saleOrder?.notes ? `<div style="margin-top: 8px; font-style: italic;">Notes: ${saleOrder.notes}</div>` : ""}
                </td>
              </tr>
            </table>

            <div class="section-title">Order Details</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th>Lens details</th>
                  <th style="text-align: center; width: 80px;">Qty</th>
                  <th style="text-align: right; width: 120px;">Unit Price</th>
                  <th style="text-align: right; width: 120px;">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>${saleOrder?.lensProduct?.lens_name || "Prescription Lens"}</strong>
                    <div style="font-size: 10px; color: #666; margin-top: 3px;">
                      Coating: ${getCoatingName(saleOrder?.coating_id)}
                      ${saleOrder?.fittingName || saleOrder?.fitting?.name ? ` | Fitting: ${saleOrder.fittingName || saleOrder.fitting?.name}` : ""}
                      ${(saleOrder?.diaName ?? saleOrder?.dia?.name) != null ? ` | Dia: ${saleOrder.diaName ?? saleOrder.dia?.name}` : ""}
                    </div>
                  </td>
                  <td>
                    <div>Right Eye: ${rightEyeText}</div>
                    <div style="margin-top: 4px;">Left Eye: ${leftEyeText}</div>
                  </td>
                  <td style="text-align: center; vertical-align: middle;">${saleOrder?.quantity || 1}</td>
                  <td style="text-align: right; vertical-align: middle;">₹${(saleOrder?.unitPrice || saleOrder?.lensPrice || 0).toFixed(2)}</td>
                  <td style="text-align: right; vertical-align: middle;">₹${(saleOrder?.subtotal || 0).toFixed(2)}</td>
                </tr>
                <tr class="total-row">
                  <td colspan="4">Subtotal</td>
                  <td>₹${(saleOrder?.subtotal || 0).toFixed(2)}</td>
                </tr>
                ${saleOrder?.discountPercentage ? `
                <tr class="total-row" style="color: #16a34a;">
                  <td colspan="4">Discount (${saleOrder.discountPercentage}%)</td>
                  <td>-₹${((saleOrder.subtotal * saleOrder.discountPercentage) / 100).toFixed(2)}</td>
                </tr>
                ` : ""}
                ${saleOrder?.taxAmount ? `
                <tr class="total-row">
                  <td colspan="4">Tax Amount</td>
                  <td>₹${saleOrder.taxAmount.toFixed(2)}</td>
                </tr>
                ` : ""}
                ${saleOrder?.roundOff ? `
                <tr class="total-row">
                  <td colspan="4">Round Off</td>
                  <td>₹${saleOrder.roundOff.toFixed(2)}</td>
                </tr>
                ` : ""}
                <tr class="total-row" style="font-size: 14px; background-color: #f3f4f6; color: #111;">
                  <td colspan="4">Total Value</td>
                  <td>₹${(saleOrder?.totalValue || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            ${hasSpecs ? `
            <div class="section-title">Lens Specifications (Prescription)</div>
            <table class="prescription-table">
              <thead>
                <tr>
                  <th>Eye</th>
                  <th>Spherical (SPH)</th>
                  <th>Cylinder (CYL)</th>
                  <th>Axis</th>
                  <th>Addition (ADD)</th>
                </tr>
              </thead>
              <tbody>
                ${saleOrder?.rightEye ? `
                <tr>
                  <td><strong>Right</strong></td>
                  <td>${saleOrder.rightSpherical || "-"}</td>
                  <td>${saleOrder.rightCylindrical || "-"}</td>
                  <td>${saleOrder.rightAxis ? saleOrder.rightAxis + "°" : "-"}</td>
                  <td>${saleOrder.rightAdd || "-"}</td>
                </tr>
                ` : ""}
                ${saleOrder?.leftEye ? `
                <tr>
                  <td><strong>Left</strong></td>
                  <td>${saleOrder.leftSpherical || "-"}</td>
                  <td>${saleOrder.leftCylindrical || "-"}</td>
                  <td>${saleOrder.leftAxis ? saleOrder.leftAxis + "°" : "-"}</td>
                  <td>${saleOrder.leftAdd || "-"}</td>
                </tr>
                ` : ""}
              </tbody>
            </table>
            ` : ""}

            <div class="footer">
              <p>${company?.tagline || "Thank you for your business!"}</p>
              <p style="margin-top: 15px; font-size: 8px;">Generated by Lens Management System · Printed: ${new Date().toLocaleString("en-IN")}</p>
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // ─── Trigger Prints ───
  const handlePrint = async () => {
    let tasksCount = 0;
    let successCount = 0;

    // 1. Barcode print via Local Service
    if (printLabel) {
      tasksCount++;
      try {
        const barcodePrinter = configs["BARCODE_LABEL"];
        if (!barcodePrinter) {
          throw new Error("No Barcode Label printer configured in Settings.");
        }

        const orderId = saleOrder?.id || saleOrder?.order_number || "0";
        const orderCode = saleOrder?.order_number || `SO-${orderId}`;
        const customer = saleOrder?.customer_name || saleOrder?.customer?.name || "Order";

        await printBarcodeLabels({
          printerName: barcodePrinter,
          topLabel: customer,
          barcodeSerials: [String(orderId)],
          bottomLabels: [orderCode],
          labelWidth: 180,
        });
        successCount++;
        toast({ title: "Label Printed", description: "ZPL barcode sent to thermal printer." });
      } catch (err) {
        toast({
          title: "Label Printing Failed",
          description: err.message || "Failed to print label. Ensure service is running.",
          variant: "destructive",
        });
      }
    }

    // 2. Invoice Print (A4)
    if (printInvoice) {
      tasksCount++;
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast({
          title: "Popup Blocked",
          description: "Allow popups to print the A4 invoice.",
          variant: "destructive",
        });
      } else {
        printWindow.document.write(getInvoiceHtml());
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          successCount++;
        }, 300);
      }
    }

    // 3. Lens Spec Print (A5)
    if (printSpec) {
      tasksCount++;
      if (!specPrintRef.current) {
        toast({
          title: "Preview Error",
          description: "Lens Spec print source not rendered.",
          variant: "destructive",
        });
      } else {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
          toast({
            title: "Popup Blocked",
            description: "Allow popups to print the A5 lens spec.",
            variant: "destructive",
          });
        } else {
          const content = specPrintRef.current.innerHTML;
          const orderNo = saleOrder?.order_number || saleOrder?.orderNo || "Spec";
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="UTF-8">
                <title>Lens Specification - ${orderNo}</title>
                <style>
                  @page {
                    size: A5;
                    margin: 0;
                  }
                  body {
                    margin: 0;
                    padding: 0;
                    font-family: Arial, sans-serif;
                  }
                  @media print {
                    body {
                      margin: 0;
                      padding: 0;
                    }
                  }
                </style>
              </head>
              <body>
                ${content}
              </body>
            </html>
          `);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.print();
            successCount++;
          }, 300);
        }
      }
    }

    if (successCount > 0) {
      toast({
        title: "Print Complete",
        description: `Successfully triggered ${successCount} of ${tasksCount} print jobs.`,
      });
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-muted/20">
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Printer className="h-5 w-5 text-teal-600" />
            Print Router
          </DialogTitle>
          <DialogDescription>
            Select documents to print and verify routing. Customize selections based on customer choice.
          </DialogDescription>
        </DialogHeader>

        {/* Main Content Pane */}
        <div className="flex-1 flex overflow-hidden" style={{ minHeight: "350px", height: "65vh" }}>
          {/* Left panel: Config, Preferences & Service status */}
          <div className="w-80 border-r bg-muted/10 p-5 flex flex-col gap-4 overflow-y-auto">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Document Selection
            </p>

            <div className="space-y-3">
              {/* Invoice Checkbox */}
              <div
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors ${
                  printInvoice ? "border-teal-500 bg-teal-50/50" : "border-muted"
                }`}
                onClick={() => setPrintInvoice(!printInvoice)}
              >
                <div className="flex h-5 items-center">
                  <input
                    type="checkbox"
                    checked={printInvoice}
                    onChange={() => {}}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
                    <FileText className="h-4 w-4 text-gray-500" />
                    Invoice (A4)
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Printer: {configs["SALE_ORDER"] || "Browser Default (A4)"}
                  </p>
                </div>
              </div>

              {/* Lens Specification Checkbox */}
              <div
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors ${
                  printSpec ? "border-teal-500 bg-teal-50/50" : "border-muted"
                }`}
                onClick={() => {
                  if (saleOrder?.rightEye || saleOrder?.leftEye) {
                    setPrintSpec(!printSpec);
                  } else {
                    toast({
                      title: "Unavailable",
                      description: "No lens specification data is available on this order.",
                      variant: "destructive",
                    });
                  }
                }}
                style={{ opacity: (saleOrder?.rightEye || saleOrder?.leftEye) ? 1 : 0.6 }}
              >
                <div className="flex h-5 items-center">
                  <input
                    type="checkbox"
                    checked={printSpec}
                    disabled={!(saleOrder?.rightEye || saleOrder?.leftEye)}
                    onChange={() => {}}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
                    <Printer className="h-4 w-4 text-gray-500" />
                    Lens Specification (A5)
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Printer: {configs["LENS_SPECIFICATION"] || "Browser Default (A5)"}
                  </p>
                </div>
              </div>

              {/* Barcode Label Checkbox */}
              <div
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors ${
                  printLabel ? "border-teal-500 bg-teal-50/50" : "border-muted"
                }`}
                onClick={() => setPrintLabel(!printLabel)}
              >
                <div className="flex h-5 items-center">
                  <input
                    type="checkbox"
                    checked={printLabel}
                    onChange={() => {}}
                    className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm font-semibold flex items-center gap-1.5 cursor-pointer">
                    <Tag className="h-4 w-4 text-gray-500" />
                    Barcode Label (ZPL)
                  </label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Printer: {configs["BARCODE_LABEL"] || "Not Configured"}
                  </p>
                </div>
              </div>
            </div>

            <hr className="border-t my-1" />

            {/* Print Service Status Check */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-2 border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">Local Print Daemon</span>
                <button
                  type="button"
                  onClick={loadPrintConfigs}
                  disabled={loadingConfig}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingConfig ? "animate-spin" : ""}`} />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {serviceStatus === null ? (
                  <span className="h-2 w-2 rounded-full bg-gray-400 animate-pulse" />
                ) : serviceStatus ? (
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-red-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {serviceStatus === null
                    ? "Checking..."
                    : serviceStatus
                    ? "Connected (Port 9333)"
                    : "Disconnected"}
                </span>
              </div>
              {printLabel && !serviceStatus && (
                <p className="text-[10px] text-destructive leading-tight">
                  ⚠️ Label printing requires <strong>LensPrintService.exe</strong> to be running.
                </p>
              )}
            </div>
          </div>

          {/* Right panel: Active template preview window */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-100/50">
            {/* Tab switch buttons */}
            <div className="flex border-b bg-white px-4">
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activePreview === "invoice"
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActivePreview("invoice")}
              >
                Invoice A4 Preview
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activePreview === "spec"
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActivePreview("spec")}
                disabled={!(saleOrder?.rightEye || saleOrder?.leftEye)}
              >
                Lens Spec A5 Preview
              </button>
            </div>

            {/* Scrollable preview content */}
            <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
              {activePreview === "invoice" ? (
                <div
                  className="bg-white shadow-md border rounded p-12 overflow-y-auto"
                  style={{
                    width: "210mm",
                    minHeight: "297mm",
                    transform: "scale(0.85)",
                    transformOrigin: "top center",
                  }}
                  dangerouslySetInnerHTML={{ __html: getInvoiceHtml() }}
                />
              ) : (
                <div
                  className="bg-white shadow-md border rounded overflow-hidden"
                  style={{
                    width: "148mm",
                    height: "210mm",
                    transform: "scale(0.85)",
                    transformOrigin: "top center",
                  }}
                >
                  <LensSpecificationPrint
                    ref={specPrintRef}
                    saleOrder={saleOrder}
                    coatings={coatings}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <DialogFooter className="px-6 py-4 border-t bg-muted/20 gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPrinting}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting || (!printInvoice && !printSpec && !printLabel)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-2"
          >
            <Printer className="h-4 w-4" />
            {isPrinting ? "Printing..." : "Print Selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SaleOrderPrintModal;
