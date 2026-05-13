import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X, Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSelect } from "@/components/ui/form-select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  createCheckSheet,
  getCheckSheetById,
  updateCheckSheet,
  saveCheckSheetItems,
  deleteCheckSheetItem,
} from "@/services/checkSheet";
import { defaultCheckSheet, activeStatusOptions } from "./CheckSheet.constants";

// ─── Inline Items Editor ─────────────────────────────────────────────────────
function ItemsEditor({ masterId, initialItems = [], readOnly }) {
  const { toast } = useToast();
  const [items, setItems] = useState(
    initialItems.length > 0
      ? initialItems
      : []
  );
  const [newItemName, setNewItemName] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync when parent changes (e.g., after data fetch)
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems.length]);

  const addItem = () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;

    // Client-side duplicate check (case-insensitive)
    const isDuplicate = items.some(
      (i) => i.item_name.toLowerCase() === trimmed.toLowerCase() && !i._deleted
    );
    if (isDuplicate) {
      toast({ title: "Duplicate", description: `"${trimmed}" already exists in this check sheet.`, variant: "destructive" });
      return;
    }

    setItems((prev) => [
      ...prev,
      { id: null, item_name: trimmed, sequence: prev.filter((i) => !i._deleted).length, activeStatus: true },
    ]);
    setNewItemName("");
  };

  const removeItem = async (index) => {
    const item = items[index];
    if (item.id) {
      // Persisted — soft-delete on server
      try {
        await deleteCheckSheetItem(item.id);
        setItems((prev) => prev.filter((_, i) => i !== index));
        toast({ title: "Item removed" });
      } catch (err) {
        toast({ title: "Error", description: err.message || "Failed to remove item", variant: "destructive" });
      }
    } else {
      // Not yet saved — just remove from local state
      setItems((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const updateItemName = (index, value) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, item_name: value } : item));
  };

  const handleSaveItems = async () => {
    if (!masterId) return;
    const toSave = items.filter((i) => !i._deleted);

    // Client-side duplicate check before saving
    const names = toSave.map((i) => i.item_name.trim().toLowerCase());
    const uniqueNames = new Set(names);
    if (uniqueNames.size !== names.length) {
      toast({ title: "Duplicate items", description: "Each item name must be unique within this check sheet.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const res = await saveCheckSheetItems(masterId, toSave.map((item, idx) => ({
        id:          item.id || undefined,
        item_name:   item.item_name.trim(),
        sequence:    idx,
        activeStatus: item.activeStatus ?? true,
      })));
      if (res.success) {
        // Re-sync with server IDs
        setItems(res.data.map((item) => ({
          id:          item.id,
          item_name:   item.item_name,
          sequence:    item.sequence,
          activeStatus: item.activeStatus,
        })));
        toast({ title: "Items saved" });
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to save items", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const activeItems = items.filter((i) => !i._deleted);

  return (
    <div className="space-y-3">
      {/* Item list */}
      <div className="space-y-1.5">
        {activeItems.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
            No items yet. Add items below.
          </p>
        )}
        {activeItems.map((item, idx) => (
          <div
            key={item.id ?? `new-${idx}`}
            className="flex items-center gap-2 bg-muted/30 border rounded-md px-3 py-2"
          >
            <GripVertical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground w-5 flex-shrink-0">{idx + 1}.</span>
            {readOnly ? (
              <span className="flex-1 text-sm">{item.item_name}</span>
            ) : (
              <Input
                value={item.item_name}
                onChange={(e) => updateItemName(items.indexOf(item), e.target.value)}
                className="flex-1 h-7 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary rounded-none px-0"
              />
            )}
            <Badge
              variant="outline"
              className={`text-[10px] flex-shrink-0 ${item.activeStatus ? "bg-green-50 text-green-700 border-green-200" : "text-muted-foreground"}`}
            >
              {item.activeStatus ? "Active" : "Inactive"}
            </Badge>
            {!readOnly && (
              <Button
                type="button"
                size="xs"
                variant="ghost"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive flex-shrink-0"
                onClick={() => removeItem(items.indexOf(item))}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Add item row */}
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
            placeholder="Type item name and press Enter or click Add"
            className="flex-1 h-8 text-sm"
          />
          <Button type="button" size="xs" variant="outline" className="h-8 gap-1.5" onClick={addItem}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
          {masterId && (
            <Button type="button" size="xs" className="h-8 gap-1.5" onClick={handleSaveItems} disabled={saving}>
              {saving ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Items
            </Button>
          )}
        </div>
      )}
      {!masterId && !readOnly && (
        <p className="text-xs text-muted-foreground">
          Save the check sheet first, then you can save items.
        </p>
      )}
    </div>
  );
}

// ─── Main Form ─────────────────────────────────────────────────────────────────
export default function CheckSheetForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultCheckSheet);
  const [originalData, setOriginalData] = useState(defaultCheckSheet);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id && (mode === "view" || mode === "edit")) {
      (async () => {
        try {
          setIsLoading(true);
          const res = await getCheckSheetById(parseInt(id));
          if (res.success) {
            const d = res.data;
            const mapped = {
              name:         d.name || "",
              check_key:    d.check_key || "",
              description:  d.description || "",
              activeStatus: d.activeStatus ?? true,
            };
            setFormData(mapped);
            setOriginalData(mapped);
            setItems(d.items || []);
          } else {
            toast({ title: "Error", description: "Check sheet not found", variant: "destructive" });
            navigate("/masters/check-sheets");
          }
        } catch (err) {
          toast({ title: "Error", description: err.message || "Failed to fetch", variant: "destructive" });
          navigate("/masters/check-sheets");
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [id, mode]);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Name is required";
    if (!formData.check_key.trim()) errs.check_key = "Check key is required";
    else if (!/^[A-Z0-9_]+$/i.test(formData.check_key.trim()))
      errs.check_key = "Only letters, numbers and underscores allowed";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validate()) return;
    try {
      setIsSaving(true);
      if (mode === "add") {
        const res = await createCheckSheet(formData);
        if (res.success) {
          toast({ title: "Created", description: "Check sheet created. You can now add items." });
          navigate(`/masters/check-sheets/view/${res.data.id}`);
        }
      } else {
        const res = await updateCheckSheet(parseInt(id), formData);
        if (res.success) {
          toast({ title: "Updated", description: "Check sheet updated." });
          setOriginalData(formData);
          setIsEditing(false);
          navigate(`/masters/check-sheets/view/${id}`);
        }
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) return navigate("/masters/check-sheets");
    if (window.confirm("Unsaved changes will be lost. Continue?")) {
      setFormData(originalData);
      setErrors({});
      setIsEditing(false);
      navigate(id ? `/masters/check-sheets/view/${id}` : "/masters/check-sheets");
    }
  };

  const isReadOnly = mode === "view" && !isEditing;

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            {mode === "add" ? "Add Check Sheet" : mode === "edit" ? "Edit Check Sheet" : "Check Sheet Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add" ? "Create a new check sheet master" : "View and manage check sheet details"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="xs" className="h-8 gap-1.5" onClick={handleCancel} disabled={isSaving}>
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Button>
          {mode === "view" && (
            <Button
              size="xs" className="h-8 gap-1.5"
              variant={isEditing ? "outline" : "default"}
              onClick={() => { if (isEditing) { setFormData(originalData); setErrors({}); } setIsEditing((v) => !v); }}
            >
              {isEditing ? <><X className="h-3.5 w-3.5" /> Cancel Edit</> : <><Edit className="h-3.5 w-3.5" /> Edit</>}
            </Button>
          )}
          {(mode !== "view" || isEditing) && (
            <Button type="button" size="xs" className="h-8 gap-1.5" onClick={handleSubmit} disabled={isSaving}>
              {isSaving
                ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> Saving...</>
                : <><Save className="h-3.5 w-3.5" /> {mode === "add" ? "Save" : "Update"}</>}
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* ── Master details ── */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4 space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Master Details</h2>

              <FormInput
                label="Check Sheet Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isReadOnly}
                required
                error={errors.name}
                helperText={!errors.name && "Unique name for this check sheet"}
              />

              <FormInput
                label="Check Key"
                name="check_key"
                value={formData.check_key}
                onChange={(e) => handleChange({ target: { name: "check_key", value: e.target.value.toUpperCase() } })}
                disabled={isReadOnly}
                required
                error={errors.check_key}
                helperText={!errors.check_key && "Unique code used to link this sheet (e.g. REJECTION)"}
                placeholder="e.g. REJECTION"
              />

              <FormTextarea
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isReadOnly}
                rows={3}
                placeholder="Short description of this check sheet"
              />

              <FormSelect
                label="Status"
                name="activeStatus"
                options={activeStatusOptions.map((o) => ({ id: o.value, name: o.label }))}
                value={formData.activeStatus}
                onChange={(val) => setFormData((p) => ({ ...p, activeStatus: val }))}
                disabled={isReadOnly}
              />
            </CardContent>
          </Card>

          {/* ── Items ── */}
          <Card className="lg:col-span-3">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Check Sheet Items
                </h2>
                <Badge variant="secondary" className="text-xs">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <ItemsEditor
                masterId={id ? parseInt(id) : null}
                initialItems={items}
                readOnly={mode === "add" ? true : isReadOnly}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
