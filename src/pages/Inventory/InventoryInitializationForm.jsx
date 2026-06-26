import { useState, useEffect, useMemo, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FormSelect } from "@/components/ui/form-select";
import { FormInput } from "@/components/ui/form-input";
import { useToast } from "@/hooks/use-toast";
import { getInventoryDropdowns, bulkInwardFromGrid, getTrayOccupancy } from "@/services/inventory";
import { getTraysByLocation } from "@/services/tray";
import {
  getLensProductsDropdown,
  getLensCategoriesDropdown,
  getLensTypesDropdown,
} from "@/services/saleOrder";
import BulkLensSelection from "@/pages/PurchaseOrder/BulkLensSelection";

const emptySplit = () => ({ tray_id: "", qty: "", costPrice: "" });

const parseKey = (key) => {
  const parts = key.split("_");
  const sphIdx = parts.indexOf("sph");
  const cylIdx = parts.indexOf("cyl");
  const addIdx = parts.indexOf("add");
  const lastPart = parts[parts.length - 1];
  const eye = lastPart === "L" || lastPart === "R" ? lastPart : null;
  return {
    spherical: sphIdx !== -1 ? parts[sphIdx + 1] : "0",
    cylindrical: cylIdx !== -1 ? parts[cylIdx + 1] : "0",
    add: addIdx !== -1 ? parts[addIdx + 1] : null,
    eye,
  };
};

const getSelectionQty = (val) => {
  if (typeof val === "object" && val !== null) {
    if (val.quantity != null) return parseInt(val.quantity, 10) || 0;
    // Only sum eye-keyed quantities (R/L) — tray_id/costPrice are metadata, not quantity.
    return ["R", "L"].reduce((s, eye) => s + (parseInt(val[eye], 10) || 0), 0);
  }
  return parseInt(val, 10) || 0;
};

const fmtPower = (v) => {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return v;
  return n > 0 ? `+${n}` : String(n);
};

/**
 * Grid stock initialization: one location, multi-tray splits per power row.
 */
export default function InventoryInitializationForm({ isOpen, onClose, onSuccess }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSubmitWarnings, setShowSubmitWarnings] = useState(false);

  const [locations, setLocations] = useState([]);
  const [trays, setTrays] = useState([]);
  const [lensProducts, setLensProducts] = useState([]);
  const [lensCategories, setLensCategories] = useState([]);
  const [lensTypes, setLensTypes] = useState([]);
  const [coatings, setCoatings] = useState([]);

  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [Type_id, setTypeId] = useState("");
  const [category_id, setCategoryId] = useState("");
  const [lens_id, setLensId] = useState("");
  const [coating_id, setCoatingId] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [lensBulkSelection, setLensBulkSelection] = useState(null);

  const [gridRows, setGridRows] = useState([]);
  const [rowSplits, setRowSplits] = useState({});
  const [trayOccupancyData, setTrayOccupancyData] = useState({});

  const resetForm = () => {
    setStep(1);
    setSelectedLocationId("");
    setTypeId("");
    setCategoryId("");
    setLensId("");
    setCoatingId("");
    setCostPrice("");
    setLensBulkSelection(null);
    setGridRows([]);
    setRowSplits({});
    setTrayOccupancyData({});
    setShowSubmitWarnings(false);
    setTrays([]);
  };

  useEffect(() => {
    if (isOpen) {
      loadDropdownData();
      resetForm();
    }
  }, [isOpen]);

  const loadDropdownData = async () => {
    try {
      setIsLoading(true);
      const [invRes, catRes, typeRes, lensRes] = await Promise.all([
        getInventoryDropdowns(),
        getLensCategoriesDropdown(),
        getLensTypesDropdown(),
        getLensProductsDropdown(),
      ]);
      if (invRes.success) {
        setLocations(invRes.data?.locations || []);
        setCoatings(invRes.data?.coatings || []);
      }
      if (catRes.success) setLensCategories(catRes.data || []);
      if (typeRes.success) setLensTypes(typeRes.data || []);
      if (lensRes.success) setLensProducts(lensRes.data || []);
    } catch {
      toast({ title: "Error", description: "Failed to load dropdown data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const categoryName = useMemo(
    () => lensCategories.find((c) => String(c.id) === String(category_id))?.label || "",
    [lensCategories, category_id]
  );

  const isProgressive = useMemo(
    () => categoryName.toLowerCase().includes("prog"),
    [categoryName]
  );

  const filteredProducts = useMemo(() => {
    if (!Type_id || !category_id) return [];
    return lensProducts.filter(
      (p) => String(p.Type_id) === String(Type_id) && String(p.category_id) === String(category_id)
    );
  }, [lensProducts, Type_id, category_id]);

  const fetchTrayOccupancy = useCallback(async (trayId) => {
    if (trayOccupancyData[trayId]) return;
    try {
      const response = await getTrayOccupancy(trayId);
      if (response.success && response.data) {
        setTrayOccupancyData((prev) => ({ ...prev, [trayId]: response.data }));
      }
    } catch (error) {
      console.error("Failed to fetch tray occupancy:", error);
    }
  }, [trayOccupancyData]);

  const preloadTrayOccupancies = useCallback(async (trayList) => {
    await Promise.all((trayList || []).map((t) => fetchTrayOccupancy(t.id)));
  }, [fetchTrayOccupancy]);

  const handleLocationChange = async (value) => {
    setSelectedLocationId(value ? String(value) : "");
    setTrays([]);
    setTrayOccupancyData({});
    if (value) {
      try {
        const response = await getTraysByLocation(value);
        if (response.success) {
          const list = response.data || [];
          setTrays(list);
          await preloadTrayOccupancies(list);
        }
      } catch (error) {
        console.error("Failed to load trays:", error);
      }
    }
  };

  const totalGridQty = useMemo(() => {
    return gridRows.reduce((s, r) => s + r.qty, 0);
  }, [gridRows]);

  const buildGridRowsFromSelection = () => {
    const selections = lensBulkSelection?.selections || {};
    return Object.entries(selections)
      .map(([key, val]) => {
        const qty = getSelectionQty(val);
        if (qty <= 0) return null;
        const parsed = parseKey(key);
        const tray_id = typeof val === "object" && val !== null ? val.tray_id || "" : "";
        const rowCostPrice = typeof val === "object" && val !== null ? val.costPrice ?? "" : "";
        return { key, qty, pending: qty, tray_id, costPrice: rowCostPrice, ...parsed };
      })
      .filter(Boolean);
  };

  const trayLabel = (tray) => {
    const occ = trayOccupancyData[tray.id];
    if (!occ) return tray.name;
    if (!occ.capacity) return `${tray.name} (no capacity set)`;
    return `${tray.name} — ${occ.availableQty}/${occ.capacity} available`;
  };

  const trayOptions = trays.map((tray) => ({
    value: tray.id,
    label: trayLabel(tray),
  }));

  const addSplit = (key) => {
    setRowSplits((prev) => ({ ...prev, [key]: [...(prev[key] || []), emptySplit()] }));
  };

  const removeSplit = (key, idx) => {
    setRowSplits((prev) => {
      const updated = (prev[key] || []).filter((_, i) => i !== idx);
      return { ...prev, [key]: updated.length > 0 ? updated : [emptySplit()] };
    });
  };

  const updateSplit = (key, idx, field, value) => {
    setRowSplits((prev) => ({
      ...prev,
      [key]: (prev[key] || []).map((sp, i) => (i === idx ? { ...sp, [field]: value } : sp)),
    }));
    if (field === "tray_id" && value) {
      fetchTrayOccupancy(parseInt(value, 10));
    }
  };

  const validateStep1 = () => {
    if (!selectedLocationId) {
      toast({ title: "Error", description: "Please select a location", variant: "destructive" });
      return false;
    }
    if (trays.length === 0) {
      toast({ title: "Error", description: "No trays found for this location", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!Type_id || !category_id || !lens_id || !coating_id) {
      toast({ title: "Error", description: "Select type, category, lens product, and coating", variant: "destructive" });
      return false;
    }
    const rows = buildGridRowsFromSelection();
    if (rows.length === 0) {
      toast({ title: "Error", description: "Enter at least one quantity in the grid", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    const trayAllocations = {};

    for (const row of gridRows) {
      const splits = (rowSplits[row.key] || []).filter((sp) => parseFloat(sp.qty) > 0);
      if (splits.length === 0) {
        toast({
          title: "Tray allocation required",
          description: `Allocate trays for SPH ${fmtPower(row.spherical)} / ${isProgressive ? "ADD" : "CYL"} ${fmtPower(isProgressive ? row.add : row.cylindrical)}`,
          variant: "destructive",
        });
        return false;
      }

      const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.qty) || 0), 0);
      if (Math.abs(splitTotal - row.qty) > 0.001) {
        toast({
          title: "Quantity mismatch",
          description: `SPH ${fmtPower(row.spherical)}: split total (${splitTotal}) must equal grid qty (${row.qty})`,
          variant: "destructive",
        });
        return false;
      }

      for (const sp of splits) {
        if (!sp.tray_id) {
          toast({ title: "Tray required", description: "Select a tray for each split", variant: "destructive" });
          return false;
        }
        const tId = parseInt(sp.tray_id, 10);
        const occ = trayOccupancyData[tId];
        if (!occ?.capacity) {
          toast({
            title: "Tray capacity not set",
            description: `Set capacity for tray "${occ?.trayName || tId}" in Tray Master before inwarding.`,
            variant: "destructive",
          });
          return false;
        }
        trayAllocations[tId] = (trayAllocations[tId] || 0) + parseFloat(sp.qty);
      }
    }

    for (const [tId, allocated] of Object.entries(trayAllocations)) {
      const occ = trayOccupancyData[parseInt(tId, 10)];
      if (occ && allocated > occ.availableQty + 0.001) {
        toast({
          title: "Tray capacity exceeded",
          description: `Tray "${occ.trayName}" only has ${occ.availableQty} available, but this batch allocates ${allocated}.`,
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handleNext = async () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      const rows = buildGridRowsFromSelection();
      setGridRows(rows);
      const initialSplits = {};
      rows.forEach((row) => {
        // Carry forward Tray/Price chosen in the Step 2 grid table, if any —
        // user can still adjust/split further in Step 3.
        initialSplits[row.key] = [{
          tray_id: row.tray_id ? String(row.tray_id) : "",
          qty: String(row.qty),
          costPrice: row.costPrice ?? "",
        }];
      });
      setRowSplits(initialSplits);
      await preloadTrayOccupancies(trays);
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setShowSubmitWarnings(true);
    if (!validateStep3()) return;

    const rows = gridRows.map((row) => ({
      key: row.key,
      spherical: row.spherical,
      cylindrical: row.cylindrical,
      add: row.add,
      eye: row.eye,
      splits: (rowSplits[row.key] || [])
        .filter((sp) => parseFloat(sp.qty) > 0)
        .map((sp) => ({
          tray_id: parseInt(sp.tray_id, 10),
          qty: parseFloat(sp.qty),
          ...(sp.costPrice !== "" && sp.costPrice != null ? { costPrice: parseFloat(sp.costPrice) } : {}),
        })),
    }));

    try {
      setIsSaving(true);
      const res = await bulkInwardFromGrid({
        location_id: parseInt(selectedLocationId, 10),
        lens_id: parseInt(lens_id, 10),
        category_id: parseInt(category_id, 10),
        Type_id: parseInt(Type_id, 10),
        coating_id: parseInt(coating_id, 10),
        costPrice: parseFloat(costPrice) || 0,
        defaultDia: "70",
        rows,
      });
      if (res.success) {
        toast({
          title: "Stock initialized",
          description: `${res.data.createdCount} item(s) · ${res.data.totalQuantity} units added`,
        });
        onSuccess?.();
        onClose();
      } else {
        throw new Error(res.message || "Failed to create stock");
      }
    } catch (error) {
      toast({ title: "Error", description: error.message || "Failed to create inventory items", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedLocation = locations.find((l) => String(l.id) === selectedLocationId);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle>Initialize Stock (Grid)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Step {step} of 3 · Location → Power grid → Multi-tray allocation
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0" disabled={isSaving}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex-1 h-2 rounded-full ${s <= step ? "bg-primary" : "bg-gray-300"}`} />
            ))}
          </div>

          {step === 1 && (
            <FormSelect
              label="Location *"
              name="location"
              value={selectedLocationId || null}
              onChange={handleLocationChange}
              options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
              placeholder="Choose storage location..."
              isSearchable
              isLoading={isLoading}
            />
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription className="text-sm">
                  Location: <span className="font-semibold">{selectedLocation?.name}</span>
                  {" · "}
                  {trays.length} tray(s) available
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormSelect
                  label="Type *"
                  name="Type_id"
                  options={lensTypes}
                  value={Type_id}
                  onChange={(v) => { setTypeId(v); setCategoryId(""); setLensId(""); setCoatingId(""); setLensBulkSelection(null); }}
                  placeholder="Select type"
                  isSearchable
                />
                <FormSelect
                  label="Category *"
                  name="category_id"
                  options={lensCategories}
                  value={category_id}
                  onChange={(v) => { setCategoryId(v); setLensId(""); setCoatingId(""); setLensBulkSelection(null); }}
                  placeholder="Select category"
                  isSearchable
                  disabled={!Type_id}
                />
                <FormSelect
                  label="Lens Product *"
                  name="lens_id"
                  options={filteredProducts.map((p) => ({ id: p.id, name: p.lens_name || p.name }))}
                  value={lens_id}
                  onChange={(v) => { setLensId(v); setCoatingId(""); setLensBulkSelection(null); }}
                  placeholder="Select product"
                  isSearchable
                  disabled={!category_id}
                />
              </div>

              <FormInput
                label="Cost Price (per unit)"
                name="costPrice"
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                clearZeroOnFocus
              />

              {lens_id && category_id && (
                <BulkLensSelection
                  value={lensBulkSelection}
                  onChange={setLensBulkSelection}
                  categoryName={categoryName}
                  lensId={lens_id}
                  coatings={coatings}
                  coatingId={coating_id}
                  onCoatingChange={(v) => { setCoatingId(v); setLensBulkSelection(null); }}
                  defaultCostPrice={costPrice}
                  trayOptions={trayOptions}
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription className="text-sm space-y-1">
                  <div>Location: <span className="font-semibold">{selectedLocation?.name}</span></div>
                  <div>Product: <span className="font-semibold">{filteredProducts.find((p) => String(p.id) === String(lens_id))?.lens_name || lens_id}</span></div>
                  <div>Total units: <span className="font-semibold text-primary">{totalGridQty}</span></div>
                </AlertDescription>
              </Alert>

              {/* Tray capacity summary */}
              <Card>
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm">Trays at this location</CardTitle>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2 max-h-40 overflow-y-auto">
                  {trays.map((tray) => {
                    const occ = trayOccupancyData[tray.id];
                    const pct = occ?.percentUsed ?? 0;
                    return (
                      <div key={tray.id} className="text-xs border rounded p-2">
                        <div className="flex justify-between font-medium">
                          <span>{tray.name}</span>
                          {occ ? (
                            occ.capacity ? (
                              <span>{occ.currentQty}/{occ.capacity} · {occ.availableQty} free</span>
                            ) : (
                              <span className="text-destructive">No capacity set</span>
                            )
                          ) : (
                            <span className="text-muted-foreground">Loading…</span>
                          )}
                        </div>
                        {occ?.capacity > 0 && (
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-full rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-orange-500" : "bg-green-500"}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Per-row tray splits */}
              <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                {gridRows.map((row) => {
                  const splits = rowSplits[row.key] || [emptySplit()];
                  const splitTotal = splits.reduce((s, sp) => s + (parseFloat(sp.qty) || 0), 0);
                  const isOver = splitTotal > row.qty + 0.001;
                  const colLabel = isProgressive ? "ADD" : "CYL";
                  const colVal = isProgressive ? row.add : row.cylindrical;

                  return (
                    <Card key={row.key} className={isOver ? "border-destructive" : ""}>
                      <CardHeader className="p-3 pb-2">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm font-mono">
                            SPH {fmtPower(row.spherical)} / {colLabel} {fmtPower(colVal)}
                            {row.eye && <span className="ml-1 text-primary">({row.eye})</span>}
                          </CardTitle>
                          <Badge variant="outline">Qty: {row.qty}</Badge>
                        </div>
                        {splitTotal > 0 && (
                          <p className={`text-xs ${isOver ? "text-destructive" : "text-muted-foreground"}`}>
                            Allocated: {splitTotal}{isOver ? " — exceeds grid qty" : ""}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        {splits.map((split, splitIdx) => {
                          const occ = split.tray_id ? trayOccupancyData[parseInt(split.tray_id, 10)] : null;
                          return (
                            <div key={splitIdx} className="flex gap-2 items-start border-b pb-2 last:border-0">
                              <div className="flex-1 min-w-0">
                                <FormSelect
                                  name={`tray_${row.key}_${splitIdx}`}
                                  value={split.tray_id || null}
                                  onChange={(v) => updateSplit(row.key, splitIdx, "tray_id", v ? String(v) : "")}
                                  options={trayOptions}
                                  placeholder="Select tray"
                                  isClearable={false}
                                />
                                {occ && (
                                  <div className="mt-1 text-[10px] px-1.5 py-0.5 rounded bg-muted text-center">
                                    {occ.capacity
                                      ? `${occ.currentQty}/${occ.capacity} (${occ.availableQty} available)`
                                      : "Capacity not set — update Tray Master"}
                                  </div>
                                )}
                                {showSubmitWarnings && !split.tray_id && (
                                  <p className="text-[10px] text-destructive mt-0.5">Tray required</p>
                                )}
                              </div>
                              <div className="w-24">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={split.qty}
                                  onChange={(e) => updateSplit(row.key, splitIdx, "qty", e.target.value)}
                                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                                  placeholder="Qty"
                                />
                              </div>
                              <div className="w-28">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={split.costPrice ?? ""}
                                  onChange={(e) => updateSplit(row.key, splitIdx, "costPrice", e.target.value)}
                                  className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                                  placeholder={`Price (${costPrice || 0})`}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive shrink-0"
                                onClick={() => removeSplit(row.key, splitIdx)}
                                disabled={splits.length <= 1}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          );
                        })}
                        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => addSplit(row.key)}>
                          <Plus className="h-3 w-3" /> Add tray split
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={handleBack} disabled={isSaving} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={handleNext} disabled={isSaving} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSaving || gridRows.length === 0}>
                {isSaving ? "Saving..." : "Create Stock Items"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
