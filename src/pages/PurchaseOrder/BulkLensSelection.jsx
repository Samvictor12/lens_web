import React, { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/**
 * BulkLensSelection Component
 * Grid behaviour is driven by categoryName:
 *   Single      → single-eye grid, columns = CYL
 *   Bifocal     → L/R grid,        columns = CYL
 *   Progressive → L/R grid,        columns = ADD  (no CYL)
 */
export default function BulkLensSelection({
  value = null,
  onChange = () => {},
  disabled = false,
  categoryName = "",
  lensId = null,
}) {
  const lowerCat = (categoryName || "").toLowerCase();
  const isProgressive = lowerCat.includes("prog");
  const eyeMode = lowerCat.includes("single") ? "Single" : "Both";

  const defaultRanges = {
    sphFrom: 0,
    sphTo: 2,
    cylFrom: 0,
    cylTo: 2,
    addFrom: "",
    addTo: "",
  };

  const [ranges, setRanges] = useState(defaultRanges);
  const [selections, setSelections] = useState({});
  const [selectedCell, setSelectedCell] = useState(null);
  const [showGrid, setShowGrid] = useState(false);
  const [showLensWarning, setShowLensWarning] = useState(false);

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
    }
  }, [categoryName]);

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
  const colValues = isProgressive
    ? generateRange(ranges.addFrom, ranges.addTo)
    : generateRange(ranges.cylFrom, ranges.cylTo);
  const colLabel = isProgressive ? "ADD" : "CYL";

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
    const colPart = isProgressive ? `add_${colVal}` : `cyl_${colVal}`;
    return `sph_${sph}_${colPart}${eye ? `_${eye}` : ""}`;
  };

  const getCellQuantity = (sph, colVal, eye = null) => {
    const key = makeCellKey(sph, colVal, eye);
    if (eyeMode === "Single") return selections[key]?.quantity || 0;
    return selections[key]?.[eye] || 0;
  };

  const isCellSelected = (sph, colVal, eye = null) => {
    if (!selectedCell) return false;
    return (
      selectedCell.sph === sph &&
      selectedCell.colVal === colVal &&
      selectedCell.eye === eye
    );
  };

  const handleCellClick = (sph, colVal, eye = null) => {
    setSelectedCell({ sph, colVal, eye, key: makeCellKey(sph, colVal, eye) });
  };

  const handleQuantityChange = (quantity) => {
    if (!selectedCell) return;
    const newSelections = { ...selections };
    const { key, eye } = selectedCell;

    if (quantity && parseFloat(quantity) > 0) {
      if (eyeMode === "Single") {
        newSelections[key] = { quantity: parseInt(quantity) };
      } else {
        if (!newSelections[key]) newSelections[key] = {};
        if (eye) newSelections[key][eye] = parseInt(quantity);
      }
    } else {
      if (eyeMode === "Single") {
        delete newSelections[key];
      } else if (eye && newSelections[key]) {
        delete newSelections[key][eye];
        if (Object.keys(newSelections[key]).length === 0) delete newSelections[key];
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

  // Unified grid renderer
  const renderGrid = () => {
    const isBoth = eyeMode === "Both";

    return (
      <div className="border border-gray-400 rounded-lg overflow-auto max-h-[500px] max-w-full">
        <div className="flex flex-col min-w-max">
          {/* Column label banner */}
          <div className="h-8 bg-gray-100 border-b border-gray-300 flex sticky top-0 z-20">
            <div className="w-20 border-r border-gray-300 bg-gray-100" />
            <div className="flex-1 flex items-center justify-center">
              <span className="text-xs font-medium text-blue-600">{colLabel}</span>
            </div>
          </div>

          <div className="flex min-w-max">
            {/* SPH vertical label */}
            <div className="w-20 bg-gray-100 border-r border-gray-300 flex items-center justify-center flex-shrink-0 sticky left-0 z-[15]">
              <span className="transform -rotate-90 text-xs font-medium text-blue-600 whitespace-nowrap">
                SPH
              </span>
            </div>

            <table className="border-collapse">
              <thead>
                {/* Column value headers */}
                <tr>
                  <th className="w-20 bg-gray-100 border-b border-r border-gray-300 p-2 text-xs font-medium sticky left-0 top-0 z-30" />
                  {colValues.map((col) =>
                    isBoth ? (
                      <th
                        key={col}
                        colSpan={2}
                        className="bg-gray-100 border-b border-r border-gray-300 p-2 text-xs font-medium text-center sticky top-0 z-20"
                      >
                        {col}
                      </th>
                    ) : (
                      <th
                        key={col}
                        className="bg-gray-100 border-b border-r border-gray-300 p-1 text-xs font-medium text-center min-w-[40px] sticky top-0 z-20"
                      >
                        {col}
                      </th>
                    )
                  )}
                </tr>
                {/* L / R sub-headers for Both mode */}
                {isBoth && (
                  <tr>
                    <th className="w-20 bg-gray-100 border-b border-r border-gray-300 p-1 sticky left-0 top-8 z-[25]" />
                    {colValues.map((col, i) => (
                      <React.Fragment key={`lr-${col}-${i}`}>
                        <th className="bg-gray-50 border-b border-r border-gray-300 p-1 text-xs font-medium text-center min-w-[35px] sticky top-8 z-[15]">
                          L
                        </th>
                        <th className="bg-gray-50 border-b border-r border-gray-300 p-1 text-xs font-medium text-center min-w-[35px] sticky top-8 z-[15]">
                          R
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {sphValues.map((sph) => (
                  <tr key={sph}>
                    <td className="bg-gray-100 border-r border-b border-gray-300 p-2 text-xs font-medium text-center sticky left-0 z-10">
                      {sph}
                    </td>
                    {isBoth
                      ? colValues.map((col) => (
                          <React.Fragment key={`${sph}-${col}`}>
                            {["L", "R"].map((eye) => (
                              <td
                                key={eye}
                                className={`border-r border-b border-gray-300 p-0 text-center cursor-pointer ${
                                  isCellSelected(sph, col, eye) ? "bg-blue-100" : "hover:bg-gray-50"
                                }`}
                                onClick={() => handleCellClick(sph, col, eye)}
                              >
                                <Input
                                  type="number"
                                  min="0"
                                  value={getCellQuantity(sph, col, eye) || ""}
                                  onChange={(e) => handleQuantityChange(e.target.value)}
                                  onFocus={() => handleCellClick(sph, col, eye)}
                                  onBlur={() => setSelectedCell(null)}
                                  className="w-[90%] h-[50%] text-xs text-center border-0 rounded-none focus:outline-none bg-transparent"
                                  placeholder="0"
                                  disabled={disabled}
                                />
                              </td>
                            ))}
                          </React.Fragment>
                        ))
                      : colValues.map((col) => (
                          <td
                            key={col}
                            className={`border-r border-b border-gray-300 p-0 text-center cursor-pointer ${
                              isCellSelected(sph, col) ? "bg-blue-100" : "hover:bg-gray-50"
                            }`}
                            onClick={() => handleCellClick(sph, col)}
                          >
                            <Input
                              type="number"
                              min="0"
                              value={getCellQuantity(sph, col) || ""}
                              onChange={(e) => handleQuantityChange(e.target.value)}
                              onFocus={() => handleCellClick(sph, col)}
                              onBlur={() => setSelectedCell(null)}
                              className="w-full h-full text-xs text-center border-0 cursor-pointer rounded-none focus:outline-none bg-transparent"
                              placeholder="0"
                              disabled={disabled}
                            />
                          </td>
                        ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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

                {!isProgressive ? (
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
                      setShowLensWarning(false);
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

      {/* Selection Grid */}
      {showGrid && categoryName && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Lens Selection Grid</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="max-h-[600px] overflow-auto border rounded">
              <div className="p-3">{renderGrid()}</div>
            </div>
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

