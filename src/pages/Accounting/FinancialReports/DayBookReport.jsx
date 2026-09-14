import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getDayBook } from "@/services/financialReport";
import { fmt, todayInputDate } from "./reportUtils";
import { ReportExportButtons, downloadExcel, exportPdf, tableHtml } from "./reportExport";

export default function DayBookReport({ defaultDate, compact = false }) {
  const { toast } = useToast();
  const [date, setDate] = useState(defaultDate || todayInputDate());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getDayBook({ date });
      setData(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load day book" });
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
          <Label className="text-xs">Date</Label>
          <Input type="date" className="h-8 w-36 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <Button size="sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Show"}
        </Button>
        <ReportExportButtons
          disabled={!data}
          onExcel={() => {
            const rows = [];
            for (const t of data.transactions || []) {
              rows.push([t.transactionNumber, t.transactionType, t.description, t.totalAmount]);
              for (const e of t.entries || []) {
                rows.push([
                  "",
                  e.ledgerCode,
                  e.ledgerName,
                  e.entryType === "DEBIT" ? e.amount : "",
                  e.entryType === "CREDIT" ? e.amount : "",
                ]);
              }
            }
            downloadExcel({
              filename: `day-book_${date}`,
              sheetName: "Day Book",
              headers: ["Txn", "Type / Ledger", "Description", "Debit / Amount", "Credit"],
              rows,
            });
          }}
          onPdf={() => {
            const rows = (data.transactions || []).map((t) => [
              t.transactionNumber,
              t.transactionType,
              t.description || "",
              t.totalAmount,
            ]);
            exportPdf("Day Book", tableHtml(["Txn", "Type", "Description", "Amount"], rows, `Day Book ${date}`));
          }}
        />
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.totalTransactions} transactions · {fmt(data.totalAmount)}
          </span>
        )}
      </div>

      {data && (
        <div className="space-y-2">
          {data.transactions.length === 0 && (
            <p className="text-sm text-muted-foreground">No transactions for this date.</p>
          )}
          {data.transactions.map((t, i) => (
            <Card key={i} className="overflow-hidden shadow-none">
              <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
                onClick={() => setExpanded(expanded === i ? null : i)}
              >
                <div className={`flex items-center gap-3 ${compact ? "text-xs" : "text-sm"}`}>
                  <span className="font-mono font-medium">{t.transactionNumber}</span>
                  <Badge variant="outline" className="text-xs">{t.transactionType}</Badge>
                  <span className="text-muted-foreground">{t.description}</span>
                </div>
                <span className="font-semibold text-sm">{fmt(t.totalAmount)}</span>
              </div>
              {expanded === i && (
                <div className="border-t">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-2 text-left">Ledger</th>
                        <th className="p-2 text-right">Dr</th>
                        <th className="p-2 text-right">Cr</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.entries.map((e, j) => (
                        <tr key={j} className="border-b last:border-0">
                          <td className="p-2">{e.ledgerCode} — {e.ledgerName}</td>
                          <td className="p-2 text-right">{e.entryType === "DEBIT" ? fmt(e.amount) : ""}</td>
                          <td className="p-2 text-right">{e.entryType === "CREDIT" ? fmt(e.amount) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
