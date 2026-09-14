import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { createInventoryTransaction, getInventoryDropdowns, getInventoryItems } from "@/services/inventory";
import { validateAuditTrayTransfer } from "@/backend/services/inventoryCycleCount.helpers.js";

const empty = {
  fromTrayId: "",
  toTrayId: "",
  inventoryItemId: "",
  quantity: "1",
};

export default function InventoryTrayTransferForm({ godownType, onSuccess }) {
  const { toast } = useToast();
  const [form, setForm] = useState(empty);
  const [dropdowns, setDropdowns] = useState({ trays: [], locations: [] });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getInventoryDropdowns(godownType ? { godownType } : {});
        if (res.success) setDropdowns(res.data || {});
      } catch {
        toast({ title: "Error", description: "Failed to load trays", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [godownType, toast]);

  useEffect(() => {
    if (!form.fromTrayId) {
      setItems([]);
      return;
    }
    getInventoryItems({
      tray_id: form.fromTrayId,
      godownType,
      status: "AVAILABLE",
      limit: 500,
    })
      .then((res) => setItems(res.data || []))
      .catch(() => setItems([]));
  }, [form.fromTrayId, godownType]);

  const trayOptions = useMemo(
    () =>
      (dropdowns.trays || []).map((t) => ({
        value: String(t.id),
        label: t.location_id
          ? `${t.name} (#${t.id})`
          : t.name,
      })),
    [dropdowns.trays]
  );

  const destTrayOptions = useMemo(
    () => trayOptions.filter((t) => t.value !== String(form.fromTrayId)),
    [trayOptions, form.fromTrayId]
  );

  const itemOptions = useMemo(
    () =>
      items
        .filter((item) => (item.quantity || 0) > 0)
        .map((item) => ({
          value: String(item.id),
          label: `${item.lensProduct?.lens_name || "Item"} · qty ${item.quantity} · #${item.id}`,
        })),
    [items]
  );

  const selectedItem = items.find((i) => String(i.id) === String(form.inventoryItemId));
  const sourceTray = (dropdowns.trays || []).find((t) => String(t.id) === String(form.fromTrayId));
  const destTray = (dropdowns.trays || []).find((t) => String(t.id) === String(form.toTrayId));

  const handleChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "fromTrayId") {
        next.inventoryItemId = "";
        if (String(next.toTrayId) === String(value)) next.toTrayId = "";
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const check = validateAuditTrayTransfer({
      fromTrayId: form.fromTrayId,
      toTrayId: form.toTrayId,
      quantity: form.quantity,
    });
    if (!check.ok) {
      toast({ title: "Validation", description: check.message, variant: "destructive" });
      return;
    }
    if (!form.inventoryItemId) {
      toast({ title: "Validation", description: "Select an item to transfer", variant: "destructive" });
      return;
    }
    const qty = Number(form.quantity);
    if (selectedItem && qty > selectedItem.quantity) {
      toast({
        title: "Validation",
        description: `Quantity cannot exceed ${selectedItem.quantity}`,
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await createInventoryTransaction({
        type: "TRANSFER",
        inventoryItemId: Number(form.inventoryItemId),
        quantity: qty,
        fromLocationId: selectedItem?.location_id || sourceTray?.location_id,
        fromTrayId: Number(form.fromTrayId),
        toLocationId: destTray?.location_id,
        toTrayId: Number(form.toTrayId),
        reason: "Audit tray transfer",
      });
      if (res.success) {
        toast({ title: "Transferred", description: "Item moved between trays" });
        setForm(empty);
        onSuccess?.();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Transfer failed",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4" />
          Tray Transfer
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Move stock between trays in this godown. Writes TRANSFER ledger rows; destination tray must differ.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FormSelect
            label="Source tray"
            value={form.fromTrayId}
            onChange={(v) => handleChange("fromTrayId", v)}
            options={trayOptions}
            placeholder="Select source"
            disabled={loading}
            required
          />
          <FormSelect
            label="Destination tray"
            value={form.toTrayId}
            onChange={(v) => handleChange("toTrayId", v)}
            options={destTrayOptions}
            placeholder="Select destination"
            disabled={loading || !form.fromTrayId}
            required
          />
          <FormSelect
            label="Item"
            value={form.inventoryItemId}
            onChange={(v) => handleChange("inventoryItemId", v)}
            options={itemOptions}
            placeholder={form.fromTrayId ? "Select item" : "Pick source tray first"}
            disabled={!form.fromTrayId}
            required
          />
          <FormInput
            label="Quantity"
            type="number"
            min="1"
            step="1"
            value={form.quantity}
            onChange={(e) => handleChange("quantity", e.target.value)}
            required
          />
          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <Button type="submit" disabled={saving || loading} className="gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              {saving ? "Transferring…" : "Transfer"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
