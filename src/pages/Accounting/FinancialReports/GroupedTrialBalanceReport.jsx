import { useState, useEffect, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getTrialBalanceGrouped } from "@/services/financialReport";
import { fmt, todayInputDate } from "./reportUtils";
import { ReportExportButtons, downloadExcel, exportPdf, tableHtml } from "./reportExport";
import TrialBalanceReport from "./TrialBalanceReport";

export default function GroupedTrialBalanceReport({ defaultAsOf, compact = false }) {
  const { toast } = useToast();
  const [asOf, setAsOf] = useState(defaultAsOf || todayInputDate());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flatView, setFlatView] = useState(false);
  const [expanded, setExpanded] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await getTrialBalanceGrouped({ asOf: asOf || undefined });
      setData(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load grouped trial balance" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!flatView) load();
  }, [flatView]);

  if (flatView) {
    return (
      <div className="space-y-3">
        <Button size="sm" variant="outline" onClick={() => setFlatView(false)}>
          Back to grouped view
        </Button>
        <TrialBalanceReport defaultAsOf={asOf} compact={compact} />
      </div>
    );
  }

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
        <Button size="sm" variant="outline" onClick={() => setFlatView(true)}>
          Flat drill-down
        </Button>
        {data && (
          <Badge variant={data.isBalanced ? "default" : "destructive"} className="ml-2">
            {data.isBalanced ? "Balanced" : "Out of Balance!"}
          </Badge>
        )}
        <ReportExportButtons
          disabled={!data}
          onExcel={() => {
            const rows = [];
            for (const g of data.groups || []) {
              rows.push([g.groupCode, g.groupName, g.totalDebit, g.totalCredit, g.netBalance]);
              for (const l of g.ledgers || []) {
                rows.push([l.ledgerCode, l.ledgerName, l.totalDebit, l.totalCredit, l.netBalance]);
              }
            }
            downloadExcel({
              filename: `trial-balance_${asOf}`,
              sheetName: "Trial Balance",
              headers: ["Code", "Name", "Debit", "Credit", "Balance"],
              rows,
            });
          }}
          onPdf={() => {
            const rows = (data.groups || []).map((g) => [g.groupCode, g.groupName, g.totalDebit, g.totalCredit, g.netBalance]);
            exportPdf(
              "Trial Balance",
              tableHtml(["Code", "Name", "Debit", "Credit", "Balance"], rows, `Trial Balance as of ${asOf}`)
            );
          }}
        />
      </div>

      {data && (
        <div className="overflow-x-auto">
          <table className={`w-full ${compact ? "text-xs" : "text-sm"}`}>
            <thead>
              <tr className="bg-muted text-xs">
                <th className="p-2 text-left">Group</th>
                <th className="p-2 text-right">Debit</th>
                <th className="p-2 text-right">Credit</th>
                <th className="p-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.groups.map((g) => {
                const hasLedgers = g.ledgers?.length > 0;
                const isOpen = expanded[g.groupCode];
                return (
                  <Fragment key={g.groupCode}>
                    <tr
                      className={`border-b hover:bg-muted/40 ${hasLedgers ? "cursor-pointer" : ""}`}
                      onClick={() => {
                        if (!hasLedgers) return;
                        setExpanded((prev) => ({ ...prev, [g.groupCode]: !prev[g.groupCode] }));
                      }}
                    >
                      <td className="p-2 font-medium">
                        <span className="font-mono text-xs text-muted-foreground mr-2">{g.groupCode}</span>
                        {g.groupName}
                        {hasLedgers && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({g.ledgers.length} ledgers)
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-right">{parseFloat(g.totalDebit) > 0 ? fmt(g.totalDebit) : "—"}</td>
                      <td className="p-2 text-right">{parseFloat(g.totalCredit) > 0 ? fmt(g.totalCredit) : "—"}</td>
                      <td className="p-2 text-right font-medium">{fmt(g.netBalance)}</td>
                    </tr>
                    {hasLedgers && isOpen &&
                      g.ledgers.map((l) => (
                        <tr key={`${g.groupCode}-${l.ledgerCode}`} className="border-b bg-muted/20">
                          <td className="p-2 pl-8 text-muted-foreground">
                            <span className="font-mono text-xs mr-2">{l.ledgerCode}</span>
                            {l.ledgerName}
                          </td>
                          <td className="p-2 text-right">{parseFloat(l.totalDebit) > 0 ? fmt(l.totalDebit) : "—"}</td>
                          <td className="p-2 text-right">{parseFloat(l.totalCredit) > 0 ? fmt(l.totalCredit) : "—"}</td>
                          <td className="p-2 text-right">{fmt(l.netBalance)}</td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted font-bold text-sm">
                <td className="p-2">Total</td>
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
