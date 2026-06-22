import { useState, useEffect, useCallback } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Refresh } from "@/components/ui/Refresh";
import { getLedgers, createLedger, updateLedger, deleteLedger } from "@/services/ledger";
import {
  LEDGER_TYPES,
  TYPE_BADGE,
  emptyLedgerForm,
} from "./ChartOfAccounts.constants";
import { useChartOfAccountsColumns } from "./useChartOfAccountsColumns";

export default function ChartOfAccountsMain() {
  const { toast } = useToast();

  // List state
  const [ledgers, setLedgers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  // Pagination (server-side)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting
  const [sorting, setSorting] = useState([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyLedgerForm);
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Type summary counts (from loaded data)
  const [typeSummary, setTypeSummary] = useState([]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyLedgerForm);
    setDialogOpen(true);
  };

  const openEdit = (l) => {
    setEditing(l);
    setForm({
      ledgerCode: l.ledgerCode,
      ledgerName: l.ledgerName,
      ledgerType: l.ledgerType,
      openingBalance: String(l.openingBalance ?? "0"),
    });
    setDialogOpen(true);
  };

  const openDelete = (l) => {
    setToDelete(l);
    setDeleteOpen(true);
  };

  const columns = useChartOfAccountsColumns(openEdit, openDelete);

  const fetchLedgers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page: pageIndex + 1, limit: pageSize };
      if (searchQuery) params.search = searchQuery;
      if (typeFilter !== "all") params.type = typeFilter;
      const sortField = sorting[0]?.id || "ledgerCode";
      const sortDir = sorting[0]?.desc ? "desc" : "asc";
      params.sortField = sortField;
      params.sortDir = sortDir;

      const res = await getLedgers(params);
      setLedgers(res.data || []);
      setTotalCount(res.pagination?.total ?? (res.data?.length || 0));

      // Build type summary from full dataset if no filter active
      if (typeFilter === "all" && !searchQuery) {
        const summary = LEDGER_TYPES.map((t) => ({
          type: t,
          count: (res.data || []).filter((l) => l.ledgerType === t).length,
          balance: (res.data || [])
            .filter((l) => l.ledgerType === t)
            .reduce((s, l) => s + parseFloat(l.currentBalance || 0), 0),
        }));
        setTypeSummary(summary);
      }
    } catch {
      toast({ variant: "destructive", title: "Failed to load ledgers" });
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, searchQuery, typeFilter, sorting, refreshKey]);

  useEffect(() => {
    fetchLedgers();
  }, [fetchLedgers]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    toast({ title: "Refreshed", description: "Ledger list has been refreshed." });
  };

  const handleSave = async () => {
    if (!form.ledgerCode.trim() || !form.ledgerName.trim()) {
      toast({ variant: "destructive", title: "Code and Name are required" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateLedger(editing.id, {
          ledgerName: form.ledgerName,
          ledgerType: form.ledgerType,
        });
        toast({ title: "Ledger updated" });
      } else {
        await createLedger({
          ledgerCode: form.ledgerCode,
          ledgerName: form.ledgerName,
          ledgerType: form.ledgerType,
          openingBalance: parseFloat(form.openingBalance) || 0,
        });
        toast({ title: "Ledger created" });
      }
      setDialogOpen(false);
      fetchLedgers();
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteLedger(toDelete.id);
      toast({ title: "Ledger deleted" });
      setDeleteOpen(false);
      setToDelete(null);
      fetchLedgers();
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Delete failed" });
    } finally {
      setDeleting(false);
    }
  };

  const fmt = (v) =>
    `₹${Math.abs(parseFloat(v || 0)).toLocaleString("en-IN", {
      maximumFractionDigits: 0,
    })}`;

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Chart of Accounts
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage general ledger accounts
          </p>
        </div>
        <Button size="xs" className="gap-1.5 h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Ledger</span>
        </Button>
      </div>

      {/* Type summary cards — clickable filters */}
      {typeSummary.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-shrink-0">
          {typeSummary.map((g) => (
            <Card
              key={g.type}
              className={`cursor-pointer transition-shadow hover:shadow-md ${
                typeFilter === g.type ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => {
                setTypeFilter(typeFilter === g.type ? "all" : g.type);
                setPageIndex(0);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      TYPE_BADGE[g.type]?.split(" ")[0]
                    }`}
                  />
                  <p className="text-xs text-muted-foreground font-medium">
                    {g.type}
                  </p>
                </div>
                <p className="text-lg font-bold">{g.count}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search + filter bar */}
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search ledgers..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(0);
              }}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v);
              setPageIndex(0);
            }}
          >
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {LEDGER_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Refresh onClick={handleRefresh} />
        </div>
      </Card>

      {/* Table */}
      <div className="flex-1 min-h-0">
        <Table
          data={ledgers}
          columns={columns}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPageIndex}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
          loading={isLoading}
          sorting={sorting}
          setSorting={setSorting}
          pagination={true}
          emptyMessage="No ledgers found"
        />
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Ledger" : "New Ledger"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ledger Code *</Label>
                <Input
                  value={form.ledgerCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ledgerCode: e.target.value }))
                  }
                  disabled={!!editing}
                  placeholder="AC-XXXX"
                />
              </div>
              <div className="space-y-1">
                <Label>Ledger Type *</Label>
                <Select
                  value={form.ledgerType}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, ledgerType: v }))
                  }
                  disabled={!!editing}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEDGER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Ledger Name *</Label>
              <Input
                value={form.ledgerName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ledgerName: e.target.value }))
                }
                placeholder="e.g. HDFC Bank Account"
              />
            </div>
            <div className="space-y-1">
              <Label>Opening Balance</Label>
              <Input
                type="number"
                value={form.openingBalance}
                onChange={(e) =>
                  setForm((f) => ({ ...f, openingBalance: e.target.value }))
                }
                placeholder="0.00"
                disabled={!!editing}
              />
              {editing && (
                <p className="text-xs text-muted-foreground">
                  Opening balance cannot be changed after creation.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleting}
        title="Delete Ledger?"
        description={
          toDelete
            ? `Delete "${toDelete.ledgerName}"? This cannot be undone and will fail if transactions reference this ledger.`
            : "Are you sure?"
        }
      />
    </div>
  );
}
