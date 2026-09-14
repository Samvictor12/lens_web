import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { getLedgerStatement } from "@/services/financialReport";
import { getLedgers } from "@/services/ledger";
import { fmt, todayInputDate } from "./reportUtils";
import { ReportExportButtons, downloadExcel, exportPdf, tableHtml } from "./reportExport";

function monthStartFrom(dateStr) {
  if (!dateStr) return "";
  const [y, m] = dateStr.split("-");
  return `${y}-${m}-01`;
}

export default function LedgerStatementReport({ defaultAsOf, compact = false }) {
  const { toast } = useToast();
  const resolvedAsOf = defaultAsOf || todayInputDate();
  const [ledgerId, setLedgerId] = useState("");
  const [from, setFrom] = useState(monthStartFrom(resolvedAsOf));
  const [to, setTo] = useState(resolvedAsOf);
  const [ledgers, setLedgers] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const res = await getLedgers({ page: 1, limit: 500 });
        const list = res?.data || [];
        setLedgers(
          list
            .filter((l) => l.allowsDirectPosting !== false && l.isGroupLedger !== true)
            .map((l) => ({
              id: l.id,
              name: `${l.ledgerCode} — ${l.ledgerName}`,
            }))
        );
      } catch {
        // non-critical
      }
    })();
  }, []);

  useEffect(() => {
    setFrom(monthStartFrom(resolvedAsOf));
    setTo(resolvedAsOf);
  }, [resolvedAsOf]);

  const load = async () => {
    if (!ledgerId) {
      toast({ variant: "destructive", title: "Select a ledger" });
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const res = await getLedgerStatement({
        ledgerId,
        from: from || undefined,
        to: to || undefined,
      });
      setData(res.data);
      setExpandedRows({});
    } catch {
      toast({ variant: "destructive", title: "Failed to load ledger statement" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1 w-64">
          <Label className="text-xs">Ledger</Label>
          <FormSelect
            options={ledgers}
            value={ledgerId || null}
            onChange={(v) => setLedgerId(v != null ? String(v) : "")}
            placeholder="Select ledger"
            isSearchable
            isClearable
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">From</Label>
          <Input
            type="date"
            className="h-8 w-36 text-sm"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">To</Label>
          <Input
            type="date"
            className="h-8 w-36 text-sm"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button size="sm" onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Generate"}
        </Button>
        <ReportExportButtons
          disabled={!data}
          onExcel={() => {
            const rows = (data.entries || []).map((e) => [
              e.date,
              e.transactionNumber,
              e.referenceNumber || "",
              e.narration,
              e.debit,
              e.credit,
              e.balance,
            ]);
            downloadExcel({
              filename: `general-ledger_${from}_${to}`,
              sheetName: "General Ledger",
              headers: ["Date", "Txn No", "Ref", "Narration", "Debit", "Credit", "Balance"],
              rows,
            });
          }}
          onPdf={() => {
            const rows = (data.entries || []).map((e) => [
              e.date,
              e.transactionNumber,
              e.referenceNumber || "",
              e.narration,
              e.debit,
              e.credit,
              e.balance,
            ]);
            exportPdf(
              "General Ledger",
              tableHtml(
                ["Date", "Txn No", "Ref", "Narration", "Debit", "Credit", "Balance"],
                rows,
                `General Ledger ${data.ledger?.ledgerName || ""}`
              )
            );
          }}
        />
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.ledger?.ledgerCode} — {data.ledger?.ledgerName}
          </span>
        )}
      </div>

      {!data ? (
        <p className="text-sm text-muted-foreground">
          Select a ledger and generate the statement.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <span className="text-muted-foreground">Opening: </span>
              <strong>{fmt(data.openingBalance)}</strong>
            </span>
            <span>
              <span className="text-muted-foreground">Closing: </span>
              <strong>{fmt(data.closingBalance)}</strong>
            </span>
          </div>
          <div className="overflow-x-auto rounded-md border">
            <table className={`w-full ${compact ? "text-xs" : "text-sm"}`}>
              <thead>
                <tr className="bg-muted text-xs">
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Txn No.</th>
                  <th className="p-2 text-left">Ref.</th>
                  <th className="p-2 text-left">Narration</th>
                  <th className="p-2 text-right">Debit</th>
                  <th className="p-2 text-right">Credit</th>
                  <th className="p-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {(data.entries || []).map((e, i) => {
                  const hasBreakdown =
                    e.breakdown?.items?.length > 0 ||
                    parseFloat(e.breakdown?.advanceAmount || 0) > 0;
                  const isExpanded = expandedRows[i];
                  return (
                    <Fragment key={`entry-${i}`}>
                      <tr className="border-b hover:bg-muted/40">
                        <td className="p-2">
                          {new Date(e.date).toLocaleDateString("en-IN")}
                        </td>
                        <td className="p-2 font-mono text-xs">
                          {hasBreakdown ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-left hover:text-primary"
                              onClick={() =>
                                setExpandedRows((prev) => ({ ...prev, [i]: !prev[i] }))
                              }
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-3 w-3 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3 w-3 shrink-0" />
                              )}
                              {e.transactionNumber}
                            </button>
                          ) : (
                            e.transactionNumber
                          )}
                        </td>
                        <td className="p-2 text-xs text-muted-foreground">
                          {e.referenceNumber || "—"}
                        </td>
                        <td className="p-2 text-xs">{e.narration}</td>
                        <td className="p-2 text-right">
                          {parseFloat(e.debit) > 0 ? fmt(e.debit) : ""}
                        </td>
                        <td className="p-2 text-right">
                          {parseFloat(e.credit) > 0 ? fmt(e.credit) : ""}
                        </td>
                        <td className="p-2 text-right font-medium">{fmt(e.balance)}</td>
                      </tr>
                      {isExpanded && e.breakdown && (
                        <tr className="bg-muted/20">
                          <td colSpan={7} className="p-2 text-xs text-muted-foreground">
                            {(e.breakdown.items || [])
                              .map(
                                (it) =>
                                  `${it.invoiceNo || it.documentNo}: ${fmt(it.amount)}`
                              )
                              .join(" · ")}
                            {parseFloat(e.breakdown.advanceAmount || 0) > 0 &&
                              ` · Advance ${fmt(e.breakdown.advanceAmount)}`}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
