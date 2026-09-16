import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getProfitLoss } from "@/services/financialReport";
import { fmt, todayInputDate } from "./reportUtils";
import { ReportExportButtons, downloadExcel, exportPdf, tableHtml } from "./reportExport";

function monthStartFrom(dateStr) {
  if (!dateStr) return "";
  const [y, m] = dateStr.split("-");
  return `${y}-${m}-01`;
}

function Breakdown({ title, total, rows, compact }) {
  return (
    <div className="space-y-1">
      <div className={`flex justify-between font-semibold ${compact ? "text-xs" : "text-sm"}`}>
        <span>{title}</span>
        <span>{fmt(total)}</span>
      </div>
      {(rows || []).map((r) => (
        <div
          key={r.ledgerCode}
          className={`flex justify-between pl-4 text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}
        >
          <span>
            <span className="font-mono mr-2">{r.ledgerCode}</span>
            {r.ledgerName}
          </span>
          <span>{fmt(r.amount)}</span>
        </div>
      ))}
    </div>
  );
}

export default function ProfitLossReport({ defaultAsOf, compact = false }) {
  const { toast } = useToast();
  const asOf = defaultAsOf || todayInputDate();
  const [from, setFrom] = useState(monthStartFrom(asOf));
  const [to, setTo] = useState(asOf);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getProfitLoss({ from: from || undefined, to: to || undefined });
      setData(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load profit & loss" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFrom(monthStartFrom(asOf));
    setTo(asOf);
  }, [asOf]);

  useEffect(() => {
    load();
  }, []);

  const excelRows = () => {
    if (!data) return [];
    const rows = [];
    rows.push(["Income", "", ""]);
    for (const r of data.income?.breakdown || []) rows.push([r.ledgerCode, r.ledgerName, r.amount]);
    rows.push(["Total Income", "", data.income?.total]);
    rows.push(["Cost of Goods Sold", "", ""]);
    for (const r of data.costOfGoodsSold?.breakdown || []) rows.push([r.ledgerCode, r.ledgerName, r.amount]);
    rows.push(["Total COGS", "", data.costOfGoodsSold?.total]);
    rows.push(["Gross Profit", "", data.grossProfit]);
    rows.push(["Operating Expenses", "", ""]);
    for (const r of data.operatingExpenses?.breakdown || []) rows.push([r.ledgerCode, r.ledgerName, r.amount]);
    rows.push(["Total Operating Expenses", "", data.operatingExpenses?.total]);
    rows.push([data.isProfit ? "Net Profit" : "Net Loss", "", data.netProfit]);
    return rows;
  };

  const handleExcel = () =>
    downloadExcel({
      filename: `profit-loss_${from}_${to}`,
      sheetName: "Profit and Loss",
      headers: ["Code", "Particulars", "Amount"],
      rows: excelRows(),
    });

  const handlePdf = () => {
    const htmlRows = excelRows().map((r) => [r[0], r[1], r[2]]);
    exportPdf("Profit & Loss", tableHtml(["Code", "Particulars", "Amount"], htmlRows, `Profit & Loss (${from} to ${to})`));
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
        <ReportExportButtons disabled={!data} onExcel={handleExcel} onPdf={handlePdf} />
      </div>

      {data && (
        <div className={`max-w-2xl space-y-3 border rounded-md p-4 ${compact ? "text-xs" : "text-sm"}`}>
          <Breakdown title="Income" total={data.income?.total} rows={data.income?.breakdown} compact={compact} />
          <Breakdown
            title="Cost of Goods Sold"
            total={data.costOfGoodsSold?.total}
            rows={data.costOfGoodsSold?.breakdown}
            compact={compact}
          />
          <div className="flex justify-between font-bold bg-blue-50 px-2 py-1 rounded">
            <span>Gross Profit</span>
            <span>{fmt(data.grossProfit)}</span>
          </div>
          <Breakdown
            title="Operating Expenses"
            total={data.operatingExpenses?.total}
            rows={data.operatingExpenses?.breakdown}
            compact={compact}
          />
          <div
            className={`flex justify-between font-bold px-2 py-1 rounded ${
              data.isProfit ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
            }`}
          >
            <span>{data.isProfit ? "Net Profit" : "Net Loss"}</span>
            <span>{fmt(data.netProfit)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
