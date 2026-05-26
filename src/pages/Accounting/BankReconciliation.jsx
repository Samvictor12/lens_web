import { useState, useEffect, useCallback } from "react";
import { CheckCircle, Circle, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getBankStatement, markReconciled } from "@/services/bankReconciliation";
import { getLedgers } from "@/services/ledger";

export default function BankReconciliation() {
  const { toast } = useToast();
  const [ledgers, setLedgers] = useState([]);
  const [ledgerId, setLedgerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [statement, setStatement] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [selected, setSelected] = useState(new Set());
  const [markOpen, setMarkOpen] = useState(false);
  const [reconNote, setReconNote] = useState("");
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    getLedgers({ limit: 200, ledgerType: "ASSET" }).then(r => setLedgers(r.data || [])).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!ledgerId) return;
    setIsLoading(true);
    try {
      const params = { ledgerId };
      if (from) params.from = from;
      if (to) params.to = to;
      if (statusFilter !== "all") params.isReconciled = statusFilter === "reconciled" ? "true" : "false";
      const res = await getBankStatement(params);
      setStatement(res.data);
      setSelected(new Set());
    } catch {
      toast({ variant: "destructive", title: "Failed to load statement" });
    } finally {
      setIsLoading(false);
    }
  }, [ledgerId, from, to, statusFilter, toast]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (txnId) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(txnId)) next.delete(txnId);
      else next.add(txnId);
      return next;
    });
  };

  const selectAll = () => {
    const unreconciled = (statement?.entries || []).filter(e => !e.isReconciled).map(e => e.transactionId);
    setSelected(new Set(unreconciled));
  };

  const handleMark = async (isReconciled) => {
    if (selected.size === 0) {
      toast({ variant: "destructive", title: "Select at least one transaction" });
      return;
    }
    setMarking(true);
    try {
      await markReconciled({
        transactionIds: Array.from(selected),
        isReconciled,
        reconciledNote: reconNote || null,
      });
      toast({ title: `${selected.size} transaction(s) ${isReconciled ? "marked as reconciled" : "unreconciled"}` });
      setMarkOpen(false);
      setReconNote("");
      setSelected(new Set());
      load();
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Update failed" });
    } finally {
      setMarking(false);
    }
  };

  const fmt = (v) => `₹${parseFloat(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

  return (
    <div className="p-2 sm:p-4 space-y-3">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><RefreshCw className="h-5 w-5" />Bank Reconciliation</h1>
        <p className="text-xs text-muted-foreground">Reconcile bank statement with accounting entries</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 w-56">
              <Label className="text-xs">Bank Account *</Label>
              <Select value={ledgerId} onValueChange={setLedgerId}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select bank account" /></SelectTrigger>
                <SelectContent>{ledgers.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.ledgerCode} — {l.ledgerName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" className="h-8 w-36 text-sm" value={from} onChange={e => setFrom(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" className="h-8 w-36 text-sm" value={to} onChange={e => setTo(e.target.value)} /></div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-36 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unreconciled">Unreconciled</SelectItem>
                  <SelectItem value="reconciled">Reconciled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {statement && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Opening Balance</p><p className="font-bold">{fmt(statement.openingBalance)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Closing Balance</p><p className="font-bold">{fmt(statement.closingBalance)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total Entries</p><p className="font-bold">{statement.entries?.length || 0}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Selected</p><p className="font-bold">{selected.size}</p></CardContent></Card>
        </div>
      )}

      {/* Action bar */}
      {statement && (
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">Select All Unreconciled</Button>
          <Button variant="outline" size="sm" onClick={() => setSelected(new Set())} className="text-xs">Clear Selection</Button>
          {selected.size > 0 && (
            <Button size="sm" onClick={() => setMarkOpen(true)} className="gap-1.5 text-xs ml-auto">
              <CheckCircle className="h-3.5 w-3.5" />Mark {selected.size} as Reconciled
            </Button>
          )}
        </div>
      )}

      {/* Statement Table */}
      {statement && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted text-xs">
                <th className="p-2 w-8"></th>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Txn No.</th>
                <th className="p-2 text-left">Narration</th>
                <th className="p-2 text-right">Debit (In)</th>
                <th className="p-2 text-right">Credit (Out)</th>
                <th className="p-2 text-right">Balance</th>
                <th className="p-2 text-center">Status</th>
              </tr></thead>
              <tbody>
                {(statement.entries || []).map((e, i) => (
                  <tr
                    key={i}
                    className={`border-b cursor-pointer ${e.isReconciled ? "bg-green-50/50" : selected.has(e.transactionId) ? "bg-blue-50" : "hover:bg-muted/40"}`}
                    onClick={() => !e.isReconciled && toggleSelect(e.transactionId)}
                  >
                    <td className="p-2">
                      {!e.isReconciled && (
                        <input type="checkbox" readOnly checked={selected.has(e.transactionId)} className="h-3.5 w-3.5" />
                      )}
                    </td>
                    <td className="p-2 whitespace-nowrap">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                    <td className="p-2 font-mono text-xs">{e.transactionNumber}</td>
                    <td className="p-2 text-xs">{e.narration}</td>
                    <td className="p-2 text-right text-green-700">{parseFloat(e.debit) > 0 ? fmt(e.debit) : ""}</td>
                    <td className="p-2 text-right text-red-600">{parseFloat(e.credit) > 0 ? fmt(e.credit) : ""}</td>
                    <td className="p-2 text-right font-medium">{fmt(e.balance)}</td>
                    <td className="p-2 text-center">
                      {e.isReconciled
                        ? <Badge className="bg-green-100 text-green-800 border-0 text-xs gap-1"><CheckCircle className="h-3 w-3" />Done</Badge>
                        : <Badge variant="outline" className="text-xs text-muted-foreground">Pending</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(statement.entries?.length || 0) === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">No entries found</p>
            )}
          </div>
        </Card>
      )}

      {/* Mark Reconciled Dialog */}
      <Dialog open={markOpen} onOpenChange={setMarkOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark {selected.size} Transaction(s) as Reconciled</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Optionally add a reconciliation note.</p>
            <div className="space-y-1">
              <Label>Note</Label>
              <Textarea value={reconNote} onChange={e => setReconNote(e.target.value)} rows={2} placeholder="e.g. Verified against bank statement dated..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkOpen(false)}>Cancel</Button>
            <Button onClick={() => handleMark(true)} disabled={marking}>{marking ? "Updating..." : "Mark Reconciled"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
