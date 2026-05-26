import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  getExpenseCategories, createExpenseCategory, updateExpenseCategory, deleteExpenseCategory,
} from "@/services/expense";

const emptyForm = { name: "", description: "" };

export default function ExpenseCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await getExpenseCategories();
      setCategories(res.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load categories" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (cat) => { setEditing(cat); setForm({ name: cat.name, description: cat.description || "" }); setDialogOpen(true); };

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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteExpenseCategory(toDelete.id);
      toast({ title: "Category deleted" });
      setDeleteOpen(false);
      fetchCategories();
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Delete failed" });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    { accessorKey: "name", header: "Category Name", cell: ({ value }) => <span className="font-medium">{value}</span> },
    { accessorKey: "description", header: "Description", cell: ({ value }) => <span className="text-muted-foreground text-sm">{value || "—"}</span> },
    {
      accessorKey: "ledger", header: "Linked Ledger",
      cell: ({ row }) => <span className="text-sm font-mono">{row.ledger?.ledgerCode} {row.ledger?.ledgerName}</span>,
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

  return (
    <div className="p-2 sm:p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><Tag className="h-5 w-5" />Expense Categories</h1>
          <p className="text-xs text-muted-foreground">Manage expense categories and their linked ledgers</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Category</Button>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={categories}
          totalCount={categories.length}
          currentPage={1}
          pageSize={categories.length || 10}
          isLoading={isLoading}
          emptyMessage="No expense categories found"
        />
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit Category" : "New Expense Category"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Category Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Office Supplies" />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" rows={3} />
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
        title="Delete Category"
        description={`Delete "${toDelete?.name}"? This will fail if expenses are linked to this category.`}
      />
    </div>
  );
}
