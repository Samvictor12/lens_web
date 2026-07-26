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

    const companyName = company?.companyName || "Lens Management Shop";
    const sellerAddress = [company?.address, company?.city, company?.state, company?.pincode]
      .filter(Boolean)
      .join(", ");
    const printNow = new Date().toLocaleString("en-IN");
    const expectedDelivery = saleOrder?.expectedDeliveryDate
      ? new Date(saleOrder.expectedDeliveryDate).toLocaleDateString("en-IN")
      : "Standard Timeline";

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Invoice - ${orderNo}</title>
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; }
            body {
              font-family: "Segoe UI", Arial, sans-serif;
              font-size: 11px;
              color: #0f172a;
              background: #cbd5e1;
              padding: 12px;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sheet {
              width: 210mm;
              height: 297mm;
              max-height: 297mm;
              margin: 0 auto;
              background: #fff;
              border: 1px solid #94a3b8;
              box-shadow: 0 2px 8px rgba(15,23,42,.12);
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }
            .sheet-body {
              flex: 1;
              min-height: 0;
              display: flex;
              flex-direction: column;
              padding: 14mm 16mm;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              border-bottom: 1px solid #94a3b8;
              padding-bottom: 10px;
              margin-bottom: 12px;
              flex-shrink: 0;
            }
            .brand { max-width: 58%; }
            .company-name { font-size: 16px; font-weight: 700; letter-spacing: .02em; }
            .muted { color: #475569; font-size: 10px; line-height: 1.35; margin-top: 2px; }
            .inv-head { text-align: right; min-width: 140px; }
            .doc-title {
              font-size: 15px; font-weight: 800; letter-spacing: .08em;
              color: #0f766e; margin-bottom: 6px;
            }
            .inv-meta { display: grid; gap: 3px; text-align: right; }
            .inv-meta .lbl {
              display: inline-block; min-width: 52px; text-align: left;
              font-size: 8px; text-transform: uppercase; letter-spacing: .04em;
              color: #64748b; margin-right: 6px;
            }
            .parties {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              margin-bottom: 12px;
              flex-shrink: 0;
            }
            .party {
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              padding: 8px 10px;
              background: #fff;
            }
            .party-title {
              font-size: 8px; font-weight: 700; text-transform: uppercase;
              letter-spacing: .06em; color: #64748b; margin-bottom: 4px;
            }
            .party-name { font-size: 13px; font-weight: 700; }
            table.items {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
            }
            table.items th, table.items td {
              border: 1px solid #cbd5e1;
              padding: 6px 7px;
              vertical-align: top;
            }
            table.items th {
              background: #fff;
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: .04em;
              text-align: left;
              font-weight: 700;
            }
            .c { text-align: center; }
            .r { text-align: right; }
            .section-label {
              font-size: 8px; font-weight: 700; text-transform: uppercase;
              letter-spacing: .06em; color: #64748b; margin: 4px 0 6px;
            }
            .totals-box {
              width: 220px;
              margin-left: auto;
              border: 1px solid #e2e8f0;
              border-radius: 4px;
              margin-bottom: 12px;
              flex-shrink: 0;
            }
            .t-row { display: flex; justify-content: space-between; padding: 4px 10px; }
            .t-row.net {
              font-weight: 700; font-size: 12px;
              border-top: 1px solid #94a3b8;
              margin-top: 2px; padding-top: 8px; padding-bottom: 8px;
            }
            .footer {
              display: flex; justify-content: space-between; align-items: flex-end;
              gap: 12px; margin-top: auto; padding-top: 8px; flex-shrink: 0;
            }
            .print-meta { font-size: 8px; color: #94a3b8; max-width: 55%; }
            .sign { width: 180px; text-align: center; }
            .sign-line { font-size: 9px; margin-bottom: 3px; }
            .sign-box {
              border-bottom: 1px solid #94a3b8;
              height: 42px;
              margin-bottom: 3px;
            }
            .sign-caption {
              font-size: 8px; font-weight: 700;
              text-transform: uppercase; letter-spacing: .04em;
            }
            @media print {
              body { background: #fff; padding: 0; }
              .sheet {
                margin: 0; border: none; box-shadow: none;
                width: 210mm; height: 297mm; max-height: 297mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="sheet-body">
              <header class="header">
                <div class="brand">
                  <div class="company-name">${companyName}</div>
                  <div class="muted">${sellerAddress || "—"}</div>
                  <div class="muted">
                    ${company?.phone ? `Ph: ${company.phone}` : ""}
                    ${company?.phone && company?.email ? " · " : ""}
                    ${company?.email ? `Email: ${company.email}` : ""}
                  </div>
                  ${company?.gstin ? `<div class="muted">GSTIN: <strong>${company.gstin}</strong></div>` : ""}
                </div>
                <div class="inv-head">
                  <div class="doc-title">SALE ORDER INVOICE</div>
                  <div class="inv-meta">
                    <div><span class="lbl">Order No</span><strong>${orderNo}</strong></div>
                    <div><span class="lbl">Date</span><strong>${orderDateStr}</strong></div>
                    <div><span class="lbl">Status</span><strong>${saleOrder?.status || "CONFIRMED"}</strong></div>
                  </div>
                </div>
              </header>

              <section class="parties">
                <div class="party">
                  <div class="party-title">Bill To / Customer</div>
                  <div class="party-name">${custName}</div>
                  ${shopName ? `<div class="muted">${shopName}</div>` : ""}
                  ${custAddress ? `<div class="muted">${custAddress}</div>` : ""}
                  ${custPhone ? `<div class="muted">Phone: ${custPhone}</div>` : ""}
                  ${custGstin ? `<div class="muted">GSTIN: ${custGstin}</div>` : ""}
                </div>
                <div class="party">
                  <div class="party-title">Delivery Details</div>
                  <div class="muted">Expected: <strong>${expectedDelivery}</strong></div>
                  ${saleOrder?.notes ? `<div class="muted">Notes: ${saleOrder.notes}</div>` : ""}
                </div>
              </section>

              <div class="section-label">Order Details</div>
              <table class="items">
                <thead>
                  <tr>
                    <th>Item Description</th>
                    <th>Lens details</th>
                    <th class="c" style="width:8%">Qty</th>
                    <th class="r" style="width:14%">Unit Price</th>
                    <th class="r" style="width:14%">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>${saleOrder?.lensProduct?.lens_name || "Prescription Lens"}</strong>
                      <div class="muted">
                        Coating: ${getCoatingName(saleOrder?.coating_id)}
                        ${saleOrder?.fittingName || saleOrder?.fitting?.name ? ` | Fitting: ${saleOrder.fittingName || saleOrder.fitting?.name}` : ""}
                        ${(saleOrder?.diaName ?? saleOrder?.dia?.name) != null ? ` | Dia: ${saleOrder.diaName ?? saleOrder.dia?.name}` : ""}
                      </div>
                    </td>
                    <td>
                      <div>Right Eye: ${rightEyeText}</div>
                      <div style="margin-top:4px">Left Eye: ${leftEyeText}</div>
                    </td>
                    <td class="c">${saleOrder?.quantity || 1}</td>
                    <td class="r">₹${(saleOrder?.unitPrice || saleOrder?.lensPrice || 0).toFixed(2)}</td>
                    <td class="r">₹${(saleOrder?.subtotal || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              <div class="totals-box">
                <div class="t-row"><span>Subtotal</span><span>₹${(saleOrder?.subtotal || 0).toFixed(2)}</span></div>
                ${saleOrder?.discountPercentage ? `
                <div class="t-row"><span>Discount (${saleOrder.discountPercentage}%)</span><span>-₹${((saleOrder.subtotal * saleOrder.discountPercentage) / 100).toFixed(2)}</span></div>
                ` : ""}
                ${saleOrder?.taxAmount ? `
                <div class="t-row"><span>Tax Amount</span><span>₹${saleOrder.taxAmount.toFixed(2)}</span></div>
                ` : ""}
                ${saleOrder?.roundOff ? `
                <div class="t-row"><span>Round Off</span><span>₹${saleOrder.roundOff.toFixed(2)}</span></div>
                ` : ""}
                <div class="t-row net"><span>Total Value</span><span>₹${(saleOrder?.totalValue || 0).toFixed(2)}</span></div>
              </div>

              ${hasSpecs ? `
              <div class="section-label">Lens Specifications (Prescription)</div>
              <table class="items">
                <thead>
                  <tr>
                    <th>Eye</th>
                    <th class="c">Spherical (SPH)</th>
                    <th class="c">Cylinder (CYL)</th>
                    <th class="c">Axis</th>
                    <th class="c">Addition (ADD)</th>
                  </tr>
                </thead>
                <tbody>
                  ${saleOrder?.rightEye ? `
                  <tr>
                    <td><strong>Right</strong></td>
                    <td class="c">${saleOrder.rightSpherical || "-"}</td>
                    <td class="c">${saleOrder.rightCylindrical || "-"}</td>
                    <td class="c">${saleOrder.rightAxis ? saleOrder.rightAxis + "°" : "-"}</td>
                    <td class="c">${saleOrder.rightAdd || "-"}</td>
                  </tr>
                  ` : ""}
                  ${saleOrder?.leftEye ? `
                  <tr>
                    <td><strong>Left</strong></td>
                    <td class="c">${saleOrder.leftSpherical || "-"}</td>
                    <td class="c">${saleOrder.leftCylindrical || "-"}</td>
                    <td class="c">${saleOrder.leftAxis ? saleOrder.leftAxis + "°" : "-"}</td>
                    <td class="c">${saleOrder.leftAdd || "-"}</td>
                  </tr>
                  ` : ""}
                </tbody>
              </table>
              ` : ""}

              <footer class="footer">
                <div class="print-meta">
                  ${company?.tagline || "Thank you for your business!"}
                  <div>Printed ${printNow}</div>
                </div>
                <div class="sign">
                  <div class="sign-line">For ${companyName}</div>
                  <div class="sign-box"></div>
                  <div class="sign-caption">Authorised Signatory</div>
                </div>
              </footer>
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
        const orderCode = saleOrder?.orderNo || saleOrder?.order_number || `SO-${orderId}`;
        const customerRef = saleOrder?.customerRefNo?.trim();
        const barcodeSerial = customerRef ? `${orderCode} | ${customerRef}` : String(orderCode);
        const customer = saleOrder?.customer_name || saleOrder?.customer?.name || "Order";

        await printBarcodeLabels({
          printerName: barcodePrinter,
          topLabel: customer,
          barcodeSerials: [barcodeSerial],
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
