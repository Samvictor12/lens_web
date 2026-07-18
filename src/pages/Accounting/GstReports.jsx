import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Receipt, TrendingUp, Wallet, ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getMonthlySalesReport, getGstCollectionReport } from "@/services/gstReport";

const fmt = (v) => `₹${parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

function todayInputDate() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function firstDayOfMonth() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), "01"].join("-");
}

function printReport(title, html) {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.open();
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8" /><title>${title}</title>
    <style>
      @page { size: A4; margin: 16mm; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 13px; }
      h1 { font-size: 18px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; font-size: 12px; }
      th { background: #f1f1f1; }
      .text-right { text-align: right; }
    </style></head><body>${html}</body></html>`);
  win.document.close();
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch (_) {
      /* ignore */
    }
  }, 300);
}

// ── Monthly Sales Report ────────────────────────────────────────────────────

function MonthlySalesReport() {
  const { toast } = useToast();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayInputDate());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getMonthlySalesReport({ from: from || undefined, to: to || undefined });
      setData(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load monthly sales report" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePrint = () => {
    if (!data) return;
    const rowsHtml = data.rows
      .map(
        (r) =>
          `<tr><td>${r.monthLabel}</td><td class="text-right">${r.invoiceCount}</td><td class="text-right">${fmt(r.taxableSales)}</td><td class="text-right">${fmt(r.gstAmount)}</td><td class="text-right">${fmt(r.totalSales)}</td></tr>`
      )
      .join("");
    printReport(
      "Monthly Sales Report",
      `<h1>Monthly Sales Report</h1><p>Period: ${from || "—"} to ${to || "—"}</p>
      <table><thead><tr><th>Month</th><th class="text-right">Invoices</th><th class="text-right">Taxable Sales</th><th class="text-right">GST</th><th class="text-right">Total Sales</th></tr></thead>
      <tbody>${rowsHtml}<tr style="font-weight:bold"><td>Total</td><td class="text-right">${data.totals.invoiceCount}</td><td class="text-right">${fmt(data.totals.taxableSales)}</td><td class="text-right">${fmt(data.totals.gstAmount)}</td><td class="text-right">${fmt(data.totals.totalSales)}</td></tr></tbody></table>`
    );
  };

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
        {data && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        )}
      </div>

      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted text-xs">
                <th className="p-2 text-left">Month</th>
                <th className="p-2 text-right">Invoices</th>
                <th className="p-2 text-right">Taxable Sales</th>
                <th className="p-2 text-right">GST</th>
                <th className="p-2 text-right">Total Sales</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-muted-foreground text-xs">
                    No invoices in this period
                  </td>
                </tr>
              ) : (
                data.rows.map((r) => (
                  <tr key={r.month} className="border-b hover:bg-muted/40">
                    <td className="p-2">{r.monthLabel}</td>
                    <td className="p-2 text-right">{r.invoiceCount}</td>
                    <td className="p-2 text-right">{fmt(r.taxableSales)}</td>
                    <td className="p-2 text-right">{fmt(r.gstAmount)}</td>
                    <td className="p-2 text-right font-medium">{fmt(r.totalSales)}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-bold text-sm">
                <td className="p-2">Total</td>
                <td className="p-2 text-right">{data.totals.invoiceCount}</td>
                <td className="p-2 text-right">{fmt(data.totals.taxableSales)}</td>
                <td className="p-2 text-right">{fmt(data.totals.gstAmount)}</td>
                <td className="p-2 text-right">{fmt(data.totals.totalSales)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── GST Collection Report ───────────────────────────────────────────────────

function GstLine({ label, data, tone = "default" }) {
  const toneClass = tone === "positive" ? "text-green-700" : tone === "negative" ? "text-red-700" : "";
  return (
    <div className="rounded-lg border p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className={`text-base font-bold ${toneClass}`}>{fmt(data.total)}</span>
      </div>
      {data.split && (
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>CGST: {fmt(data.cgst)}</span>
          <span>SGST: {fmt(data.sgst)}</span>
        </div>
      )}
    </div>
  );
}

function GstCollectionReport() {
  const { toast } = useToast();
  const [from, setFrom] = useState(firstDayOfMonth());
  const [to, setTo] = useState(todayInputDate());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getGstCollectionReport({ from: from || undefined, to: to || undefined });
      setData(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load GST collection report" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePrint = () => {
    if (!data) return;
    printReport(
      "GST Collection Report",
      `<h1>GST Collection Report</h1><p>Period: ${from || "—"} to ${to || "—"}</p>
      <table><tbody>
      <tr><td>Output GST Collected</td><td class="text-right">${fmt(data.output.total)}</td></tr>
      <tr><td>Input GST Credit</td><td class="text-right">${fmt(data.input.total)}</td></tr>
      <tr style="font-weight:bold"><td>Net ${data.netPayable.direction === "PAYABLE" ? "Payable" : "Refundable"}</td><td class="text-right">${fmt(Math.abs(data.netPayable.total))}</td></tr>
      </tbody></table>`
    );
  };

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
        {data && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" /> Print
          </Button>
        )}
        {data && (
          <Badge variant="outline" className="ml-1">
            {data.companyState ? `CGST/SGST split (${data.companyState})` : "Consolidated GST"}
          </Badge>
        )}
      </div>

      {data && (
        <div className="grid gap-3 sm:grid-cols-3 max-w-3xl">
          <GstLine label="Output GST Collected" data={data.output} tone="positive" />
          <GstLine label="Input GST Credit" data={data.input} />
          <GstLine
            label={data.netPayable.direction === "PAYABLE" ? "Net Payable" : "Net Refundable"}
            data={{ ...data.netPayable, total: Math.abs(data.netPayable.total) }}
            tone={data.netPayable.direction === "PAYABLE" ? "negative" : "positive"}
          />
        </div>
      )}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────

export default function GstReports() {
  const navigate = useNavigate();

  return (
    <div className="p-2 sm:p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            GST Reports
          </h1>
          <p className="text-xs text-muted-foreground">Monthly Sales Report and GST Collection Report for filing</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/accounts/reports")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Financial Reports
        </Button>
      </div>

      <Tabs defaultValue="monthly-sales">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="monthly-sales" className="gap-1.5 text-xs">
            <TrendingUp className="h-3.5 w-3.5" /> Monthly Sales Report
          </TabsTrigger>
          <TabsTrigger value="gst-collection" className="gap-1.5 text-xs">
            <Wallet className="h-3.5 w-3.5" /> GST Collection Report
          </TabsTrigger>
        </TabsList>
        <Card className="mt-3">
          <CardContent className="p-4">
            <TabsContent value="monthly-sales" className="mt-0">
              <MonthlySalesReport />
            </TabsContent>
            <TabsContent value="gst-collection" className="mt-0">
              <GstCollectionReport />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
