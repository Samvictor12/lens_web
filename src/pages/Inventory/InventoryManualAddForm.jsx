import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { createInventoryItem, getInventoryDropdowns } from "@/services/inventory";
import { getTraysByLocation } from "@/services/tray";

const emptyForm = {
  lens_id: "",
  coating_id: "",
  location_id: "",
  tray_id: "",
  quantity: "1",
  costPrice: "",
  rightSpherical: "0",
  rightCylindrical: "0",
  rightAdd: "0",
  notes: "",
};

export default function InventoryManualAddForm({ godownType, onSuccess }) {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [dropdowns, setDropdowns] = useState({ lensProducts: [], coatings: [], locations: [] });
  const [trays, setTrays] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getInventoryDropdowns(godownType ? { godownType } : {});
        if (res.success) setDropdowns(res.data || {});
      } catch {
        toast({ title: "Error", description: "Failed to load dropdowns", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [godownType, toast]);

  useEffect(() => {
    if (!form.location_id) {
      setTrays([]);
      return;
    }
    getTraysByLocation(form.location_id)
      .then((res) => setTrays(res.data || res || []))
      .catch(() => setTrays([]));
  }, [form.location_id]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.lens_id || !form.costPrice || !form.location_id) {
      toast({ title: "Validation", description: "Product, cost, and location are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        lens_id: parseInt(form.lens_id, 10),
        coating_id: form.coating_id ? parseInt(form.coating_id, 10) : null,
        location_id: parseInt(form.location_id, 10),
        tray_id: form.tray_id ? parseInt(form.tray_id, 10) : null,
        quantity: parseFloat(form.quantity) || 1,
        costPrice: parseFloat(form.costPrice),
        status: "AVAILABLE",
        rightEye: true,
        rightSpherical: form.rightSpherical || "0",
        rightCylindrical: form.rightCylindrical || "0",
        rightAdd: form.rightAdd || "0",
        notes: form.notes || undefined,
      };
      const res = await createInventoryItem(payload);
      if (res.success) {
        toast({ title: "Success", description: "Stock added via INWARD_DIRECT" });
        setForm(emptyForm);
        onSuccess?.();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to add stock",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const productOptions = (dropdowns.lensProducts || []).map((p) => ({
    value: String(p.id),
    label: `${p.lens_name}${p.product_code ? ` (${p.product_code})` : ""}`,
  }));

  const coatingOptions = (dropdowns.coatings || []).map((c) => ({
    value: String(c.id),
    label: c.name,
  }));

  const locationOptions = (dropdowns.locations || []).map((l) => ({
    value: String(l.id),
    label: l.name,
  }));

  const trayOptions = trays.map((t) => ({
    value: String(t.id),
    label: t.name,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Manual Add Stock (INWARD_DIRECT)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <FormSelect
            label="Product"
            value={form.lens_id}
            onChange={(v) => handleChange("lens_id", v)}
            options={productOptions}
            placeholder="Select product"
            disabled={loading}
            required
          />
          <FormSelect
            label="Coating"
            value={form.coating_id}
            onChange={(v) => handleChange("coating_id", v)}
            options={coatingOptions}
            placeholder="Optional"
            disabled={loading}
          />
          <FormSelect
            label="Location"
            value={form.location_id}
            onChange={(v) => handleChange("location_id", v)}
            options={locationOptions}
            placeholder="Select location"
            disabled={loading}
            required
          />
          <FormSelect
            label="Tray"
            value={form.tray_id}
            onChange={(v) => handleChange("tray_id", v)}
            options={trayOptions}
            placeholder="Optional"
            disabled={!form.location_id}
          />
          <FormInput
            label="SPH"
            value={form.rightSpherical}
            onChange={(e) => handleChange("rightSpherical", e.target.value)}
          />
          <FormInput
            label="CYL"
            value={form.rightCylindrical}
            onChange={(e) => handleChange("rightCylindrical", e.target.value)}
          />
          <FormInput
            label="ADD"
            value={form.rightAdd}
            onChange={(e) => handleChange("rightAdd", e.target.value)}
          />
          <FormInput
            label="Quantity"
            type="number"
            min="0.1"
            step="0.1"
            value={form.quantity}
            onChange={(e) => handleChange("quantity", e.target.value)}
            required
          />
          <FormInput
            label="Cost Price"
            type="number"
            min="0"
            step="0.01"
            value={form.costPrice}
            onChange={(e) => handleChange("costPrice", e.target.value)}
            required
          />
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <Button type="submit" disabled={saving || loading} className="gap-2">
              <Plus className="h-4 w-4" />
              {saving ? "Adding…" : "Add Stock"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
