import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getInvoices } from "@/services/invoice";
import { getCustomerPayments } from "@/services/customerPayment";
import { getCreditDebitNotes } from "@/services/creditDebitNote";
import { getLedgerStatement } from "@/services/financialReport";
import { currentMonthRange } from "@/constants/accountingPaths";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN");
}

/**
 * Section 4 — outstanding invoices, payments, credit notes, customer ledger.
 * Reuses existing list APIs (contract).
 */
export default function Customer360Tabs({ customerId, ledgerId, refreshKey = 0 }) {
  const { toast } = useToast();
  const [tab, setTab] = useState("invoices");
  const month = currentMonthRange();

  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [ledger, setLedger] = useState(null);
  const [ledgerFrom, setLedgerFrom] = useState(month.startDate);
  const [ledgerTo, setLedgerTo] = useState(month.endDate);
  const [expandedRows, setExpandedRows] = useState({});
  const [loading, setLoading] = useState(false);

  const loadInvoices = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await getInvoices({
        customerId,
        status: "outstanding",
        page: 1,
        limit: 50,
      });
      setInvoices(res.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load invoices" });
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, toast]);

  const loadPayments = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await getCustomerPayments({
        customerId,
        page: 1,
        limit: 50,
      });
      setPayments(res.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load payments" });
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, toast]);

  const loadNotes = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await getCreditDebitNotes({
        type: "credit",
        customerId,
        page: 1,
        limit: 50,
      });
      setNotes(res.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load credit notes" });
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [customerId, toast]);

  const loadLedgerForRange = useCallback(
    async (from, to) => {
      if (!ledgerId) {
        setLedger(null);
        toast({ variant: "destructive", title: "Customer has no linked ledger" });
        return;
      }
      setLoading(true);
      try {
        const res = await getLedgerStatement({
          ledgerId,
          from: from || undefined,
          to: to || undefined,
        });
        setLedger(res.data);
        setExpandedRows({});
      } catch {
        toast({ variant: "destructive", title: "Failed to load ledger statement" });
        setLedger(null);
      } finally {
        setLoading(false);
      }
    },
    [ledgerId, toast]
  );

  const loadLedger = useCallback(() => {
    loadLedgerForRange(ledgerFrom, ledgerTo);
  }, [ledgerFrom, ledgerTo, loadLedgerForRange]);

  useEffect(() => {
    if (!customerId) return;
    if (tab === "invoices") loadInvoices();
    else if (tab === "payments") loadPayments();
    else if (tab === "notes") loadNotes();
  }, [customerId, tab, refreshKey, loadInvoices, loadPayments, loadNotes]);

  useEffect(() => {
    if (!customerId || tab !== "ledger") return;
    const range = currentMonthRange();
    setLedgerFrom(range.startDate);
    setLedgerTo(range.endDate);
    loadLedgerForRange(range.startDate, range.endDate);
  }, [customerId, tab, refreshKey, loadLedgerForRange]);

  useEffect(() => {
    const range = currentMonthRange();
    setInvoices([]);
    setPayments([]);
    setNotes([]);
    setLedger(null);
    setLedgerFrom(range.startDate);
    setLedgerTo(range.endDate);
    setTab("invoices");
  }, [customerId]);

  return (
    <div className="space-y-2 pb-4 min-h-[360px]">
      <h2 className="text-sm font-semibold text-muted-foreground">Documents & ledger</h2>
      <Tabs value={tab} onValueChange={setTab} className="w-full min-h-[320px]">
        <TabsList className="w-full justify-start flex-wrap h-auto">
          <TabsTrigger value="invoices" className="text-xs">Outstanding invoices</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs">Credit notes</TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs">Customer ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="mt-2 min-h-[280px]">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
          ) : invoices.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              No outstanding invoices
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-xs">
                    <th className="p-2 text-left">Invoice</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2 text-right">Paid</th>
                    <th className="p-2 text-left">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b">
                      <td className="p-2 font-mono text-xs">{inv.invoiceNo}</td>
                      <td className="p-2 text-xs">{inv.status}</td>
                      <td className="p-2 text-right">{fmt(inv.totalAmount)}</td>
                      <td className="p-2 text-right">{fmt(inv.paidAmount)}</td>
                      <td className="p-2 text-xs">{fmtDate(inv.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-2 min-h-[280px]">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
          ) : payments.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">No payments</Card>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-xs">
                    <th className="p-2 text-left">Receipt</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Method</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b">
                      <td className="p-2 font-mono text-xs">{p.receiptNumber}</td>
                      <td className="p-2 text-xs">{fmtDate(p.paymentDate)}</td>
                      <td className="p-2 text-xs">{p.paymentMethod}</td>
                      <td className="p-2 text-right font-medium">{fmt(p.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-2 min-h-[280px]">
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
          ) : notes.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">No credit notes</Card>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-xs">
                    <th className="p-2 text-left">Note</th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {notes.map((n) => (
                    <tr key={n.id} className="border-b">
                      <td className="p-2 font-mono text-xs">{n.noteNumber}</td>
                      <td className="p-2 text-xs">{fmtDate(n.noteDate)}</td>
                      <td className="p-2 text-xs">{n.status}</td>
                      <td className="p-2 text-right">{fmt(n.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="ledger" className="mt-2 min-h-[280px] space-y-2">
          <Card className="p-2">
            <div className="flex flex-wrap gap-2 items-end">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Input
                  type="date"
                  className="h-8 w-36 text-sm"
                  value={ledgerFrom}
                  onChange={(e) => setLedgerFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Input
                  type="date"
                  className="h-8 w-36 text-sm"
                  value={ledgerTo}
                  onChange={(e) => setLedgerTo(e.target.value)}
                />
              </div>
              <Button size="sm" className="h-8" onClick={loadLedger} disabled={loading || !customerId}>
                {loading ? "Loading…" : "Generate"}
              </Button>
            </div>
          </Card>
          <div>
            {!ledger && !loading ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                No ledger data for the selected period.
              </Card>
            ) : loading && !ledger ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">Loading…</Card>
            ) : ledger ? (
              <div className="space-y-2">
                <div className="flex gap-4 text-sm px-1">
                  <span>
                    <span className="text-muted-foreground">Opening: </span>
                    <strong>{fmt(ledger.openingBalance)}</strong>
                  </span>
                  <span>
                    <span className="text-muted-foreground">Closing: </span>
                    <strong>{fmt(ledger.closingBalance)}</strong>
                  </span>
                </div>
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
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
                      {(ledger.entries || []).map((e, i) => {
                        const hasBreakdown =
                          e.breakdown?.items?.length > 0 ||
                          parseFloat(e.breakdown?.advanceAmount || 0) > 0;
                        const isExpanded = expandedRows[i];
                        return (
                          <Fragment key={`entry-${i}`}>
                            <tr className="border-b hover:bg-muted/40">
                              <td className="p-2">{fmtDate(e.date)}</td>
                              <td className="p-2 font-mono text-xs">
                                {hasBreakdown ? (
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-left hover:text-primary"
                                    onClick={() =>
                                      setExpandedRows((prev) => ({
                                        ...prev,
                                        [i]: !prev[i],
                                      }))
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
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
