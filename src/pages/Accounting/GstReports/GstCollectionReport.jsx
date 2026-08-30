import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getGstCollectionReport } from "@/services/gstReport";
import { fmt, firstDayOfMonth, todayInputDate, printReport } from "./gstReportUtils";

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

function formatTransactionDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN");
}

export default function GstCollectionReport() {
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

  const gstTransactions = data?.outputGstTransactions || data?.outputInvoices || [];
  const hasSplit = Boolean(data?.companyState);

  const handlePrint = () => {
    if (!data) return;

    const detailHeaders = hasSplit
      ? "<th>Date</th><th>Reference</th><th>Party</th><th>Type</th><th class=\"text-right\">CGST</th><th class=\"text-right\">SGST</th><th class=\"text-right\">GST</th>"
      : "<th>Date</th><th>Reference</th><th>Party</th><th>Type</th><th class=\"text-right\">GST</th>";

    const detailRows = gstTransactions
      .map((row) => {
        const typeLabel = row.entryType === "CREDIT" ? "Collected" : "Reversal";
        if (hasSplit) {
          return `<tr><td>${formatTransactionDate(row.transactionDate)}</td><td>${row.referenceNumber || "—"}</td><td>${row.partyName || "—"}</td><td>${typeLabel}</td><td class="text-right">${fmt(row.cgst)}</td><td class="text-right">${fmt(row.sgst)}</td><td class="text-right">${fmt(row.gstAmount)}</td></tr>`;
        }
        return `<tr><td>${formatTransactionDate(row.transactionDate)}</td><td>${row.referenceNumber || "—"}</td><td>${row.partyName || "—"}</td><td>${typeLabel}</td><td class="text-right">${fmt(row.gstAmount)}</td></tr>`;
      })
      .join("");

    const detailTotals = gstTransactions.reduce(
      (acc, row) => ({
        gst: acc.gst + (parseFloat(row.gstAmount) || 0),
        cgst: acc.cgst + (parseFloat(row.cgst) || 0),
        sgst: acc.sgst + (parseFloat(row.sgst) || 0),
      }),
      { gst: 0, cgst: 0, sgst: 0 }
    );

    const detailFooter = hasSplit
      ? `<tr style="font-weight:bold"><td colspan="4">Total (${gstTransactions.length} transactions)</td><td class="text-right">${fmt(detailTotals.cgst)}</td><td class="text-right">${fmt(detailTotals.sgst)}</td><td class="text-right">${fmt(detailTotals.gst)}</td></tr>`
      : `<tr style="font-weight:bold"><td colspan="4">Total (${gstTransactions.length} transactions)</td><td class="text-right">${fmt(detailTotals.gst)}</td></tr>`;

    printReport(
      "GST Collection Report",
      `<h1>GST Collection Report</h1><p>Period: ${from || "—"} to ${to || "—"}</p>
      <h2>Summary</h2>
      <table><tbody>
      <tr><td>Output GST Collected</td><td class="text-right">${fmt(data.output.total)}</td></tr>
      <tr><td>Input GST Credit</td><td class="text-right">${fmt(data.input.total)}</td></tr>
      <tr style="font-weight:bold"><td>Net ${data.netPayable.direction === "PAYABLE" ? "Payable" : "Refundable"}</td><td class="text-right">${fmt(Math.abs(data.netPayable.total))}</td></tr>
      </tbody></table>
      <h2>GST Collection Transactions</h2>
      <table><thead><tr>${detailHeaders}</tr></thead>
      <tbody>${detailRows || `<tr><td colspan="${hasSplit ? 7 : 5}">No GST transactions in this period</td></tr>`}${detailFooter}</tbody></table>`
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
        <>
          <div className="grid gap-3 sm:grid-cols-3 max-w-3xl">
            <GstLine label="Output GST Collected" data={data.output} tone="positive" />
            <GstLine label="Input GST Credit" data={data.input} />
            <GstLine
              label={data.netPayable.direction === "PAYABLE" ? "Net Payable" : "Net Refundable"}
              data={{ ...data.netPayable, total: Math.abs(data.netPayable.total) }}
              tone={data.netPayable.direction === "PAYABLE" ? "negative" : "positive"}
            />
          </div>

          <div className="overflow-x-auto">
            <p className="text-xs text-muted-foreground mb-2">GST ledger transactions (output GST only)</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-xs">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Reference</th>
                  <th className="p-2 text-left">Party</th>
                  <th className="p-2 text-left">Type</th>
                  {hasSplit && (
                    <>
                      <th className="p-2 text-right">CGST</th>
                      <th className="p-2 text-right">SGST</th>
                    </>
                  )}
                  <th className="p-2 text-right">GST</th>
                </tr>
              </thead>
              <tbody>
                {gstTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={hasSplit ? 7 : 5} className="p-4 text-center text-muted-foreground text-xs">
                      No GST transactions in this period
                    </td>
                  </tr>
                ) : (
                  gstTransactions.map((row) => (
                    <tr key={row.entryId || row.transactionId} className="border-b hover:bg-muted/40">
                      <td className="p-2">{formatTransactionDate(row.transactionDate)}</td>
                      <td className="p-2">{row.referenceNumber || "—"}</td>
                      <td className="p-2">{row.partyName || "—"}</td>
                      <td className="p-2">
                        <Badge variant={row.entryType === "CREDIT" ? "default" : "secondary"} className="text-xs">
                          {row.entryType === "CREDIT" ? "Collected" : "Reversal"}
                        </Badge>
                      </td>
                      {hasSplit && (
                        <>
                          <td className="p-2 text-right">{fmt(row.cgst)}</td>
                          <td className="p-2 text-right">{fmt(row.sgst)}</td>
                        </>
                      )}
                      <td className="p-2 text-right font-medium">{fmt(row.gstAmount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
              {gstTransactions.length > 0 && (
                <tfoot>
                  <tr className="bg-muted font-bold text-sm">
                    <td className="p-2" colSpan={hasSplit ? 4 : 4}>
                      Total ({gstTransactions.length} transactions)
                    </td>
                    {hasSplit && (
                      <>
                        <td className="p-2 text-right">
                          {fmt(gstTransactions.reduce((s, r) => s + (parseFloat(r.cgst) || 0), 0))}
                        </td>
                        <td className="p-2 text-right">
                          {fmt(gstTransactions.reduce((s, r) => s + (parseFloat(r.sgst) || 0), 0))}
                        </td>
                      </>
                    )}
                    <td className="p-2 text-right">
                      {fmt(gstTransactions.reduce((s, r) => s + (parseFloat(r.gstAmount) || 0), 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}
