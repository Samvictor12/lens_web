import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getTrialBalance } from "@/services/financialReport";
import { fmt, todayInputDate } from "./reportUtils";
import { ReportExportButtons, downloadExcel, exportPdf, tableHtml } from "./reportExport";

export default function TrialBalanceReport({ defaultAsOf, compact = false }) {
  const { toast } = useToast();
  const [asOf, setAsOf] = useState(defaultAsOf || todayInputDate());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getTrialBalance({ asOf: asOf || undefined });
      setData(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load trial balance" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">As Of</Label>
          <Input type="date" className="h-8 w-36 text-sm" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
        <Button size="sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Generate"}
        </Button>
        {data && (
          <Badge variant={data.isBalanced ? "default" : "destructive"} className="ml-2">
            {data.isBalanced ? "Balanced" : "Out of Balance!"}
          </Badge>
        )}
        <ReportExportButtons
          disabled={!data}
          onExcel={() => {
            const rows = (data.ledgers || []).map((l) => [
              l.ledgerCode,
              l.ledgerName,
              l.ledgerType,
              l.totalDebit,
              l.totalCredit,
              l.netBalance,
            ]);
            downloadExcel({
              filename: `trial-balance-flat_${asOf}`,
              sheetName: "Trial Balance",
              headers: ["Code", "Ledger", "Type", "Debit", "Credit", "Balance"],
              rows,
            });
          }}
          onPdf={() => {
            const rows = (data.ledgers || []).map((l) => [
              l.ledgerCode,
              l.ledgerName,
              l.ledgerType,
              l.totalDebit,
              l.totalCredit,
              l.netBalance,
            ]);
            exportPdf(
              "Trial Balance",
              tableHtml(
                ["Code", "Ledger", "Type", "Debit", "Credit", "Balance"],
                rows,
                `Trial Balance as of ${asOf}`
              )
            );
          }}
        />
      </div>

      {data && (
        <div className="overflow-x-auto">
          <table className={`w-full ${compact ? "text-xs" : "text-sm"}`}>
            <thead>
              <tr className="bg-muted text-xs">
                <th className="p-2 text-left">Code</th>
                <th className="p-2 text-left">Ledger</th>
                <th className="p-2 text-left">Type</th>
                <th className="p-2 text-right">Debit</th>
                <th className="p-2 text-right">Credit</th>
                <th className="p-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.ledgers.map((l, i) => (
                <tr key={i} className="border-b hover:bg-muted/40">
                  <td className="p-2 font-mono text-xs">{l.ledgerCode}</td>
                  <td className="p-2">{l.ledgerName}</td>
                  <td className="p-2">
                    <Badge variant="outline" className="text-xs">{l.ledgerType}</Badge>
                  </td>
                  <td className="p-2 text-right">{parseFloat(l.totalDebit) > 0 ? fmt(l.totalDebit) : "—"}</td>
                  <td className="p-2 text-right">{parseFloat(l.totalCredit) > 0 ? fmt(l.totalCredit) : "—"}</td>
                  <td className="p-2 text-right font-medium">{fmt(l.netBalance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-bold text-sm">
                <td colSpan={3} className="p-2">Total</td>
                <td className="p-2 text-right">{fmt(data.totalDebit)}</td>
                <td className="p-2 text-right">{fmt(data.totalCredit)}</td>
                <td className="p-2" />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
