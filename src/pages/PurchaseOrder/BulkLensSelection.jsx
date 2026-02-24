import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

/**
 * BulkLensSelection Component
 * Provides grid-based lens selection for bulk purchase orders
 */
export default function BulkLensSelection({ 
  value = null, 
  onChange = () => {}, 
  disabled = false 
}) {
  // Default configuration
  const [config, setConfig] = useState({
    eyeSelection: "", // "Single" | "Both" - no default selection
    additionWise: false,
    ranges: {
      sphFrom: 0,
      sphTo: 2,
      cylFrom: 0,
      cylTo: 2,
      addFrom: 1,
      addTo: 3
    }
  });

  // Grid selections - stores quantity for each cell
  const [selections, setSelections] = useState({});
  
  // Current selected cell info (for floating display)
  const [selectedCell, setSelectedCell] = useState(null);
  
  // Accordion states for addition sections
  const [expandedAdditions, setExpandedAdditions] = useState({});
  
  // Grid display state
  const [showGrid, setShowGrid] = useState(false);

  // Initialize from existing value
  useEffect(() => {
    if (value) {
      setConfig(prev => ({ ...prev, ...value }));
      setSelections(value.selections || {});
      
      // Expand all addition sections if they have data
      if (value.additionWise && value.selections) {
        const expanded = {};
        Object.keys(value.selections).forEach(key => {
          if (key.endsWith('_add')) {
            expanded[key] = true;
          }
        });
        setExpandedAdditions(expanded);
      }
    }
  }, [value]);

  // Generate range values with 0.25 increments
  const generateRange = (from, to) => {
    const values = [];
    for (let i = from; i <= to; i += 0.25) {
      values.push(parseFloat(i.toFixed(2)));
    }
    return values;
  };

  const sphValues = generateRange(config.ranges.sphFrom, config.ranges.sphTo);
  const cylValues = generateRange(config.ranges.cylFrom, config.ranges.cylTo);
  const addValues = generateRange(config.ranges.addFrom, config.ranges.addTo);

  // Debounce timer ref
  const updateTimerRef = useRef(null);

  // Update parent component when selections change (with debouncing)
  const updateParent = useCallback((newSelections, immediate = false) => {
    const performUpdate = () => {
      const result = {
        ...config,
        selections: newSelections
      };
      onChange(result);
    };

    if (immediate) {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      performUpdate();
    } else {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      updateTimerRef.current = setTimeout(performUpdate, 300); // 300ms debounce
    }
  }, [config, onChange]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Handle range configuration changes
  const handleRangeChange = (field, value) => {
    const newValue = parseFloat(value);
    const currentValue = config.ranges[field];
    
    // Only update if the value actually changed
    if (newValue !== currentValue && !isNaN(newValue)) {
      const newRanges = { ...config.ranges, [field]: newValue };
      const newConfig = { ...config, ranges: newRanges };
      setConfig(newConfig);
      
      // Clear selections when ranges change
      setSelections({});
      // Update parent immediately since we're clearing selections
    //   updateParent({}, true);
    }
  };

  // Handle eye selection change
  const handleEyeSelectionChange = (eyeSelection) => {
    const newConfig = { 
      ...config, 
      eyeSelection,
      // Reset additionWise when switching to Single
      additionWise: eyeSelection === "Single" ? false : config.additionWise
    };
    setConfig(newConfig);
    
    // Hide grid and clear selections when eye selection changes
    setShowGrid(false);
    setSelections({});
    setExpandedAdditions({});
    
    // Update parent with the new config including eyeSelection
    const result = {
      ...newConfig,
      selections: {}
    };
    onChange(result);
  };

  // Handle addition wise toggle
  const handleAdditionWiseChange = (additionWise) => {
    const newConfig = { ...config, additionWise };
    setConfig(newConfig);
    
    // Clear selections and expanded states
    setSelections({});
    setExpandedAdditions({});
    // Update parent immediately since we're clearing selections
    // updateParent({}, true);
  };

  // Handle cell selection
  const handleCellClick = (sph, cyl, addValue = null, eye = null) => {
    const cellKey = addValue 
      ? `${addValue}_add_sph_${sph}_cyl_${cyl}${eye ? `_${eye}` : ''}`
      : `sph_${sph}_cyl_${cyl}${eye ? `_${eye}` : ''}`;

    setSelectedCell({
      sph,
      cyl,
      add: addValue,
      eye,
      key: cellKey
    });
  };

  // Handle quantity input change
  const handleQuantityChange = (quantity) => {
    if (!selectedCell) return;
    
    const newSelections = { ...selections };
    
    if (quantity && quantity > 0) {
      if (config.eyeSelection === "Single") {
        newSelections[selectedCell.key] = { quantity: parseInt(quantity) };
      } else {
        // For "Both" mode, handle L/R structure
        if (!newSelections[selectedCell.key]) {
          newSelections[selectedCell.key] = {};
        }
        if (selectedCell.eye) {
          newSelections[selectedCell.key][selectedCell.eye] = parseInt(quantity);
        }
      }
    } else {
      // Remove the selection if quantity is 0 or empty
      if (config.eyeSelection === "Single") {
        delete newSelections[selectedCell.key];
      } else if (selectedCell.eye && newSelections[selectedCell.key]) {
        delete newSelections[selectedCell.key][selectedCell.eye];
        // Remove the parent object if both L and R are empty
        if (Object.keys(newSelections[selectedCell.key]).length === 0) {
          delete newSelections[selectedCell.key];
        }
      }
    }
    
    setSelections(newSelections);
    // Use debounced update for quantity changes to prevent excessive calls
    // updateParent(newSelections);
  };

  // Get current quantity for a cell
  const getCellQuantity = (sph, cyl, addValue = null, eye = null) => {
    const cellKey = addValue 
      ? `${addValue}_add_sph_${sph}_cyl_${cyl}${eye ? `_${eye}` : ''}`
      : `sph_${sph}_cyl_${cyl}${eye ? `_${eye}` : ''}`;

    if (config.eyeSelection === "Single") {
      return selections[cellKey]?.quantity || 0;
    } else {
      return selections[cellKey]?.[eye] || 0;
    }
  };

  // Check if cell is selected
  const isCellSelected = (sph, cyl, addValue = null, eye = null) => {
    if (!selectedCell) return false;
    return selectedCell.sph === sph && 
           selectedCell.cyl === cyl && 
           selectedCell.add === addValue && 
           selectedCell.eye === eye;
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelections({});
    setSelectedCell(null);
    // Update parent immediately for clear action
    // updateParent({}, true);
  };

  // Render grid for single eye selection
  const renderSingleGrid = (addValue = null) => (
    <div className="space-y-3">
      {/* Grid Container */}
      <div className="border border-gray-400 rounded-lg overflow-auto max-h-[500px] max-w-full">
        <div className="flex flex-col min-w-max">
          {/* CYL Header - Fixed like Excel column header */}
          <div className="h-8 bg-gray-100 border-b border-gray-300 flex sticky top-0 z-20">
            <div className="w-20 border-r border-gray-300 bg-gray-100"></div> {/* Empty corner for SPH column */}
            <div className="flex-1 flex items-center justify-center bg-gray-100">
              <div className="text-xs font-medium text-blue-600 whitespace-nowrap">CYL</div>
            </div>
          </div>
          
          {/* Main Grid */}
          <div className="flex min-w-max">
            {/* SPH Header - Fixed like Excel row header */}
            <div className="w-20 bg-gray-100 border-r border-gray-300 flex items-center justify-center flex-shrink-0 sticky left-0 z-15">
              <div className="transform -rotate-90 text-xs font-medium text-blue-600 whitespace-nowrap">SPH</div>
            </div>
            
            {/* Main Table */}
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="w-20 bg-gray-100 border-b border-r border-gray-300 p-2 text-xs font-medium sticky left-0 top-0 z-30"></th>
                  {cylValues.map(cyl => (
                    <th key={cyl} className="bg-gray-100 border-b border-r border-gray-300 p-1 text-xs font-medium text-center min-w-[40px] sticky top-0 z-20">
                      {cyl}
                    </th>
                  ))}
                </tr>
              </thead>
            <tbody>
              {sphValues.map(sph => (
                <tr key={`sph-${sph}`}>
                  <td className="bg-gray-100 border-r border-b border-gray-300 p-2 text-xs font-medium text-center sticky left-0 z-10">
                    {sph}
                  </td>
                  {cylValues.map(cyl => {
                    const quantity = getCellQuantity(sph, cyl, addValue);
                    const isSelected = isCellSelected(sph, cyl, addValue);
                    return (
                      <td 
                        key={`cell-${sph}-${cyl}`} 
                        className={`border-r border-b border-gray-300 p-0 text-center cursor-pointer ${
                          isSelected ? 'bg-blue-100' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleCellClick(sph, cyl, addValue)}
                      >
                        <Input
                          type="number"
                          min="0"
                          value={quantity || ''}
                          onChange={(e) => {
                            handleQuantityChange(e.target.value);
                          }}
                          onFocus={() => handleCellClick(sph, cyl, addValue)}
                          onBlur={() => setSelectedCell(null)}
                          className="w-full h-full text-xs text-center border-0 cursor-pointer rounded-none focus:outline-none bg-transparent mx-auto my-auto"
                          placeholder="0"
                          disabled={disabled}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Render grid for both eyes selection
  const renderBothGrid = (addValue = null) => (
    <div className="space-y-3">
      {/* Grid Container */}
      <div className="border border-gray-400 rounded-lg overflow-auto max-h-[500px] max-w-full">
        <div className="flex flex-col min-w-max">
          {/* CYL Header - Fixed like Excel column header */}
          <div className="h-8 bg-gray-100 border-b border-gray-300 flex sticky top-0 z-20">
            <div className="w-20 border-r border-gray-300 bg-gray-100"></div> {/* Empty corner for SPH column */}
            <div className="flex-1 flex items-center justify-center bg-gray-100">
              <div className="text-xs font-medium text-blue-600 whitespace-nowrap">CYL</div>
            </div>
          </div>
          
          {/* Main Grid */}
          <div className="flex min-w-max">
            {/* SPH Header - Fixed like Excel row header */}
            <div className="w-20 bg-gray-100 border-r border-gray-300 flex items-center justify-center flex-shrink-0 sticky left-0 z-15">
              <div className="transform -rotate-90 text-xs font-medium text-blue-600 whitespace-nowrap">SPH</div>
            </div>
            
            {/* Main Table */}
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="w-20 bg-gray-100 border-b border-r border-gray-300 p-2 text-xs font-medium sticky left-0 top-0 z-30"></th>
                  {cylValues.map(cyl => (
                    <th key={`cyl-header-${cyl}`} colSpan={2} className="bg-gray-100 border-b border-r border-gray-300 p-2 text-xs font-medium text-center sticky top-0 z-20">
                      {cyl}
                    </th>
                  ))}
                </tr>
              <tr>
                <th className="w-20 bg-gray-100 border-b border-r border-gray-300 p-1 sticky left-0 top-8 z-25"></th>
                {cylValues.map((cyl, index) => (
                  <React.Fragment key={`lr-${cyl}-${index}`}>
                    <th className="bg-gray-50 border-b border-r border-gray-300 p-1 text-xs font-medium text-center min-w-[35px] sticky top-8 z-15">L</th>
                    <th className="bg-gray-50 border-b border-r border-gray-300 p-1 text-xs font-medium text-center min-w-[35px] sticky top-8 z-15">R</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {sphValues.map(sph => (
                <tr key={`sph-${sph}`}>
                  <td className="bg-gray-100 border-r border-b border-gray-300 p-2 text-xs font-medium text-center sticky left-0 z-10">
                    {sph}
                  </td>
                  {cylValues.map(cyl => (
                    <React.Fragment key={`both-${sph}-${cyl}`}>
                      {/* Left eye cell */}
                      <td 
                        className={`border-r border-b border-gray-300 p-0 text-center cursor-pointer ${
                          isCellSelected(sph, cyl, addValue, 'L') ? 'bg-blue-100' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleCellClick(sph, cyl, addValue, 'L')}
                      >
                        <Input
                          type="number"
                          min="0"
                          value={getCellQuantity(sph, cyl, addValue, 'L') || ''}
                          onChange={(e) => {
                            handleQuantityChange(e.target.value);
                          }}
                          onFocus={() => handleCellClick(sph, cyl, addValue, 'L')}
                          onBlur={() => setSelectedCell(null)}
                          className="w-[90%] h-[50%] text-xs text-center border-0 rounded-none focus:outline-none bg-transparent mx-auto my-auto"
                          placeholder="0"
                          disabled={disabled}
                        />
                      </td>
                      {/* Right eye cell */}
                      <td 
                        className={`border-r border-b border-gray-300 p-0 text-center cursor-pointer ${
                          isCellSelected(sph, cyl, addValue, 'R') ? 'bg-blue-100' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleCellClick(sph, cyl, addValue, 'R')}
                      >
                        <Input
                          type="number"
                          min="0"
                          value={getCellQuantity(sph, cyl, addValue, 'R') || ''}
                          onChange={(e) => {
                            handleQuantityChange(e.target.value);
                          }}
                          onFocus={() => handleCellClick(sph, cyl, addValue, 'R')}
                          onBlur={() => setSelectedCell(null)}
                          className="w-[90%] h-[50%] text-xs text-center border-0 rounded-none focus:outline-none bg-transparent mx-auto my-auto"
                          placeholder="0"
                          disabled={disabled}
                        />
                      </td>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  );

  // Render addition section (accordion)
  const renderAdditionSection = (addValue) => {
    const sectionKey = `${addValue}_add`;
    const isExpanded = expandedAdditions[sectionKey];
    
    return (
      <Card key={sectionKey} className="overflow-hidden">
        <div 
          className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setExpandedAdditions(prev => ({
            ...prev,
            [sectionKey]: !prev[sectionKey]
          }))}
        >
          <div className="flex items-center gap-2">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-primary" />
            ) : (
              <ChevronRight className="h-4 w-4 text-primary" />
            )}
            <h4 className="font-medium text-sm">
              {addValue} Add
            </h4>
          </div>
        </div>
        
        {isExpanded && (
          <div className="border-t p-4">
            {config.eyeSelection === "Single" 
              ? renderSingleGrid(addValue) 
              : renderBothGrid(addValue)
            }
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {/* Configuration Section */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Bulk Lens Selection Configuration</CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-4">
          {/* Eye Selection - moved to top */}
          <div>
            <Label className="text-xs">Eye Selection</Label>
            <RadioGroup 
              value={config.eyeSelection || ""} 
              onValueChange={handleEyeSelectionChange}
              className="flex gap-4 mt-1"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Single" id="single" />
                <Label htmlFor="single" className="text-xs cursor-pointer">Single</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="Both" id="both" />
                <Label htmlFor="both" className="text-xs cursor-pointer">Both</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Range Configuration - only show after eye selection */}
          {config.eyeSelection && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">From SPH</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={config.ranges.sphFrom}
                  onChange={(e) => handleRangeChange('sphFrom', e.target.value)}
                  disabled={disabled}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">To SPH</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={config.ranges.sphTo}
                  onChange={(e) => handleRangeChange('sphTo', e.target.value)}
                  disabled={disabled}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">From CYL</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={config.ranges.cylFrom}
                  onChange={(e) => handleRangeChange('cylFrom', e.target.value)}
                  disabled={disabled}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">To CYL</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={config.ranges.cylTo}
                  onChange={(e) => handleRangeChange('cylTo', e.target.value)}
                  disabled={disabled}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* Addition Wise (only for Both selection) */}
          {config.eyeSelection === "Both" && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="additionWise"
                checked={config.additionWise}
                onCheckedChange={handleAdditionWiseChange}
                disabled={disabled}
              />
              <Label htmlFor="additionWise" className="text-xs">Addition Wise</Label>
            </div>
          )}

          {/* Add Range (only when Addition Wise is enabled) */}
          {config.additionWise && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From Add</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={config.ranges.addFrom}
                  onChange={(e) => handleRangeChange('addFrom', e.target.value)}
                  disabled={disabled}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">To Add</Label>
                <Input
                  type="number"
                  step="0.25"
                  value={config.ranges.addTo}
                  onChange={(e) => handleRangeChange('addTo', e.target.value)}
                  disabled={disabled}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}

          {/* Display and Clear Buttons */}
          {config.eyeSelection && (
            <div className="flex justify-between">
              <Button 
                type="button" 
                variant="default" 
                size="sm"
                onClick={() => setShowGrid(true)}
                disabled={disabled}
                className="text-xs"
              >
                Display Grid
              </Button>
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
          )}
        </CardContent>
      </Card>

      {/* Selection Grid - only show when Display is clicked */}
      {showGrid && (
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Lens Selection Grid</CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <div className="max-h-[600px] overflow-auto border rounded">
              {config.additionWise ? (
                <div className="space-y-3 p-3">
                  {addValues.map(addValue => renderAdditionSection(addValue))}
                </div>
              ) : (
                <div className="p-3">
                  {config.eyeSelection === "Single" 
                    ? renderSingleGrid() 
                    : renderBothGrid()
                  }
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Cell Information (Floating) - only show if grid is displayed and cell is selected */}
      {showGrid && selectedCell && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 min-w-[200px]">
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
            <div>SPH Current: <span className="font-medium">{selectedCell.sph}</span></div>
            <div>CYL Current: <span className="font-medium">{selectedCell.cyl}</span></div>
            {selectedCell.add && (
              <div>Add Current: <span className="font-medium">{selectedCell.add}</span></div>
            )}
            {selectedCell.eye && (
              <div>Eye: <span className="font-medium">{selectedCell.eye}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}