import { useState, useMemo, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Refresh } from "@/components/ui/Refresh";
import {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from "@/services/expense";
import { emptyExpenseCategoryForm } from "./ExpenseCategory.constants";
import { useExpenseCategoryColumns } from "./useExpenseCategoryColumns";

export default function ExpenseCategoryMain() {
  const { toast } = useToast();

  // List state
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination (client-side)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Sorting
  const [sorting, setSorting] = useState([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyExpenseCategoryForm);
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Open create dialog
  const openCreate = () => {
    setEditing(null);
    setForm(emptyExpenseCategoryForm);
    setDialogOpen(true);
  };

  // Open edit dialog
  const openEdit = (cat) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      description: cat.description || "",
      expenseType: cat.expenseType || "INDIRECT",
    });
    setDialogOpen(true);
  };

  // Open delete dialog
  const openDelete = (cat) => {
    setToDelete(cat);
    setDeleteOpen(true);
  };

  const columns = useExpenseCategoryColumns(openEdit, openDelete);

  // Fetch all categories from API
  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await getExpenseCategories();
      setCategories(res.data || []);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to load categories",
        description: err?.message,
      });
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    toast({ title: "Refreshed", description: "Expense category list has been refreshed." });
  };

  useEffect(() => {
    fetchCategories();
  }, [refreshKey]);

  // Client-side search
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.ledger?.ledgerName?.toLowerCase().includes(q) ||
        c.ledger?.ledgerCode?.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  // Client-side sorting
  const sorted = useMemo(() => {
    if (!sorting.length) return filtered;
    const { id, desc } = sorting[0];
    return [...filtered].sort((a, b) => {
      const av = a[id] ?? "";
      const bv = b[id] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return desc ? -cmp : cmp;
    });
  }, [filtered, sorting]);

  // Client-side pagination slice
  const paged = useMemo(() => {
    const start = pageIndex * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, pageIndex, pageSize]);

  // Save (create / update)
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ variant: "destructive", title: "Category name is required" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateExpenseCategory(editing.id, form);
        toast({ title: "Category updated" });
      } else {
        await createExpenseCategory(form);
        toast({ title: "Category created" });
      }
      setDialogOpen(false);
      fetchCategories();
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteExpenseCategory(toDelete.id);
      toast({ title: "Category deleted" });
      setDeleteOpen(false);
      setToDelete(null);
      fetchCategories();
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Delete failed" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Expense Categories
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage expense categories and their linked ledgers
          </p>
        </div>
        <Button size="xs" className="gap-1.5 h-8" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Category</span>
        </Button>
      </div>

      {/* Search bar */}
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(0);
              }}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Refresh onClick={handleRefresh} />
        </div>
      </Card>

      {/* Table */}
      <div className="flex-1 min-h-0">
        <Table
          data={paged}
          columns={columns}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={sorted.length}
          onPageChange={setPageIndex}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
          loading={isLoading}
          sorting={sorting}
          setSorting={setSorting}
          pagination={true}
          emptyMessage="No expense categories found"
        />
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Expense Category" : "New Expense Category"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Category Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Office Supplies"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div className="space-y-1">
              <Label>Classification</Label>
              <Select
                value={form.expenseType}
                onValueChange={(v) => setForm((f) => ({ ...f, expenseType: v }))}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DIRECT">Direct Expense</SelectItem>
                  <SelectItem value="INDIRECT">Indirect Expense</SelectItem>
                </SelectContent>
              </Select>
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
        title="Delete Expense Category?"
        description={
          toDelete
            ? `Delete "${toDelete.name}"? This will fail if expenses are linked to this category.`
            : "Are you sure you want to delete this category?"
        }
      />
    </div>
  );
}
