import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Refresh } from "@/components/ui/Refresh";
import {
  getIncomeCategories,
  createIncomeCategory,
  updateIncomeCategory,
  deleteIncomeCategory,
} from "@/services/income";

export default function IncomeCategoryMain() {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getIncomeCategories();
      setCategories(res.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load categories" });
    } finally {
      setLoading(false);
    }
  }, [refreshKey, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  };

  const openEdit = (cat) => {
    setEditing(cat);
    setName(cat.name || "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Name is required" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateIncomeCategory(editing.id, { name: name.trim(), activeStatus: true });
        toast({ title: "Category updated" });
      } else {
        await createIncomeCategory({ name: name.trim(), activeStatus: true });
        toast({ title: "Category created" });
      }
      setDialogOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({
        variant: "destructive",
        title: e?.response?.data?.message || e.message || "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await deleteIncomeCategory(cat.id);
      toast({ title: "Category deleted" });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({
        variant: "destructive",
        title: e?.response?.data?.message || e.message || "Delete failed",
      });
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Income Categories</h1>
          <p className="text-xs text-muted-foreground">Master list for income recording</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Refresh onClick={() => setRefreshKey((k) => k + 1)} />
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        </div>
      </div>

      <Card className="p-2 overflow-auto">
        {loading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Ledger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Incomes</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => openEdit(c)}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {c.ledger ? `${c.ledger.ledgerCode} — ${c.ledger.ledgerName}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {c.active_status ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{c._count?.incomes ?? 0}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-600"
                      onClick={(e) => { e.stopPropagation(); handleDelete(c); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 py-2">
            <Label>Name <span className="text-red-500">*</span></Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
