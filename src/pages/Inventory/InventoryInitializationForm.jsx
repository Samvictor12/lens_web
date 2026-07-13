import { useState, useEffect, useMemo, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormSelect } from "@/components/ui/form-select";
import { FormInput } from "@/components/ui/form-input";
import { useToast } from "@/hooks/use-toast";
import { getInventoryDropdowns, bulkInwardFromGrid, getTrayOccupancy } from "@/services/inventory";
import { getTraysByLocation } from "@/services/tray";
import { getLensProductsDropdown } from "@/services/saleOrder";

const fmtPower = (v) => {
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  if (n === 0) return "0.00";
  return n > 0 ? `+${n.toFixed(2)}` : n.toFixed(2);
};

export default function InventoryInitializationForm({ isOpen, onClose, onSuccess }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSubmitWarnings, setShowSubmitWarnings] = useState(false);

  const [locations, setLocations] = useState([]);
  const [lensProducts, setLensProducts] = useState([]);
  const [coatings, setCoatings] = useState([]);

  const [lens_id, setLensId] = useState("");
  const [coating_id, setCoatingId] = useState("");
  const [costPrice, setCostPrice] = useState("");

  const [sphFrom, setSphFrom] = useState("0");
  const [sphTo, setSphTo] = useState("2");
  const [cylFrom, setCylFrom] = useState("0");
  const [cylTo, setCylTo] = useState("0");
  const [addFrom, setAddFrom] = useState("");
  const [addTo, setAddTo] = useState("");

  const [gridRows, setGridRows] = useState([]);
  const [trayOccupancyData, setTrayOccupancyData] = useState({});
  const [locationTrays, setLocationTrays] = useState({}); // locationId -> list of trays
  const [coatingExpanded, setCoatingExpanded] = useState(true);

  const resetForm = () => {
    setStep(1);
    setLensId("");
    setCoatingId("");
    setCostPrice("");
    setGridRows([]);
    setTrayOccupancyData({});
    setLocationTrays({});
    setShowSubmitWarnings(false);
    setSphFrom("0");
    setSphTo("2");
    setCylFrom("0");
    setCylTo("0");
    setAddFrom("");
    setAddTo("");
    setCoatingExpanded(true);
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
      const [invRes, lensRes] = await Promise.all([
        getInventoryDropdowns(),
        getLensProductsDropdown(),
      ]);
      if (invRes.success) {
        setLocations(invRes.data?.locations || []);
        setCoatings(invRes.data?.coatings || []);
      }
      if (lensRes.success) {
        setLensProducts(lensRes.data || []);
      }
    } catch {
      toast({ title: "Error", description: "Failed to load dropdown data", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleRowLocationChange = async (index, value) => {
    const locId = value ? String(value) : "";
    
    setGridRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        location_id: locId,
        tray_id: "",
        qty: "",
        costPrice: "",
      };
      return updated;
    });

    if (locId && !locationTrays[locId]) {
      try {
        const response = await getTraysByLocation(locId);
        if (response.success) {
          const list = response.data || [];
          setLocationTrays((prev) => ({ ...prev, [locId]: list }));
          await preloadTrayOccupancies(list);
        }
      } catch (error) {
        console.error("Failed to load trays for location:", error);
      }
    }
  };

  const getTrayAvailableGap = (trayId, currentRowKey) => {
    if (!trayId) return 0;
    const occ = trayOccupancyData[parseInt(trayId, 10)];
    if (!occ) return 0;
    if (occ.capacity == null) return 999999;
    
    let allocatedInForm = 0;
    gridRows.forEach((row) => {
      if (row.key !== currentRowKey && String(row.tray_id) === String(trayId)) {
        allocatedInForm += parseFloat(row.qty) || 0;
      }
    });
    
    return Math.max(0, occ.availableQty - allocatedInForm);
  };

  const handleRowChange = (index, field, value) => {
    setGridRows((prev) => {
      const updated = [...prev];
      const oldRow = updated[index];
      let newRow = { ...oldRow, [field]: value };
      
      if (field === "tray_id" && value) {
        newRow.costPrice = oldRow.costPrice === "" ? costPrice : oldRow.costPrice;
        const gap = getTrayAvailableGap(value, oldRow.key);
        newRow.qty = oldRow.qty === "" || oldRow.qty === "0" ? String(gap) : oldRow.qty;
      }
      
      updated[index] = newRow;
      return updated;
    });
  };

  const getTrayOptionsForLocation = (locId) => {
    const list = locationTrays[locId] || [];
    return list.map((tray) => {
      const occ = trayOccupancyData[tray.id];
      if (!occ) return { value: tray.id, label: tray.name };
      if (!occ.capacity) return { value: tray.id, label: `${tray.name} (no capacity set)` };
      return {
        value: tray.id,
        label: `${tray.name} — ${occ.availableQty}/${occ.capacity} available`,
      };
    });
  };

  const generateRange = (fromVal, toVal, defaultVal = 0) => {
    const from = fromVal === "" || fromVal == null ? defaultVal : parseFloat(fromVal);
    const to = toVal === "" || toVal == null ? defaultVal : parseFloat(toVal);
    if (isNaN(from) || isNaN(to)) return [defaultVal];
    if (from > to) return [from];
    const result = [];
    for (let v = from; v <= to + 0.001; v += 0.25) {
      result.push(parseFloat(v.toFixed(2)));
    }
    return result;
  };

  const validateStep1 = () => {
    if (!lens_id) {
      toast({ title: "Error", description: "Please select a product", variant: "destructive" });
      return false;
    }
    if (sphFrom === "" || sphTo === "") {
      toast({ title: "Error", description: "Please specify both Spherical range limits", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const allocatedRows = gridRows.filter((row) => row.location_id && row.tray_id && parseFloat(row.qty) > 0);
    if (allocatedRows.length === 0) {
      toast({ title: "Error", description: "Select a location, tray, and enter quantity for at least one spec row", variant: "destructive" });
      return false;
    }

    const trayAllocations = {};
    for (const row of allocatedRows) {
      const qty = parseFloat(row.qty);
      if (isNaN(qty) || qty <= 0) {
        toast({ title: "Error", description: `Please enter a valid quantity for spec "${row.specLabel}"`, variant: "destructive" });
        return false;
      }
      const price = parseFloat(row.costPrice !== "" ? row.costPrice : costPrice);
      if (isNaN(price) || price < 0) {
        toast({ title: "Error", description: `Please enter a valid price for spec "${row.specLabel}"`, variant: "destructive" });
        return false;
      }
      const tId = parseInt(row.tray_id, 10);
      trayAllocations[tId] = (trayAllocations[tId] || 0) + qty;
    }

    for (const [tIdStr, allocated] of Object.entries(trayAllocations)) {
      const tId = parseInt(tIdStr, 10);
      const occ = trayOccupancyData[tId];
      if (!occ?.capacity) {
        toast({
          title: "Tray capacity not set",
          description: `Set capacity for tray "${occ?.trayName || tId}" in Tray Master before inwarding.`,
          variant: "destructive",
        });
        return false;
      }
      if (allocated > occ.availableQty + 0.001) {
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

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      const sphRange = generateRange(sphFrom, sphTo, 0);
      const cylRange = generateRange(cylFrom, cylTo, 0);
      const addRange = generateRange(addFrom, addTo, 0);

      const rows = [];
      sphRange.forEach((sph) => {
        cylRange.forEach((cyl) => {
          addRange.forEach((add) => {
            const specLabel = `Sph=${fmtPower(sph)} | Cyl=${fmtPower(cyl)} | Add=${fmtPower(add)}`;
            const key = `sph_${sph}_cyl_${cyl}_add_${add}`;
            rows.push({
              key,
              spherical: String(sph),
              cylindrical: String(cyl),
              add: String(add),
              specLabel,
              location_id: "",
              tray_id: "",
              qty: "",
              costPrice: "",
            });
          });
        });
      });

      setGridRows(rows);
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setShowSubmitWarnings(true);
    if (!validateStep2()) return;

    const rows = gridRows
      .filter((row) => row.location_id && row.tray_id && parseFloat(row.qty) > 0)
      .map((row) => ({
        spherical: row.spherical,
        cylindrical: row.cylindrical,
        add: row.add === "0" ? null : row.add,
        eye: null,
        splits: [
          {
            location_id: parseInt(row.location_id, 10),
            tray_id: parseInt(row.tray_id, 10),
            qty: parseFloat(row.qty),
            costPrice: row.costPrice !== "" ? parseFloat(row.costPrice) : parseFloat(costPrice) || 0,
          },
        ],
      }));

    try {
      setIsSaving(true);
      const res = await bulkInwardFromGrid({
        lens_id: parseInt(lens_id, 10),
        coating_id: coating_id ? parseInt(coating_id, 10) : null,
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

  const selectedProduct = lensProducts.find((p) => String(p.id) === String(lens_id));
  const selectedCoatingName = coatings.find((c) => String(c.id) === String(coating_id))?.name || coatings.find((c) => String(c.id) === String(coating_id))?.label;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl max-h-[95vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle>Initialize Stock (Grid)</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Step {step} of 2 · Product & ranges → Spec grid & Location / Tray allocation
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0" disabled={isSaving}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-2">
            {[1, 2].map((s) => (
              <div key={s} className={`flex-1 h-2 rounded-full ${s <= step ? "bg-primary" : "bg-gray-300"}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormSelect
                  label="Product"
                  name="product"
                  value={lens_id || null}
                  onChange={(v) => { setLensId(v ? String(v) : ""); }}
                  options={lensProducts.map((p) => ({ value: p.id, label: p.label || p.lens_name }))}
                  placeholder="Choose product..."
                  isSearchable
                  isLoading={isLoading}
                  required
                />

                <FormSelect
                  label="Coating"
                  name="coating"
                  value={coating_id || null}
                  onChange={(v) => { setCoatingId(v ? String(v) : ""); }}
                  options={coatings.map((c) => ({ value: c.id, label: c.name || c.label }))}
                  placeholder="Choose coating..."
                  isSearchable
                  isClearable
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Global Cost Price (per unit)"
                  name="costPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  clearZeroOnFocus
                />
              </div>

              <Card className="border border-muted p-4">
                <h3 className="text-sm font-semibold mb-3">Power Ranges (0.25 steps)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 border-r pr-4 last:border-0">
                    <label className="text-xs font-semibold text-muted-foreground">Spherical <span className="text-red-500">*</span></label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.25"
                        placeholder="From"
                        value={sphFrom}
                        onChange={(e) => setSphFrom(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <input
                        type="number"
                        step="0.25"
                        placeholder="To"
                        value={sphTo}
                        onChange={(e) => setSphTo(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border-r pr-4 last:border-0">
                    <label className="text-xs font-semibold text-muted-foreground">Cylinder</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.25"
                        placeholder="From"
                        value={cylFrom}
                        onChange={(e) => setCylFrom(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <input
                        type="number"
                        step="0.25"
                        placeholder="To"
                        value={cylTo}
                        onChange={(e) => setCylTo(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Add</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.25"
                        placeholder="From"
                        value={addFrom}
                        onChange={(e) => setAddFrom(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <input
                        type="number"
                        step="0.25"
                        placeholder="To"
                        value={addTo}
                        onChange={(e) => setAddTo(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription className="text-sm space-y-1">
                  <div>Product: <span className="font-semibold">{selectedProduct?.label || selectedProduct?.lens_name}</span></div>
                  <div>Coating: <span className="font-semibold text-primary">{selectedCoatingName || "No Coating"}</span></div>
                  <div>Generated combinations: <span className="font-semibold text-primary">{gridRows.length} specs</span></div>
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader className="p-4 flex flex-row items-center justify-between cursor-pointer select-none" onClick={() => setCoatingExpanded(!coatingExpanded)}>
                  <div>
                    <CardTitle className="text-sm font-semibold">
                      {selectedCoatingName || "No Coating"}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Allocated: {gridRows.filter(r => r.location_id && r.tray_id && parseFloat(r.qty) > 0).length} of {gridRows.length} specs · {gridRows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0)} units
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <ChevronDown className={`h-4 w-4 transform transition-transform ${coatingExpanded ? "rotate-180" : ""}`} />
                  </Button>
                </CardHeader>
                
                {coatingExpanded && (
                  <CardContent className="p-0 border-t">
                    <div className="max-h-[50vh] overflow-y-auto">
                      <table className="w-full text-sm text-left text-muted-foreground border-collapse">
                        <thead className="text-xs text-foreground uppercase bg-muted sticky top-0 z-10">
                          <tr>
                            <th className="px-4 py-3 min-w-[150px]">Product Spec</th>
                            <th className="px-4 py-3 min-w-[160px]">Location</th>
                            <th className="px-4 py-3 min-w-[160px]">Tray</th>
                            <th className="px-4 py-3 w-28">Qty</th>
                            <th className="px-4 py-3 w-28">Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {gridRows.map((row, idx) => {
                            const availableGap = getTrayAvailableGap(row.tray_id, row.key);
                            const hasLocationSelected = !!row.location_id;
                            const hasTraySelected = !!row.tray_id;
                            
                            return (
                              <tr key={row.key} className="hover:bg-muted/50 align-middle">
                                <td className="px-4 py-2 font-mono font-medium text-foreground">
                                  {row.specLabel}
                                </td>
                                <td className="px-4 py-2">
                                  <FormSelect
                                    name={`location_${row.key}`}
                                    value={row.location_id || null}
                                    onChange={(v) => handleRowLocationChange(idx, v)}
                                    options={locations.map((loc) => ({ value: loc.id, label: loc.name }))}
                                    placeholder="Select location..."
                                    isClearable
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  <FormSelect
                                    name={`tray_${row.key}`}
                                    value={row.tray_id || null}
                                    onChange={(v) => handleRowChange(idx, "tray_id", v ? String(v) : "")}
                                    options={getTrayOptionsForLocation(row.location_id)}
                                    placeholder="Select tray..."
                                    disabled={!hasLocationSelected}
                                    isClearable
                                  />
                                </td>
                                <td className="px-4 py-2">
                                  {hasTraySelected ? (
                                    <div className="space-y-1">
                                      <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={row.qty}
                                        onChange={(e) => handleRowChange(idx, "qty", e.target.value)}
                                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                        placeholder="Qty"
                                      />
                                      <div className="text-[10px] text-muted-foreground text-center font-semibold">
                                        Gap: {availableGap}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground/60 italic">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-2">
                                  {hasTraySelected ? (
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={row.costPrice}
                                      onChange={(e) => handleRowChange(idx, "costPrice", e.target.value)}
                                      className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                      placeholder={`Price (${costPrice || 0})`}
                                    />
                                  ) : (
                                    <span className="text-xs text-muted-foreground/60 italic">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
            {step > 1 && (
              <Button type="button" variant="outline" onClick={handleBack} disabled={isSaving} className="gap-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </Button>
            )}
            {step < 2 ? (
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
