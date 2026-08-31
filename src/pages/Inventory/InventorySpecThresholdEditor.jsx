import { useCallback, useEffect, useMemo, useState } from "react";
import { Grid3x3, RefreshCw, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import {
  deleteSpecThreshold,
  generateSpecThresholds,
  getInventoryDropdowns,
  getSpecThresholds,
  upsertSpecThresholds,
} from "@/services/inventory";

const fmtPower = (v) => {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return v ?? "";
  return n.toFixed(2);
};

/** Normalize power for filter comparison (matches backend normalizePowerValue). */
const normPower = (v) => {
  if (v == null || String(v).trim() === "") return "0.00";
  const n = Number(v);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
};

const matchesPowerFilter = (rowValue, filterValue) => {
  if (!filterValue || !String(filterValue).trim()) return true;
  return normPower(rowValue) === normPower(filterValue);
};

/** Format a product power bound for form input; use fallback when unset. */
const boundStr = (value, fallback) => {
  if (value == null || value === "") return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? String(n) : fallback;
};

/** Apply SPH/CYL/ADD range defaults from LensProductMaster bounds when product changes. */
const powerDefaultsFromProduct = (product) => {
  if (!product) {
    return {
      sphFrom: "0",
      sphTo: "2",
      cylFrom: "0",
      cylTo: "0",
      addFrom: "",
      addTo: "",
    };
  }
  const sphMin = product.sphere_min;
  const sphMax = product.sphere_max;
  const cylMin = product.cyl_min;
  const cylMax = product.cyl_max;
  const addMin = product.add_min;
  const addMax = product.add_max;

  const hasAdd = addMin != null && addMax != null;

  return {
    sphFrom: boundStr(sphMin, "0"),
    sphTo: boundStr(sphMax ?? sphMin, boundStr(sphMin, "2")),
    cylFrom: boundStr(cylMin, "0"),
    cylTo: boundStr(cylMax ?? cylMin, boundStr(cylMin, "0")),
    addFrom: hasAdd ? boundStr(addMin, "0") : "",
    addTo: hasAdd ? boundStr(addMax, addMin) : "",
  };
};

export default function InventorySpecThresholdEditor({ godownType }) {
  const { toast } = useToast();
  const [lensProducts, setLensProducts] = useState([]);
  const [lens_id, setLensId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [sphFrom, setSphFrom] = useState("0");
  const [sphTo, setSphTo] = useState("2");
  const [cylFrom, setCylFrom] = useState("0");
  const [cylTo, setCylTo] = useState("0");
  const [addFrom, setAddFrom] = useState("");
  const [addTo, setAddTo] = useState("");
  const [step, setStep] = useState("0.25");
  const [defaultMin, setDefaultMin] = useState("5");
  const [defaultMax, setDefaultMax] = useState("");
  const [sphFilter, setSphFilter] = useState("");
  const [cylFilter, setCylFilter] = useState("");
  const [addFilter, setAddFilter] = useState("");

  useEffect(() => {
    getInventoryDropdowns(godownType ? { godownType } : {})
      .then((res) => {
        if (res.success) setLensProducts(res.data?.lensProducts || []);
      })
      .catch(() => {});
  }, [godownType]);

  const loadThresholds = useCallback(async () => {
    if (!lens_id || !godownType) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const res = await getSpecThresholds({ lens_id, godownType });
      if (res.success) {
        setRows(
          (res.data || []).map((r) => ({
            ...r,
            minQty: String(r.minQty ?? 0),
            maxQty: r.maxQty != null ? String(r.maxQty) : "",
          }))
        );
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to load thresholds",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [lens_id, godownType, toast]);

  useEffect(() => {
    loadThresholds();
  }, [loadThresholds]);

  const handleGenerate = async () => {
    if (!lens_id) {
      toast({ title: "Select product", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const res = await generateSpecThresholds({
        lens_id: parseInt(lens_id, 10),
        godownType,
        sphFrom,
        sphTo,
        cylFrom,
        cylTo,
        addFrom: addFrom || undefined,
        addTo: addTo || undefined,
        step: parseFloat(step) || 0.25,
        defaultMin: parseInt(defaultMin, 10) || 0,
        defaultMax: defaultMax !== "" ? parseInt(defaultMax, 10) : undefined,
      });
      if (res.success) {
        toast({ title: "Generated", description: `${res.count ?? res.data?.length ?? 0} threshold cells` });
        loadThresholds();
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Generate failed", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!lens_id || rows.length === 0) return;
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        lens_id: parseInt(lens_id, 10),
        godownType,
        sph: r.sph,
        cyl: r.cyl,
        add: r.add,
        minQty: parseInt(r.minQty, 10) || 0,
        maxQty: r.maxQty !== "" ? parseInt(r.maxQty, 10) : null,
      }));
      await upsertSpecThresholds(payload);
      toast({ title: "Saved", description: "Thresholds updated" });
      loadThresholds();
    } catch (err) {
      toast({ title: "Error", description: err.message || "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRow = async (row) => {
    try {
      await deleteSpecThreshold(row.id);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      toast({ title: "Error", description: err.message || "Delete failed", variant: "destructive" });
    }
  };

  const handleClearAll = async () => {
    if (!lens_id || !window.confirm("Delete all thresholds for this product?")) return;
    try {
      await deleteSpecThreshold(0, { lens_id, godownType });
      setRows([]);
      toast({ title: "Cleared", description: "All thresholds removed" });
    } catch (err) {
      toast({ title: "Error", description: err.message || "Clear failed", variant: "destructive" });
    }
  };

  const updateRow = (idx, field, value) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const clearPowerFilters = () => {
    setSphFilter("");
    setCylFilter("");
    setAddFilter("");
  };

  const handleProductChange = (value) => {
    setLensId(value);
    clearPowerFilters();
    const product = lensProducts.find((p) => String(p.id) === value);
    const defaults = powerDefaultsFromProduct(product);
    setSphFrom(defaults.sphFrom);
    setSphTo(defaults.sphTo);
    setCylFrom(defaults.cylFrom);
    setCylTo(defaults.cylTo);
    setAddFrom(defaults.addFrom);
    setAddTo(defaults.addTo);
  };

  const productOptions = lensProducts.map((p) => ({
    value: String(p.id),
    label: `${p.lens_name}${p.product_code ? ` (${p.product_code})` : ""}`,
  }));

  const filteredRows = useMemo(
    () =>
      rows
        .map((row, idx) => ({ row, idx }))
        .filter(
          ({ row }) =>
            matchesPowerFilter(row.sph, sphFilter) &&
            matchesPowerFilter(row.cyl, cylFilter) &&
            matchesPowerFilter(row.add, addFilter)
        ),
    [rows, sphFilter, cylFilter, addFilter]
  );

  const hasPowerFilters = sphFilter.trim() || cylFilter.trim() || addFilter.trim();
  const thresholdCountLabel = loading
    ? "Loading…"
    : hasPowerFilters
      ? `${filteredRows.length} of ${rows.length} threshold cell(s)`
      : `${rows.length} threshold cell(s)`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Grid3x3 className="h-4 w-4" />
          Spec Threshold Editor ({godownType} Godown)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FormSelect
            label="Product"
            value={lens_id}
            onChange={handleProductChange}
            options={productOptions}
            placeholder="Select product"
          />
        </div>

        {lens_id && (
          <p className="text-xs text-muted-foreground -mt-2">
            Power range pre-filled from product master bounds. Adjust before generating if needed.
          </p>
        )}

        <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground">Generate grid (step 0.25 default)</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            <FormInput label="SPH from" value={sphFrom} onChange={(e) => setSphFrom(e.target.value)} />
            <FormInput label="SPH to" value={sphTo} onChange={(e) => setSphTo(e.target.value)} />
            <FormInput label="CYL from" value={cylFrom} onChange={(e) => setCylFrom(e.target.value)} />
            <FormInput label="CYL to" value={cylTo} onChange={(e) => setCylTo(e.target.value)} />
            <FormInput label="ADD from" value={addFrom} onChange={(e) => setAddFrom(e.target.value)} placeholder="opt" />
            <FormInput label="ADD to" value={addTo} onChange={(e) => setAddTo(e.target.value)} placeholder="opt" />
            <FormInput label="Step" value={step} onChange={(e) => setStep(e.target.value)} />
            <FormInput label="Default min" value={defaultMin} onChange={(e) => setDefaultMin(e.target.value)} />
            <FormInput label="Default max" value={defaultMax} onChange={(e) => setDefaultMax(e.target.value)} placeholder="opt" />
          </div>
          <Button type="button" size="sm" onClick={handleGenerate} disabled={generating || !lens_id}>
            {generating ? "Generating…" : "Generate Grid"}
          </Button>
        </div>

        {rows.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <FormInput
              label="Filter SPH"
              placeholder="e.g. -2.00"
              value={sphFilter}
              onChange={(e) => setSphFilter(e.target.value)}
            />
            <FormInput
              label="Filter CYL"
              placeholder="e.g. +1.25"
              value={cylFilter}
              onChange={(e) => setCylFilter(e.target.value)}
            />
            <FormInput
              label="Filter ADD"
              placeholder="e.g. +2.00"
              value={addFilter}
              onChange={(e) => setAddFilter(e.target.value)}
            />
            {hasPowerFilters && (
              <div className="flex items-end">
                <Button type="button" variant="outline" size="sm" onClick={clearPowerFilters}>
                  Clear filters
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{thresholdCountLabel}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={loadThresholds} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleClearAll} disabled={!rows.length}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving || !rows.length} className="gap-1">
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>

        {rows.length > 0 && (
          <div className="max-h-64 overflow-auto border rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="p-2 text-left">SPH</th>
                  <th className="p-2 text-left">CYL</th>
                  <th className="p-2 text-left">ADD</th>
                  <th className="p-2 text-left">Min</th>
                  <th className="p-2 text-left">Max</th>
                  <th className="p-2 w-8" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-muted-foreground">
                      No thresholds match the current SPH / CYL / ADD filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(({ row, idx }) => (
                    <tr key={row.id || idx} className="border-t">
                      <td className="p-1.5 font-mono">{fmtPower(row.sph)}</td>
                      <td className="p-1.5 font-mono">{fmtPower(row.cyl)}</td>
                      <td className="p-1.5 font-mono">{fmtPower(row.add)}</td>
                      <td className="p-1">
                        <input
                          className="w-14 border rounded px-1 py-0.5"
                          value={row.minQty}
                          onChange={(e) => updateRow(idx, "minQty", e.target.value)}
                        />
                      </td>
                      <td className="p-1">
                        <input
                          className="w-14 border rounded px-1 py-0.5"
                          value={row.maxQty}
                          onChange={(e) => updateRow(idx, "maxQty", e.target.value)}
                          placeholder="—"
                        />
                      </td>
                      <td className="p-1">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
