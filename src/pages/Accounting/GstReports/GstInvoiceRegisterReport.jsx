import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getGstInvoiceRegister } from "@/services/gstReport";
import { firstDayOfMonth, lastDayOfMonth } from "./gstReportUtils";
import { ReportExportButtons, downloadExcel, exportPdf, tableHtml } from "../FinancialReports/reportExport";

export const GST_REGISTER_HEADERS = [
  "SlNo",
  "Bill No",
  "Date",
  "Customer Name",
  "GSTNo",
  "State Name",
  "Sales Ledger",
  "HSN",
  "Qty",
  "Unit",
  "TaxRate",
  "Nett",
  "CGST",
  "SGST",
  "IGST",
  "IGST-Tax",
  "R-OFF",
  "Total Amt",
  "Total (taxable)",
  "Postage",
];

function gstRegisterRowToExcelArray(row) {
  return [
    row.slNo,
    row.billNo,
    row.date,
    row.customerName,
    row.gstNo,
    row.stateName,
    row.salesLedger,
    row.hsn,
    row.qty,
    row.unit,
    row.taxRate,
    row.nett,
    row.cgst,
    row.sgst,
    row.igst,
    row.igstTax,
    row.rOff,
    row.totalAmt,
    row.totalTaxable,
    row.postage,
  ];
}

function money(n) {
  return Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function GstInvoiceRegisterReport() {
  const { toast } = useToast();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(lastDayOfMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getGstInvoiceRegister({ from: from || undefined, to: to || undefined });
      setData(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load GST register" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const headers = data?.headers?.length ? data.headers : GST_REGISTER_HEADERS;
  const excelRows = (data?.rows || []).map((r) => gstRegisterRowToExcelArray(r));

  const handleExcel = () =>
    downloadExcel({
      filename: `gst-register_${from}_${to}`,
      sheetName: "GST Report",
      headers,
      rows: excelRows,
    });

  const handlePdf = () =>
    exportPdf("GST Report", tableHtml(headers, excelRows, `GST Report (${from} to ${to})`));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input type="date" className="h-8 w-36 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input type="date" className="h-8 w-36 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <Button size="sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Generate"}
        </Button>
        <ReportExportButtons disabled={!data} onExcel={handleExcel} onPdf={handlePdf} />
      </div>

      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[72rem]">
            <thead>
              <tr className="bg-muted">
                {headers.map((h) => (
                  <th key={h} className="p-2 text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.rows || []).length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="p-4 text-center text-muted-foreground">
                    No invoices in this period
                  </td>
                </tr>
              ) : (
                data.rows.map((r) => (
                  <tr key={`${r.slNo}-${r.billNo}`} className="border-b">
                    <td className="p-2">{r.slNo}</td>
                    <td className="p-2">{r.billNo}</td>
                    <td className="p-2 whitespace-nowrap">{r.date}</td>
                    <td className="p-2">{r.customerName}</td>
                    <td className="p-2">{r.gstNo}</td>
                    <td className="p-2">{r.stateName}</td>
                    <td className="p-2">{r.salesLedger}</td>
                    <td className="p-2">{r.hsn}</td>
                    <td className="p-2 text-right">{r.qty}</td>
                    <td className="p-2">{r.unit}</td>
                    <td className="p-2 text-right">{r.taxRate}</td>
                    <td className="p-2 text-right">{money(r.nett)}</td>
                    <td className="p-2 text-right">{money(r.cgst)}</td>
                    <td className="p-2 text-right">{money(r.sgst)}</td>
                    <td className="p-2 text-right">{money(r.igst)}</td>
                    <td className="p-2 text-right">{money(r.igstTax)}</td>
                    <td className="p-2 text-right">{money(r.rOff)}</td>
                    <td className="p-2 text-right">{money(r.totalAmt)}</td>
                    <td className="p-2 text-right">{money(r.totalTaxable)}</td>
                    <td className="p-2 text-right">{money(r.postage)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
