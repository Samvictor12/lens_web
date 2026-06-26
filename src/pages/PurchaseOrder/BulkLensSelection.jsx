import { useState, useEffect, useCallback, useRef } from "react";
import { X, ChevronDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";

/**
 * BulkLensSelection Component
 * Grid behaviour is driven by categoryName:
 *   Single      → single-eye grid, columns = CYL
 *   Bifocal     → single-eye grid, columns = ADD  (no L/R)
 *   Progressive → R/L grid,        columns = ADD
 */
export default function BulkLensSelection({
  value = null,
  onChange = () => {},
  disabled = false,
  categoryName = "",
  lensId = null,
  coatings = [],
  coatingId = null,
  onCoatingChange = () => {},
  defaultCostPrice = "",
  trayOptions = [],
}) {
  const lowerCat = (categoryName || "").toLowerCase();
  const isProgressive = lowerCat.includes("prog");
  const isBifocal = lowerCat.includes("bifocal") || lowerCat.includes("bi-focal");
  const isSingleVision =
    (lowerCat.includes("single") || lowerCat.includes("reading")) && !isProgressive && !isBifocal;
  // Only Progressive uses per-eye (R/L) grid; Single & Bifocal use single-eye grid
  const eyeMode = isProgressive ? "Both" : "Single";

  const defaultRanges = {
    sphFrom: 0,
    sphTo: 2,
    cylFrom: isSingleVision ? 0 : 0,
    cylTo: isSingleVision ? 0 : 2,
    addFrom: "",
    addTo: "",
  };

  const [ranges, setRanges] = useState(defaultRanges);
  const [selections, setSelections] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showLensWarning, setShowLensWarning] = useState(false);
  const [showCoatingWarning, setShowCoatingWarning] = useState(false);
  const [expandedCoatings, setExpandedCoatings] = useState({});

  // Initialise from existing value on mount only
  useEffect(() => {
    if (value) {
      if (value.ranges) setRanges((prev) => ({ ...prev, ...value.ranges }));
      const sel = value.selections || {};
      setSelections(sel);
      // Auto-show grid if there are existing selections
      if (Object.keys(sel).length > 0) setShowGrid(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset grid when category changes
  const prevCategoryRef = useRef(categoryName);
  useEffect(() => {
    if (prevCategoryRef.current !== categoryName) {
      prevCategoryRef.current = categoryName;
      setShowGrid(false);
      setSelections({});
      setSelectedCell(null);
      setRanges({
        sphFrom: 0,
        sphTo: 2,
        cylFrom: isSingleVision ? 0 : 0,
        cylTo: isSingleVision ? 0 : 2,
        addFrom: "",
        addTo: "",
      });
    }
  }, [categoryName, isSingleVision]);

  // Generate 0.25-step range
  const generateRange = (from, to) => {
    const f = parseFloat(from);
    const t = parseFloat(to);
    if (isNaN(f) || isNaN(t) || f > t) return [];
    const values = [];
    for (let i = f; i <= t + 0.001; i += 0.25) {
      values.push(parseFloat(i.toFixed(2)));
    }
    return values;
  };

  const sphValues = generateRange(ranges.sphFrom, ranges.sphTo);
  // Bifocal and Progressive both use ADD column; Single uses CYL
  const useAdd = isProgressive || isBifocal;
  const colValues = useAdd
    ? generateRange(ranges.addFrom, ranges.addTo)
    : generateRange(ranges.cylFrom, ranges.cylTo);
  const colLabel = useAdd ? "ADD" : "CYL";

  // Debounced parent notify
  const updateTimerRef = useRef(null);
  const notifyParent = useCallback(
    (newSelections) => {
      if (updateTimerRef.current) clearTimeout(updateTimerRef.current);
      updateTimerRef.current = setTimeout(() => {
        onChange({ ranges, selections: newSelections });
      }, 300);
    },
    [ranges, onChange]
  );
  useEffect(
    () => () => { if (updateTimerRef.current) clearTimeout(updateTimerRef.current); },
    []
  );

  const handleRangeChange = (field, val) => {
    const parsed = val === "" ? "" : parseFloat(val);
    setRanges((prev) => ({ ...prev, [field]: parsed }));
    setSelections({});
    setShowGrid(false);
  };

  // Cell key helpers
  const makeCellKey = (sph, colVal, eye) => {
    const colPart = useAdd ? `add_${colVal}` : `cyl_${colVal}`;
    return `sph_${sph}_${colPart}${eye ? `_${eye}` : ""}`;
  };

  const handleQuantityChange = (quantity) => {
    if (!selectedCell) return;
    const newSelections = { ...selections };
    const { key, eye } = selectedCell;

    if (quantity && parseFloat(quantity) > 0) {
      if (eyeMode === "Single") {
        newSelections[key] = { ...newSelections[key], quantity: parseInt(quantity) };
      } else {
        if (!newSelections[key]) newSelections[key] = {};
        else newSelections[key] = { ...newSelections[key] };
        if (eye) newSelections[key][eye] = parseInt(quantity);
      }
    } else {
      if (eyeMode === "Single") {
        delete newSelections[key];
      } else if (eye && newSelections[key]) {
        const updated = { ...newSelections[key] };
        delete updated[eye];
        if (updated.R == null && updated.L == null) {
          delete newSelections[key];
        } else {
          newSelections[key] = updated;
        }
      }
    }

    setSelections(newSelections);
    notifyParent(newSelections);
  };

  const handleClearAll = () => {
    setSelections({});
    setSelectedCell(null);
    onChange({ ranges, selections: {} });
  };

  /** Update the Tray or Price metadata for a generated spec row (auto-built list mode). */
  const handleRowMetaChange = (key, field, val) => {
    const newSelections = { ...selections };
    if (!newSelections[key]) return;
    newSelections[key] = { ...newSelections[key], [field]: val };
    setSelections(newSelections);
    notifyParent(newSelections);
  };

  // Auto-built Product Spec string, e.g. "Sph=-2|Cyl=0|Add=0"
  const buildSpecLabel = (sph, colVal) => {
    if (useAdd) return `Sph=${sph}|Cyl=0|Add=${colVal}`;
    return `Sph=${sph}|Cyl=${colVal}|Add=0`;
  };

  const selectedCoating = coatings.find((c) => String(c.id) === String(coatingId));
  const coatingLabel = selectedCoating?.name || selectedCoating?.label || "Selected Coating";

  /** Build the flat list of generated spec rows for the expandable-by-Coating table.
   *  Each row corresponds to one selection key (R/L progressive rows are separate rows). */
  const buildSpecRows = () => {
    const isBoth = eyeMode === "Both";
    const rows = [];
    for (const sph of sphValues) {
      for (const col of colValues) {
        if (isBoth) {
          for (const eye of ["R", "L"]) {
            const key = makeCellKey(sph, col, eye);
            rows.push({
              key,
              sph,
              colVal: col,
              eye,
              specLabel: `${buildSpecLabel(sph, col)}|Eye=${eye}`,
            });
          }
        } else {
          const key = makeCellKey(sph, col);
          rows.push({ key, sph, colVal: col, eye: null, specLabel: buildSpecLabel(sph, col) });
        }
      }
    }
    return rows;
  };

  const specRows = showGrid ? buildSpecRows() : [];

  const toggleCoatingExpanded = () => {
    setExpandedCoatings((prev) => ({ ...prev, [coatingId]: !prev[coatingId] }));
  };

  // Render the expandable-by-Coating list: a single header for the form-level
  // selected coating (coating is a single required selection, not a range),
  // which expands to reveal the 4-column table (Spec / Qty / Tray / Price).
  const renderCoatingExpandableList = () => {
    const isExpanded = expandedCoatings[coatingId] !== false; // default expanded
    return (
      <div className="border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={toggleCoatingExpanded}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 hover:bg-gray-200 text-left"
        >
          <span className="text-sm font-medium flex items-center gap-1.5">
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
            {coatingLabel}
            <span className="text-xs text-muted-foreground font-normal">({specRows.length} spec{specRows.length !== 1 ? "s" : ""})</span>
          </span>
        </button>
        {isExpanded && (
          <div className="overflow-auto max-h-[480px]">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b">
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Product Spec</th>
                  <th className="px-2 py-1.5 text-center font-medium text-muted-foreground w-20">Qty</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-48">Tray</th>
                  <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-32">Price</th>
                </tr>
              </thead>
              <tbody>
                {specRows.map((row) => {
                  const sel = selections[row.key] || {};
                  const qty = eyeMode === "Single" ? sel.quantity || "" : sel[row.eye] || "";
                  return (
                    <tr key={row.key} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-2 py-1 font-mono">{row.specLabel}</td>
                      <td className="px-2 py-1">
                        <Input
                          type="number"
                          min="0"
                          value={qty}
                          onChange={(e) => {
                            setSelectedCell({ sph: row.sph, colVal: row.colVal, eye: row.eye, key: row.key });
                            handleQuantityChange(e.target.value);
                          }}
                          className="w-full h-7 text-xs text-center"
                          placeholder="0"
                          disabled={disabled}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <FormSelect
                          name={`tray_${row.key}`}
                          value={sel.tray_id || null}
                          onChange={(v) => handleRowMetaChange(row.key, "tray_id", v ? String(v) : "")}
                          options={trayOptions}
                          placeholder="Select tray"
                          isClearable={false}
                          disabled={disabled || !qty}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={sel.costPrice ?? ""}
                          onChange={(e) => handleRowMetaChange(row.key, "costPrice", e.target.value)}
                          className="w-full h-7 text-xs"
                          placeholder={`${defaultCostPrice || 0}`}
                          disabled={disabled || !qty}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Configuration */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Bulk Lens Selection Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-4">
          {!categoryName ? (
            <p className="text-xs text-muted-foreground">
              Select a category above to configure the grid.
            </p>
          ) : (
            <>
              {/* Coating selection — required before grid generation */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Coating *</Label>
                  <FormSelect
                    name="coating_id"
                    value={coatingId || null}
                    onChange={(v) => onCoatingChange(v ? String(v) : "")}
                    options={coatings}
                    placeholder="Select coating"
                    isSearchable
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Range inputs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs">From SPH</Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={ranges.sphFrom}
                    onChange={(e) => handleRangeChange("sphFrom", e.target.value)}
                    disabled={disabled}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">To SPH</Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={ranges.sphTo}
                    onChange={(e) => handleRangeChange("sphTo", e.target.value)}
                    disabled={disabled}
                    className="h-8 text-xs"
                  />
                </div>

                {!useAdd ? (
                  <>
                    <div>
                      <Label className="text-xs">From CYL</Label>
                      <Input
                        type="number"
                        step="0.25"
                        value={ranges.cylFrom}
                        onChange={(e) => handleRangeChange("cylFrom", e.target.value)}
                        disabled={disabled}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">To CYL</Label>
                      <Input
                        type="number"
                        step="0.25"
                        value={ranges.cylTo}
                        onChange={(e) => handleRangeChange("cylTo", e.target.value)}
                        disabled={disabled}
                        className="h-8 text-xs"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label className="text-xs">From ADD</Label>
                      <Input
                        type="number"
                        step="0.25"
                        value={ranges.addFrom}
                        onChange={(e) => handleRangeChange("addFrom", e.target.value)}
                        disabled={disabled}
                        className="h-8 text-xs"
                        placeholder="e.g. 0.75"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">To ADD</Label>
                      <Input
                        type="number"
                        step="0.25"
                        value={ranges.addTo}
                        onChange={(e) => handleRangeChange("addTo", e.target.value)}
                        disabled={disabled}
                        className="h-8 text-xs"
                        placeholder="e.g. 3.00"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between items-center">
                <div className="flex flex-col gap-1">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => {
                      if (!lensId) {
                        setShowLensWarning(true);
                        setTimeout(() => setShowLensWarning(false), 3000);
                        return;
                      }
                      if (!coatingId) {
                        setShowCoatingWarning(true);
                        setTimeout(() => setShowCoatingWarning(false), 3000);
                        return;
                      }
                      setShowLensWarning(false);
                      setShowCoatingWarning(false);
                      setShowGrid(true);
                    }}
                    disabled={disabled}
                    className="text-xs"
                  >
                    Display Grid
                  </Button>
                  {showLensWarning && (
                    <p className="text-xs text-destructive">Please select a Lens Product first.</p>
                  )}
                  {showCoatingWarning && (
                    <p className="text-xs text-destructive">Please select a Coating first.</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={disabled}
                  className="text-xs"
                >
                  Clear All
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Selection list — expandable by Coating, each coating expands into a
          Product Spec / Qty / Tray / Price table */}
      {showGrid && categoryName && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Lens Selection — by Coating</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            {renderCoatingExpandableList()}
          </CardContent>
        </Card>
      )}

      {/* Floating cell info */}
      {showGrid && selectedCell && (
        <div className="fixed bottom-4 left-4 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 min-w-[200px]">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">Current Selection</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedCell(null)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1 text-xs">
            <div>SPH: <span className="font-medium">{selectedCell.sph}</span></div>
            <div>{colLabel}: <span className="font-medium">{selectedCell.colVal}</span></div>
            {selectedCell.eye && (
              <div>Eye: <span className="font-medium">{selectedCell.eye}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

