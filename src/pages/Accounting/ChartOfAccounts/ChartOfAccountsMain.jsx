import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ListTree, Table2, FolderPlus } from "lucide-react";
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
import { getAccountGroupTree, flattenPostingGroups, flattenAccountGroups, createAccountGroup } from "@/services/accountGroup";
import ChartOfAccountsTree from "./ChartOfAccountsTree";
import {
  LEDGER_TYPES,
  TYPE_BADGE,
  PNL_CLASSIFICATIONS,
  emptyLedgerForm,
  emptyAccountGroupForm,
} from "./ChartOfAccounts.constants";
import { useChartOfAccountsColumns } from "./useChartOfAccountsColumns";

export default function ChartOfAccountsMain() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState("tree");
  const [groupTree, setGroupTree] = useState([]);
  const [postingGroups, setPostingGroups] = useState([]);
  const [allGroups, setAllGroups] = useState([]);

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
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyLedgerForm);
  const [groupForm, setGroupForm] = useState(emptyAccountGroupForm);
  const [saving, setSaving] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);

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

  const openCreateGroup = () => {
    setGroupForm(emptyAccountGroupForm);
    setGroupDialogOpen(true);
  };

  const selectedPostingGroup = useMemo(
    () => postingGroups.find((g) => String(g.id) === form.accountGroupId),
    [postingGroups, form.accountGroupId]
  );

  const selectedParentGroup = useMemo(
    () => allGroups.find((g) => String(g.id) === groupForm.parentGroupId),
    [allGroups, groupForm.parentGroupId]
  );

  const showPnlClassification =
    selectedParentGroup &&
    (selectedParentGroup.nature === "INCOME" || selectedParentGroup.nature === "EXPENSE");

  const openEdit = (l) => {
    setEditing(l);
    setForm({
      ledgerCode: l.ledgerCode,
      ledgerName: l.ledgerName,
      ledgerType: l.ledgerType,
      accountGroupId: l.accountGroupId ? String(l.accountGroupId) : "",
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

  const fetchGroups = useCallback(async () => {
    try {
      const res = await getAccountGroupTree();
      const tree = res.data || [];
      setGroupTree(tree);
      setPostingGroups(flattenPostingGroups(tree));
      setAllGroups(flattenAccountGroups(tree));
    } catch {
      setGroupTree([]);
      setPostingGroups([]);
    }
  }, [refreshKey]);

  useEffect(() => {
    fetchLedgers();
    fetchGroups();
  }, [fetchLedgers, fetchGroups]);

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    toast({ title: "Refreshed", description: "Chart of accounts has been refreshed." });
  };

  const handleSaveGroup = async () => {
    if (!groupForm.groupName.trim()) {
      toast({ variant: "destructive", title: "Group name is required" });
      return;
    }
    if (!groupForm.parentGroupId) {
      toast({ variant: "destructive", title: "Select a parent group" });
      return;
    }
    setSavingGroup(true);
    try {
      await createAccountGroup({
        groupName: groupForm.groupName.trim(),
        parentGroupId: parseInt(groupForm.parentGroupId, 10),
        pnlClassification: groupForm.pnlClassification,
      });
      toast({ title: "Account group created" });
      setGroupDialogOpen(false);
      fetchGroups();
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Save failed" });
    } finally {
      setSavingGroup(false);
    }
  };

  const handleSave = async () => {
    if (!form.ledgerName.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    if (!editing && !form.accountGroupId) {
      toast({ variant: "destructive", title: "Select an account group" });
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
          ledgerCode: form.ledgerCode || undefined,
          ledgerName: form.ledgerName,
          accountGroupId: parseInt(form.accountGroupId, 10),
          openingBalance: parseFloat(form.openingBalance) || 0,
        });
        toast({ title: "Ledger created" });
      }
      setDialogOpen(false);
      fetchLedgers();
      fetchGroups();
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

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
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
        <div className="flex gap-1.5">
          <Button
            size="xs"
            variant={viewMode === "tree" ? "default" : "outline"}
            className="gap-1 h-8"
            onClick={() => setViewMode("tree")}
          >
            <ListTree className="h-3.5 w-3.5" /> Tree
          </Button>
          <Button
            size="xs"
            variant={viewMode === "table" ? "default" : "outline"}
            className="gap-1 h-8"
            onClick={() => setViewMode("table")}
          >
            <Table2 className="h-3.5 w-3.5" /> Table
          </Button>
          <Button size="xs" variant="outline" className="gap-1.5 h-8" onClick={openCreateGroup}>
            <FolderPlus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Group</span>
          </Button>
          <Button size="xs" className="gap-1.5 h-8" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Ledger</span>
          </Button>
        </div>
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

      {/* Tree or Table */}
      <div className="flex-1 min-h-0">
        {viewMode === "tree" ? (
          <Card className="h-full overflow-auto p-1">
            <ChartOfAccountsTree
              tree={groupTree}
              typeFilter={typeFilter}
              searchQuery={searchQuery}
              onEditLedger={openEdit}
              onViewSummary={(g) =>
                navigate(`/accounts/reports?tab=group&groupId=${g.id}`)
              }
              onViewStatement={(l) =>
                navigate(`/accounts/reports?tab=ledger&ledgerId=${l.id}`)
              }
            />
          </Card>
        ) : (
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
        )}
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
            {!editing && (
              <div className="space-y-1">
                <Label>Account Group *</Label>
                <Select
                  value={form.accountGroupId}
                  onValueChange={(v) => {
                    const g = postingGroups.find((x) => String(x.id) === v);
                    setForm((f) => ({
                      ...f,
                      accountGroupId: v,
                      ledgerType: g?.nature || "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group (e.g. Bank Accounts)" />
                  </SelectTrigger>
                  <SelectContent>
                    {postingGroups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)}>
                        {g.label} ({g.nature})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ledger Code</Label>
                <Input
                  value={form.ledgerCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ledgerCode: e.target.value }))
                  }
                  disabled={!!editing}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div className="space-y-1">
                <Label>Ledger Type</Label>
                {editing ? (
                  <Select
                    value={form.ledgerType}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, ledgerType: v }))
                    }
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
                ) : (
                  <>
                    <Input
                      value={selectedPostingGroup?.nature || form.ledgerType || ""}
                      disabled
                      placeholder="Select account group first"
                    />
                    {selectedPostingGroup && (
                      <p className="text-xs text-muted-foreground">
                        Set automatically from {selectedPostingGroup.groupName}
                      </p>
                    )}
                  </>
                )}
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

      {/* Create Account Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Account Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Parent Group *</Label>
              <Select
                value={groupForm.parentGroupId}
                onValueChange={(v) => {
                  const parent = allGroups.find((g) => String(g.id) === v);
                  setGroupForm((f) => ({
                    ...f,
                    parentGroupId: v,
                    pnlClassification:
                      parent?.nature === "INCOME" || parent?.nature === "EXPENSE"
                        ? f.pnlClassification === "NOT_APPLICABLE"
                          ? parent.pnlClassification !== "NOT_APPLICABLE"
                            ? parent.pnlClassification
                            : parent.nature === "INCOME"
                              ? "INDIRECT_INCOME"
                              : "INDIRECT_EXPENSE"
                          : f.pnlClassification
                        : "NOT_APPLICABLE",
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select parent group" />
                </SelectTrigger>
                <SelectContent>
                  {allGroups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.label} ({g.nature})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Group Name *</Label>
              <Input
                value={groupForm.groupName}
                onChange={(e) =>
                  setGroupForm((f) => ({ ...f, groupName: e.target.value }))
                }
                placeholder="e.g. Office Expenses"
              />
            </div>
            {showPnlClassification && (
              <div className="space-y-1">
                <Label>P&amp;L Classification</Label>
                <Select
                  value={groupForm.pnlClassification}
                  onValueChange={(v) =>
                    setGroupForm((f) => ({ ...f, pnlClassification: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PNL_CLASSIFICATIONS.filter((c) => {
                      if (c === "NOT_APPLICABLE") return false;
                      if (selectedParentGroup?.nature === "INCOME") {
                        return c.includes("INCOME");
                      }
                      if (selectedParentGroup?.nature === "EXPENSE") {
                        return c.includes("EXPENSE");
                      }
                      return false;
                    }).map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedParentGroup && (
              <p className="text-xs text-muted-foreground">
                Nature and report section inherit from {selectedParentGroup.groupName} ({selectedParentGroup.nature}).
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveGroup} disabled={savingGroup}>
              {savingGroup ? "Saving..." : "Save"}
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
