import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Pencil, Trash2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getLedgers, createLedger, updateLedger, deleteLedger } from "@/services/ledger";

const LEDGER_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

const TYPE_COLORS = {
  ASSET: "bg-blue-100 text-blue-800",
  LIABILITY: "bg-red-100 text-red-800",
  EQUITY: "bg-purple-100 text-purple-800",
  INCOME: "bg-green-100 text-green-800",
  EXPENSE: "bg-orange-100 text-orange-800",
};

const emptyForm = { ledgerCode: "", ledgerName: "", ledgerType: "ASSET", openingBalance: "0" };

export default function ChartOfAccounts() {
  const { toast } = useToast();
  const [ledgers, setLedgers] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (search) params.search = search;
      if (typeFilter !== "all") params.ledgerType = typeFilter;
      const res = await getLedgers(params);
      setLedgers(res.data || []);
      setTotal(res.pagination?.total || (res.data?.length ?? 0));
    } catch {
      toast({ variant: "destructive", title: "Failed to load ledgers" });
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, typeFilter, toast]);

  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (l) => { setEditing(l); setForm({ ledgerCode: l.ledgerCode, ledgerName: l.ledgerName, ledgerType: l.ledgerType, openingBalance: l.openingBalance }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.ledgerCode || !form.ledgerName) {
      toast({ variant: "destructive", title: "Code and Name are required" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateLedger(editing.id, { ledgerName: form.ledgerName, ledgerType: form.ledgerType, openingBalance: parseFloat(form.openingBalance) || 0 });
        toast({ title: "Ledger updated" });
      } else {
        await createLedger({ ledgerCode: form.ledgerCode, ledgerName: form.ledgerName, ledgerType: form.ledgerType, openingBalance: parseFloat(form.openingBalance) || 0 });
        toast({ title: "Ledger created" });
      }
      setDialogOpen(false);
      fetch();
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteLedger(toDelete.id);
      toast({ title: "Ledger deleted" });
      setDeleteOpen(false);
      fetch();
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Delete failed" });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { accessorKey: "ledgerCode", header: "Code", cell: ({ value }) => <span className="font-mono text-sm font-medium">{value}</span> },
    { accessorKey: "ledgerName", header: "Ledger Name", cell: ({ value }) => <span className="font-medium">{value}</span> },
    {
      accessorKey: "ledgerType", header: "Type",
      cell: ({ value }) => <Badge className={`${TYPE_COLORS[value]} border-0 text-xs`}>{value}</Badge>,
    },
    {
      accessorKey: "openingBalance", header: "Opening Balance", align: "right",
      cell: ({ value }) => <span className="font-mono">₹{parseFloat(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>,
    },
    {
      accessorKey: "currentBalance", header: "Current Balance", align: "right",
      cell: ({ value }) => {
        const v = parseFloat(value || 0);
        return <span className={`font-mono font-semibold ${v < 0 ? "text-red-600" : "text-green-700"}`}>₹{v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>;
      },
    },
    {
      accessorKey: "id", header: "Actions", align: "right",
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => { setToDelete(row); setDeleteOpen(true); }}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  const grouped = LEDGER_TYPES.map(t => ({
    type: t,
    count: ledgers.filter(l => l.ledgerType === t).length,
    total: ledgers.filter(l => l.ledgerType === t).reduce((s, l) => s + parseFloat(l.currentBalance || 0), 0),
  }));

  return (
    <div className="p-2 sm:p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" />Chart of Accounts</h1>
          <p className="text-xs text-muted-foreground">Manage your general ledger accounts</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Ledger</Button>
      </div>

      {/* Type summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {grouped.map(g => (
          <Card key={g.type} className="cursor-pointer hover:shadow-sm" onClick={() => setTypeFilter(typeFilter === g.type ? "all" : g.type)}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{g.type}</p>
              <p className="text-lg font-bold">{g.count}</p>
              <p className="text-xs text-muted-foreground">₹{Math.abs(g.total).toLocaleString("en-IN", { maximumFractionDigits: 0 })}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder="Search ledgers..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <Select value={typeFilter} onValueChange={v => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {LEDGER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={ledgers}
          totalCount={total}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          isLoading={isLoading}
          emptyMessage="No ledgers found"
        />
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Ledger" : "New Ledger"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ledger Code *</Label>
                <Input value={form.ledgerCode} onChange={e => setForm(f => ({ ...f, ledgerCode: e.target.value }))} disabled={!!editing} placeholder="AC-XXXX" />
              </div>
              <div className="space-y-1">
                <Label>Ledger Type *</Label>
                <Select value={form.ledgerType} onValueChange={v => setForm(f => ({ ...f, ledgerType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{LEDGER_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Ledger Name *</Label>
              <Input value={form.ledgerName} onChange={e => setForm(f => ({ ...f, ledgerName: e.target.value }))} placeholder="e.g. HDFC Bank Account" />
            </div>
            <div className="space-y-1">
              <Label>Opening Balance</Label>
              <Input type="number" value={form.openingBalance} onChange={e => setForm(f => ({ ...f, openingBalance: e.target.value }))} placeholder="0.00" disabled={!!editing} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        isDeleting={deleting}
        title="Delete Ledger"
        description={`Are you sure you want to delete "${toDelete?.ledgerName}"? This cannot be undone.`}
      />
    </div>
  );
}
