import { useState, useEffect, useCallback } from "react";
import { CheckCircle2, Circle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Refresh } from "@/components/ui/Refresh";
import { getBankStatement, markReconciled } from "@/services/bankReconciliation";
import { getLedgers } from "@/services/ledger";
import { STATUS_OPTIONS } from "./BankReconciliation.constants";

const fmt = (v) =>
  `₹${parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function BankReconciliationMain() {
  const { toast } = useToast();

  // Filter state
  const [ledgers, setLedgers] = useState([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("all");

  // Statement data
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [summary, setSummary] = useState({
    openingBalance: 0,
    closingBalance: 0,
    totalEntries: 0,
  });

  // Selection state
  const [selected, setSelected] = useState(new Set());
  const [reconciling, setReconciling] = useState(false);

  const fetchLedgers = useCallback(async () => {
    try {
      const res = await getLedgers({ limit: 200, type: "ASSET" });
      setLedgers(res.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load bank accounts" });
    }
  }, []);

  const fetchStatement = useCallback(async () => {
    if (!selectedLedgerId) return;
    setIsLoading(true);
    setSelected(new Set());
    try {
      const params = {
        ledgerId: selectedLedgerId,
        from: fromDate,
        to: toDate,
        ...(statusFilter === "reconciled" && { isReconciled: "true" }),
        ...(statusFilter === "unreconciled" && { isReconciled: "false" }),
      };
      const res = await getBankStatement(params);
      const statement = res.data || {};
      const txns = statement.transactions || [];
      setTransactions(txns);
      setSummary({
        openingBalance: statement.openingBalance ?? 0,
        closingBalance: statement.currentBalance ?? 0,
        totalEntries: txns.length,
      });
    } catch {
      toast({ variant: "destructive", title: "Failed to load bank statement" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedLedgerId, fromDate, toDate, statusFilter, refreshKey]);

  useEffect(() => {
    fetchLedgers();
  }, [fetchLedgers]);

  useEffect(() => {
    fetchStatement();
  }, [fetchStatement]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    toast({ title: "Refreshed" });
  };

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const unreconciledTxns = transactions.filter((t) => !t.isReconciled);

  const handleSelectAllUnreconciled = () => {
    setSelected(new Set(unreconciledTxns.map((t) => t.transactionId)));
  };

  const handleClearSelection = () => {
    setSelected(new Set());
  };

  const handleMarkReconciled = async () => {
    if (selected.size === 0) return;
    setReconciling(true);
    try {
      await markReconciled({
        transactionIds: Array.from(selected),
        isReconciled: true,
        reconciledNote: "",
      });
      toast({ title: `${selected.size} transaction(s) marked as reconciled` });
      setSelected(new Set());
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Reconciliation failed" });
    } finally {
      setReconciling(false);
    }
  };

  const summaryCards = [
    { label: "Opening Balance", value: fmt(summary.openingBalance) },
    { label: "Closing Balance", value: fmt(summary.closingBalance) },
    { label: "Total Entries", value: summary.totalEntries },
    { label: "Selected", value: selected.size },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Bank Reconciliation
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Match and reconcile bank transactions
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="p-2 sm:p-2 flex-shrink-0">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-40 space-y-1">
            <Label className="text-xs">Bank / Cash Account</Label>
            <Select value={selectedLedgerId} onValueChange={setSelectedLedgerId}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent>
                {ledgers.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.ledgerName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Refresh onClick={handleRefresh} />
        </div>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="text-lg font-bold mt-0.5">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action bar (shown when rows are selected) */}
      {selectedLedgerId && (
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleSelectAllUnreconciled}
            disabled={unreconciledTxns.length === 0}
          >
            Select All Unreconciled ({unreconciledTxns.length})
          </Button>
          {selected.size > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleClearSelection}
              >
                Clear Selection
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleMarkReconciled}
                disabled={reconciling}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {reconciling
                  ? "Reconciling..."
                  : `Mark ${selected.size} as Reconciled`}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Transaction rows */}
      <div className="flex-1 min-h-0 overflow-auto">
        {!selectedLedgerId ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Select a bank account to view transactions
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No transactions found for the selected filters
          </div>
        ) : (
          <div className="border rounded-md divide-y text-xs">
            {/* Header */}
            <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-3 py-2 bg-muted/40 font-medium text-muted-foreground text-xs items-center">
              <span className="w-4" />
              <span>Description</span>
              <span className="text-right w-28">Debit</span>
              <span className="text-right w-28">Credit</span>
              <span className="w-6 text-center">
                <RefreshCw className="h-3 w-3 mx-auto" />
              </span>
            </div>
            {transactions.map((t) => {
              const debitAmt = t.entryType === "DEBIT" ? parseFloat(t.amount || 0) : 0;
              const creditAmt = t.entryType === "CREDIT" ? parseFloat(t.amount || 0) : 0;
              return (
              <div
                key={t.transactionId}
                className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 px-3 py-2.5 items-center transition-colors ${
                  selected.has(t.transactionId) ? "bg-primary/5" : "hover:bg-muted/20"
                } ${t.isReconciled ? "opacity-60" : ""}`}
              >
                <Checkbox
                  checked={selected.has(t.transactionId)}
                  onCheckedChange={() => toggleRow(t.transactionId)}
                  disabled={t.isReconciled}
                  className="mt-0.5"
                />
                <div>
                  <p className="font-medium">{t.description || "—"}</p>
                  <p className="text-muted-foreground">
                    {new Date(t.transactionDate).toLocaleDateString("en-IN")}
                    {t.transactionNumber ? ` · ${t.transactionNumber}` : ""}
                  </p>
                </div>
                <span className="text-right w-28 font-mono">
                  {debitAmt > 0 ? fmt(debitAmt) : "—"}
                </span>
                <span className="text-right w-28 font-mono text-green-700">
                  {creditAmt > 0 ? fmt(creditAmt) : "—"}
                </span>
                <span className="w-6 text-center">
                  {t.isReconciled ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mx-auto" />
                  ) : (
                    <Circle className="h-3.5 w-3.5 text-muted-foreground mx-auto" />
                  )}
                </span>
              </div>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
