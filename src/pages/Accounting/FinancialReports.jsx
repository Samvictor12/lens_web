import { useState, Fragment, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BarChart3, TrendingUp, BookOpen, Scale, CalendarDays, Banknote, ChevronDown, ChevronRight, ExternalLink, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getLedgers } from "@/services/ledger";
import {
  getProfitLoss, getLedgerStatement, getTrialBalance, getDayBook, getCashBankBook,
  getGroupSummary, getBalanceSheet,
} from "@/services/financialReport";
import { getAccountGroupTree, flattenAccountGroups } from "@/services/accountGroup";
import {
  invoiceDetailPath,
  purchaseOrderDetailPath,
} from "@/constants/accountingPaths";

const fmt = (v, sign = true) => {
  const n = parseFloat(v || 0);
  const s = `₹${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  return n < 0 ? `-${s}` : s;
};

const todayInputDate = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};

// ── Profit & Loss ──────────────────────────────────────────────────────────

function ProfitLoss() {
  const { toast } = useToast();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getProfitLoss({ from: from || undefined, to: to || undefined });
      setData(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load P&L" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const Section = ({ title, children, total, totalLabel = "Total", accent = "" }) => (
    <div className="space-y-1">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
      {children}
      <div className={`flex justify-between items-center px-3 py-2 rounded font-bold text-sm ${accent || "bg-muted"}`}>
        <span>{totalLabel}</span><span>{total}</span>
      </div>
    </div>
  );

  const Row = ({ label, code, amount }) => (
    <div className="flex justify-between items-center px-3 py-1.5 text-sm hover:bg-muted/50 rounded">
      <span>{code && <span className="font-mono text-xs text-muted-foreground mr-2">{code}</span>}{label}</span>
      <span className="font-medium">{fmt(amount)}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" className="h-8 w-36 text-sm" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" className="h-8 w-36 text-sm" value={to} onChange={e => setTo(e.target.value)} /></div>
        <Button size="sm" onClick={load} disabled={loading}>{loading ? "Loading..." : "Generate"}</Button>
      </div>

      {data && (
        <div className="space-y-4">
          <Section title="Revenue" total={fmt(data.income?.total)}>
            {data.income?.breakdown?.map(r => <Row key={r.ledgerCode} code={r.ledgerCode} label={r.ledgerName} amount={r.amount} />)}
          </Section>

          <div className="flex justify-between items-center px-3 py-2 bg-yellow-50 rounded text-sm">
            <span className="font-medium">GST Output Payable ({data.gstOutput?.ledgerName})</span>
            <span className="font-medium text-yellow-700">— {fmt(data.gstOutput?.total)}</span>
          </div>

          <div className="flex justify-between items-center px-3 py-2 bg-blue-50 rounded font-bold">
            <span>Net Revenue</span><span>{fmt(data.netRevenue)}</span>
          </div>

          <Section title="Cost of Goods Sold" total={fmt(data.costOfGoodsSold?.total)}>
            {data.costOfGoodsSold?.breakdown?.map(r => <Row key={r.ledgerCode} code={r.ledgerCode} label={r.ledgerName} amount={r.amount} />)}
          </Section>

          <div className="flex justify-between items-center px-3 py-2 bg-blue-100 rounded font-bold">
            <span>Gross Profit</span><span>{fmt(data.grossProfit)}</span>
          </div>

          <div className="flex justify-between items-center px-3 py-2 bg-green-50 rounded text-sm">
            <span className="font-medium">GST Input Credit ({data.gstInput?.ledgerName})</span>
            <span className="font-medium text-green-700">+ {fmt(data.gstInput?.total)}</span>
          </div>

          <Section title="Operating Expenses" total={fmt(data.operatingExpenses?.total)}>
            {data.operatingExpenses?.breakdown?.map(r => <Row key={r.ledgerCode} code={r.ledgerCode} label={r.ledgerName} amount={r.amount} />)}
          </Section>

          <div className={`flex justify-between items-center px-4 py-3 rounded-lg font-bold text-base ${data.isProfit ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            <span>{data.isProfit ? "Net Profit" : "Net Loss"}</span>
            <span>{fmt(data.netProfit)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Ledger Statement ───────────────────────────────────────────────────────

function LedgerStatement() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [ledgers, setLedgers] = useState([]);
  const [ledgerId, setLedgerId] = useState(searchParams.get("ledgerId") || "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    getLedgers({ limit: 200 }).then(r => setLedgers(r.data || [])).catch(() => {});
  }, []);

  const load = async () => {
    if (!ledgerId) { toast({ variant: "destructive", title: "Select a ledger" }); return; }
    setLoading(true);
    try {
      const res = await getLedgerStatement({ ledgerId, from: from || undefined, to: to || undefined });
      setData(res.data);
      setExpandedRows({});
    } catch {
      toast({ variant: "destructive", title: "Failed to load statement" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1 w-56">
          <Label className="text-xs">Ledger <span className="text-red-500">*</span></Label>
          <Select value={ledgerId} onValueChange={setLedgerId}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select ledger" /></SelectTrigger>
            <SelectContent>{ledgers.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.ledgerCode} — {l.ledgerName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" className="h-8 w-36 text-sm" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" className="h-8 w-36 text-sm" value={to} onChange={e => setTo(e.target.value)} /></div>
        <Button size="sm" onClick={load} disabled={loading}>{loading ? "Loading..." : "Generate"}</Button>
      </div>

      {data && (
        <div className="space-y-2">
          <div className="flex gap-4 text-sm">
            <span><span className="text-muted-foreground">Opening: </span><strong>{fmt(data.openingBalance)}</strong></span>
            <span><span className="text-muted-foreground">Closing: </span><strong>{fmt(data.closingBalance)}</strong></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted text-xs">
                <th className="p-2 text-left">Date</th><th className="p-2 text-left">Txn No.</th><th className="p-2 text-left">Ref.</th>
                <th className="p-2 text-left">Narration</th><th className="p-2 text-right">Debit</th><th className="p-2 text-right">Credit</th><th className="p-2 text-right">Balance</th>
              </tr></thead>
              <tbody>
                {data.entries.map((e, i) => {
                  const hasBreakdown = e.breakdown?.items?.length > 0 || parseFloat(e.breakdown?.advanceAmount || 0) > 0;
                  const isExpanded = expandedRows[i];
                  const b = e.breakdown;

                  return (
                    <Fragment key={`entry-${i}`}>
                      <tr className="border-b hover:bg-muted/40">
                        <td className="p-2">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                        <td className="p-2 font-mono text-xs">
                          {hasBreakdown ? (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-left hover:text-primary"
                              onClick={() => setExpandedRows((prev) => ({ ...prev, [i]: !prev[i] }))}
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
                        <td className="p-2 text-xs text-muted-foreground">{e.referenceNumber || "—"}</td>
                        <td className="p-2 text-xs">{e.narration}</td>
                        <td className="p-2 text-right">{parseFloat(e.debit) > 0 ? fmt(e.debit) : ""}</td>
                        <td className="p-2 text-right">{parseFloat(e.credit) > 0 ? fmt(e.credit) : ""}</td>
                        <td className="p-2 text-right font-medium">{fmt(e.balance)}</td>
                      </tr>
                      {hasBreakdown && isExpanded && b && (
                        <tr className="border-b bg-muted/20">
                          <td colSpan={7} className="p-2 pl-6">
                            <div className="max-w-lg space-y-1">
                              {b.items.map((item) => {
                                const isCustomer = b.type === "customer";
                                const label = isCustomer
                                  ? item.invoice?.invoiceNo || `INV #${item.invoiceId}`
                                  : item.purchaseOrder?.poNumber || `PO #${item.purchaseOrderId}`;
                                const path = isCustomer
                                  ? invoiceDetailPath(item.invoiceId)
                                  : purchaseOrderDetailPath(item.purchaseOrderId);
                                return (
                                  <div key={item.id} className="flex items-center gap-2 text-xs pl-4">
                                    <span className="text-muted-foreground">└</span>
                                    <button
                                      type="button"
                                      className="text-primary hover:underline inline-flex items-center gap-1"
                                      onClick={() => navigate(path)}
                                    >
                                      {label}
                                      <ExternalLink className="h-3 w-3" />
                                    </button>
                                    <span className="ml-auto font-mono">
                                      {fmt(item.allocatedAmount)}
                                    </span>
                                  </div>
                                );
                              })}
                              {parseFloat(b.advanceAmount || 0) > 0 && (
                                <div className="flex items-center gap-2 text-xs pl-4 text-blue-700">
                                  <span className="text-muted-foreground">└</span>
                                  <span>Advance credit</span>
                                  <span className="ml-auto font-mono">{fmt(b.advanceAmount)}</span>
                                </div>
                              )}
                            </div>
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

// ── Trial Balance ──────────────────────────────────────────────────────────

function TrialBalance() {
  const { toast } = useToast();
  const [asOf, setAsOf] = useState(todayInputDate());
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

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1"><Label className="text-xs">As Of</Label><Input type="date" className="h-8 w-36 text-sm" value={asOf} onChange={e => setAsOf(e.target.value)} /></div>
        <Button size="sm" onClick={load} disabled={loading}>{loading ? "Loading..." : "Generate"}</Button>
        {data && <Badge variant={data.isBalanced ? "default" : "destructive"} className="ml-2">{data.isBalanced ? "Balanced" : "Out of Balance!"}</Badge>}
      </div>

      {data && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-muted text-xs">
              <th className="p-2 text-left">Code</th><th className="p-2 text-left">Ledger</th><th className="p-2 text-left">Type</th>
              <th className="p-2 text-right">Debit</th><th className="p-2 text-right">Credit</th><th className="p-2 text-right">Balance</th>
            </tr></thead>
            <tbody>
              {data.ledgers.map((l, i) => (
                <tr key={i} className="border-b hover:bg-muted/40">
                  <td className="p-2 font-mono text-xs">{l.ledgerCode}</td>
                  <td className="p-2">{l.ledgerName}</td>
                  <td className="p-2"><Badge variant="outline" className="text-xs">{l.ledgerType}</Badge></td>
                  <td className="p-2 text-right">{parseFloat(l.totalDebit) > 0 ? fmt(l.totalDebit) : "—"}</td>
                  <td className="p-2 text-right">{parseFloat(l.totalCredit) > 0 ? fmt(l.totalCredit) : "—"}</td>
                  <td className="p-2 text-right font-medium">{fmt(l.netBalance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="bg-muted font-bold text-sm">
              <td colSpan={3} className="p-2">Total</td>
              <td className="p-2 text-right">{fmt(data.totalDebit)}</td>
              <td className="p-2 text-right">{fmt(data.totalCredit)}</td>
              <td className="p-2"></td>
            </tr></tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Day Book ───────────────────────────────────────────────────────────────

function DayBook() {
  const { toast } = useToast();
  const [date, setDate] = useState(todayInputDate());
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

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" className="h-8 w-36 text-sm" value={date} onChange={e => setDate(e.target.value)} /></div>
        <Button size="sm" onClick={load} disabled={loading}>{loading ? "Loading..." : "Show"}</Button>
        {data && <span className="text-sm text-muted-foreground">{data.totalTransactions} transactions · {fmt(data.totalAmount)}</span>}
      </div>

      {data && (
        <div className="space-y-2">
          {data.transactions.length === 0 && <p className="text-sm text-muted-foreground">No transactions for this date.</p>}
          {data.transactions.map((t, i) => (
            <Card key={i} className="overflow-hidden">
              <div className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50" onClick={() => setExpanded(expanded === i ? null : i)}>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-mono font-medium">{t.transactionNumber}</span>
                  <Badge variant="outline" className="text-xs">{t.transactionType}</Badge>
                  <span className="text-muted-foreground">{t.description}</span>
                </div>
                <span className="font-semibold text-sm">{fmt(t.totalAmount)}</span>
              </div>
              {expanded === i && (
                <div className="border-t">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-muted/50"><th className="p-2 text-left">Ledger</th><th className="p-2 text-right">Dr</th><th className="p-2 text-right">Cr</th></tr></thead>
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

// ── Cash / Bank Book ───────────────────────────────────────────────────────

function CashBankBook() {
  const { toast } = useToast();
  const [ledgers, setLedgers] = useState([]);
  const [ledgerId, setLedgerId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getLedgers({ limit: 200, type: "ASSET" }).then(r => setLedgers(r.data || [])).catch(() => {});
  }, []);

  const load = async () => {
    if (!ledgerId) { toast({ variant: "destructive", title: "Select a ledger" }); return; }
    setLoading(true);
    try {
      const res = await getCashBankBook({ ledgerId, from: from || undefined, to: to || undefined });
      setData(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load book" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1 w-56">
          <Label className="text-xs">Account <span className="text-red-500">*</span></Label>
          <Select value={ledgerId} onValueChange={setLedgerId}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select account" /></SelectTrigger>
            <SelectContent>{ledgers.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.ledgerCode} — {l.ledgerName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" className="h-8 w-36 text-sm" value={from} onChange={e => setFrom(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" className="h-8 w-36 text-sm" value={to} onChange={e => setTo(e.target.value)} /></div>
        <Button size="sm" onClick={load} disabled={loading}>{loading ? "Loading..." : "Generate"}</Button>
      </div>

      {data && (
        <div className="space-y-2">
          <div className="flex gap-4 text-sm">
            <span><span className="text-muted-foreground">Opening: </span><strong>{fmt(data.openingBalance)}</strong></span>
            <span><span className="text-muted-foreground">Closing: </span><strong>{fmt(data.closingBalance)}</strong></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-muted text-xs">
                <th className="p-2 text-left">Date</th><th className="p-2 text-left">Txn No.</th><th className="p-2 text-left">Narration</th>
                <th className="p-2 text-right">In</th><th className="p-2 text-right">Out</th><th className="p-2 text-right">Balance</th>
              </tr></thead>
              <tbody>
                {data.entries.map((e, i) => (
                  <tr key={i} className="border-b hover:bg-muted/40">
                    <td className="p-2">{new Date(e.date).toLocaleDateString("en-IN")}</td>
                    <td className="p-2 font-mono text-xs">{e.transactionNumber}</td>
                    <td className="p-2 text-xs">{e.narration}</td>
                    <td className="p-2 text-right text-green-700">{parseFloat(e.debit) > 0 ? fmt(e.debit) : ""}</td>
                    <td className="p-2 text-right text-red-600">{parseFloat(e.credit) > 0 ? fmt(e.credit) : ""}</td>
                    <td className="p-2 text-right font-medium">{fmt(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Group Summary ──────────────────────────────────────────────────────────

function GroupSummary() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState(searchParams.get("groupId") || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getAccountGroupTree()
      .then((r) => setGroups(flattenAccountGroups(r.data || [])))
      .catch(() => {});
  }, []);

  const load = async () => {
    if (!groupId) {
      toast({ variant: "destructive", title: "Select a group" });
      return;
    }
    setLoading(true);
    try {
      const res = await getGroupSummary({ groupId });
      setData(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load group summary" });
    } finally {
      setLoading(false);
    }
  };

  const renderSummary = (s, depth = 0) => (
    <div key={s.group?.id || depth} className={depth > 0 ? "ml-4 border-l pl-3" : ""}>
      <div className="flex justify-between py-1 text-sm font-medium">
        <span>{s.group?.groupName}</span>
        <span>{fmt(s.totalBalance)}</span>
      </div>
      {s.ledgers?.map((l) => (
        <div key={l.id} className="flex justify-between py-0.5 text-xs pl-2 text-muted-foreground">
          <span>{l.ledgerCode} — {l.ledgerName}</span>
          <span>{fmt(l.balance)}</span>
        </div>
      ))}
      {s.childGroups?.map((c) => renderSummary(c, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1 w-64">
          <Label className="text-xs">Account Group <span className="text-red-500">*</span></Label>
          <Select value={groupId} onValueChange={setGroupId}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select group" /></SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={String(g.id)}>{g.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={load} disabled={loading}>{loading ? "Loading..." : "Generate"}</Button>
      </div>
      {data && renderSummary(data)}
    </div>
  );
}

// ── Balance Sheet ──────────────────────────────────────────────────────────

function BalanceSheet() {
  const { toast } = useToast();
  const [asOf, setAsOf] = useState(todayInputDate());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getBalanceSheet({ asOf: asOf || undefined });
      setData(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load balance sheet" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1"><Label className="text-xs">As Of</Label><Input type="date" className="h-8 w-36 text-sm" value={asOf} onChange={e => setAsOf(e.target.value)} /></div>
        <Button size="sm" onClick={load} disabled={loading}>{loading ? "Loading..." : "Generate"}</Button>
        {data && <Badge variant={data.isBalanced ? "default" : "destructive"}>{data.isBalanced ? "Balanced" : "Out of balance"}</Badge>}
      </div>
      {data && (
        <div className="space-y-4">
          {data.sections?.map((s) => (
            <div key={s.groupCode}>
              <h3 className="text-sm font-semibold uppercase text-muted-foreground">{s.groupName}</h3>
              <div className="flex justify-between py-2 font-bold border-b">
                <span>Total {s.groupName}</span><span>{fmt(s.totalBalance)}</span>
              </div>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4 text-sm pt-2">
            <div className="font-bold">Total Assets: {fmt(data.totalAssets)}</div>
            <div className="font-bold">Liabilities + Capital: {fmt(data.totalLiabilitiesAndCapital)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function FinancialReports() {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "pl";

  const navigate = useNavigate();

  return (
    <div className="p-2 sm:p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5" />Financial Reports</h1>
          <p className="text-xs text-muted-foreground">P&L, Group Summary, Balance Sheet, Ledger Statement, Trial Balance</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/accounts/gst-reports")}>
          <Receipt className="h-3.5 w-3.5" /> GST Reports
        </Button>
      </div>

      <Tabs defaultValue={defaultTab} key={defaultTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="pl" className="gap-1.5 text-xs"><TrendingUp className="h-3.5 w-3.5" />Profit & Loss</TabsTrigger>
          <TabsTrigger value="group" className="gap-1.5 text-xs"><BarChart3 className="h-3.5 w-3.5" />Group Summary</TabsTrigger>
          <TabsTrigger value="bs" className="gap-1.5 text-xs"><Scale className="h-3.5 w-3.5" />Balance Sheet</TabsTrigger>
          <TabsTrigger value="ledger" className="gap-1.5 text-xs"><BookOpen className="h-3.5 w-3.5" />Ledger Statement</TabsTrigger>
          <TabsTrigger value="trial" className="gap-1.5 text-xs"><Scale className="h-3.5 w-3.5" />Trial Balance</TabsTrigger>
          <TabsTrigger value="daybook" className="gap-1.5 text-xs"><CalendarDays className="h-3.5 w-3.5" />Day Book</TabsTrigger>
          <TabsTrigger value="cashbook" className="gap-1.5 text-xs"><Banknote className="h-3.5 w-3.5" />Cash/Bank Book</TabsTrigger>
        </TabsList>
        <Card className="mt-3">
          <CardContent className="p-4">
            <TabsContent value="pl" className="mt-0"><ProfitLoss /></TabsContent>
            <TabsContent value="group" className="mt-0"><GroupSummary /></TabsContent>
            <TabsContent value="bs" className="mt-0"><BalanceSheet /></TabsContent>
            <TabsContent value="ledger" className="mt-0"><LedgerStatement /></TabsContent>
            <TabsContent value="trial" className="mt-0"><TrialBalance /></TabsContent>
            <TabsContent value="daybook" className="mt-0"><DayBook /></TabsContent>
            <TabsContent value="cashbook" className="mt-0"><CashBankBook /></TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
