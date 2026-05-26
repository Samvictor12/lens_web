import { useState, useEffect, useCallback } from "react";
import { Plus, Search, TrendingDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input as DateInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getExpenses, getExpenseSummary, createExpense, getExpenseCategories,
} from "@/services/expense";
import { getCashBankLedgers } from "@/services/ledger";

const emptyForm = {
  categoryId: "",
  description: "",
  amount: "",
  expenseDate: new Date().toISOString().split("T")[0],
  paidTo: "",
  bankLedgerId: "",
  notes: "",
};

export default function ExpensesMain() {
  const { toast } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  const [categories, setCategories] = useState([]);
  const [bankLedgers, setBankLedgers] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadMeta = useCallback(async () => {
    try {
      const [catRes, bankRes] = await Promise.all([getExpenseCategories(), getCashBankLedgers()]);
      setCategories(catRes.data || []);
      setBankLedgers(bankRes.data || []);
    } catch {
      // silently fail — not critical for load
    }
  }, []);

  const fetchExpenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (search) params.search = search;
      const [expRes, sumRes] = await Promise.all([
        getExpenses(params),
        getExpenseSummary(),
      ]);
      setExpenses(expRes.data || []);
      setTotal(expRes.pagination?.total || expRes.data?.length || 0);
      setSummary(sumRes.data || null);
    } catch {
      toast({ variant: "destructive", title: "Failed to load expenses" });
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, toast]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleCreate = async () => {
    if (!form.categoryId || !form.amount) {
      toast({ variant: "destructive", title: "Category and amount are required" });
      return;
    }
    setSaving(true);
    try {
      await createExpense({
        categoryId: parseInt(form.categoryId),
        description: form.description,
        amount: parseFloat(form.amount),
        expenseDate: form.expenseDate,
        paidTo: form.paidTo || null,
        bankLedgerId: form.bankLedgerId ? parseInt(form.bankLedgerId) : null,
        notes: form.notes || null,
      });
      toast({ title: "Expense recorded" });
      setDialogOpen(false);
      setForm(emptyForm);
      fetchExpenses();
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Failed to create expense" });
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      accessorKey: "expenseNumber", header: "No.",
      cell: ({ value }) => <span className="font-mono text-xs">{value}</span>,
    },
    {
      accessorKey: "expenseDate", header: "Date",
      cell: ({ value }) => <span>{new Date(value).toLocaleDateString("en-IN")}</span>,
    },
    {
      accessorKey: "category", header: "Category",
      cell: ({ row }) => <span className="font-medium">{row.category?.name || "—"}</span>,
    },
    {
      accessorKey: "description", header: "Description",
      cell: ({ value }) => <span className="text-muted-foreground text-sm">{value || "—"}</span>,
    },
    {
      accessorKey: "paidTo", header: "Paid To",
      cell: ({ value }) => <span className="text-sm">{value || "—"}</span>,
    },
    {
      accessorKey: "amount", header: "Amount", align: "right",
      cell: ({ value }) => <span className="font-semibold">₹{parseFloat(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>,
    },
  ];

  const fmt = (v) => `₹${parseFloat(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

  return (
    <div className="p-2 sm:p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><TrendingDown className="h-5 w-5" />Expenses</h1>
          <p className="text-xs text-muted-foreground">Track all business expenses</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" />Add Expense</Button>
      </div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">This Month</p><p className="text-lg font-bold">{fmt(summary.thisMonth)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Last Month</p><p className="text-lg font-bold">{fmt(summary.lastMonth)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">This Year</p><p className="text-lg font-bold">{fmt(summary.thisYear)}</p></CardContent></Card>
          <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-bold">{fmt(summary.total)}</p></CardContent></Card>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder="Search expenses..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={expenses}
          totalCount={total}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          isLoading={isLoading}
          emptyMessage="No expenses found"
        />
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Expense</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select value={form.categoryId} onValueChange={v => setForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" value={form.expenseDate} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Amount (₹) *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label>Paid To</Label>
                <Input value={form.paidTo} onChange={e => setForm(f => ({ ...f, paidTo: e.target.value }))} placeholder="Person / vendor name" />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Payment Account</Label>
              <Select value={form.bankLedgerId} onValueChange={v => setForm(f => ({ ...f, bankLedgerId: v }))}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Cash / Bank account" /></SelectTrigger>
                <SelectContent>
                  {bankLedgers.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.ledgerName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Record Expense"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
