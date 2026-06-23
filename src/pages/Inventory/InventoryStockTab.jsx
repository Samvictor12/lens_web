import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { FormSelect } from "@/components/ui/form-select";
import { Refresh } from "@/components/ui/Refresh";
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/services/inventory";
import { formatCurrency, formatDate } from "./Inventory.constants";
import {
  Search,
  Layers,
  ChevronDown,
  ChevronRight,
  Loader2,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

/**
 * Enhanced Stock Summary tab with groupBy support and value columns.
 * Accepts a `refreshKey` prop: increment it from the parent to trigger a reload.
 */
export default function InventoryStockTab({ refreshKey = 0 }) {
  const { toast } = useToast();
  const [stockSummary, setStockSummary] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [groupBy, setGroupBy] = useState("location");
  const [sorting, setSorting] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  const groupingOptions = [
    { id: "location", name: "Location" },
    { id: "location_tray", name: "Location + Tray" },
    { id: "category", name: "Category" },
    { id: "lens", name: "Lens Product" },
    { id: "none", name: "No Grouping" },
  ];

  // Grid view states
  const [showGridView, setShowGridView] = useState(false);
  const [dropdowns, setDropdowns] = useState({ lensProducts: [], categories: [] });
  const [selectedLensId, setSelectedLensId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [gridItems, setGridItems] = useState([]);
  const [isGridLoading, setIsGridLoading] = useState(false);
  const [selectedCellInfo, setSelectedCellInfo] = useState(null);

  useEffect(() => {
    if (!showGridView) {
      loadStockSummary();
    }
  }, [pageIndex, pageSize, refreshKey, groupBy, sorting, showGridView, searchQuery, localRefreshKey]);

  // Load dropdown options for Grid View
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const res = await inventoryService.getInventoryDropdowns();
        if (res.success && res.data) {
          setDropdowns({
            lensProducts: res.data.lensProducts || [],
            categories: res.data.categories || []
          });
        }
      } catch (err) {
        console.error("Failed to load dropdowns for grid view:", err);
      }
    };
    fetchDropdowns();
  }, []);

  // Load available items for grid when selection changes
  useEffect(() => {
    if (showGridView && selectedLensId) {
      loadGridItems();
    }
  }, [selectedLensId, selectedCategoryId, showGridView, refreshKey, localRefreshKey]);

  const loadGridItems = async () => {
    try {
      setIsGridLoading(true);
      const res = await inventoryService.getInventoryItems({
        lens_id: parseInt(selectedLensId),
        category_id: selectedCategoryId ? parseInt(selectedCategoryId) : undefined,
        status: "AVAILABLE",
        limit: 1000 // get all available
      });
      if (res.success && res.data) {
        setGridItems(res.data || []);
      }
    } catch (err) {
      console.error("Failed to load grid items:", err);
      toast({
        title: "Error",
        description: "Failed to load grid items",
        variant: "destructive"
      });
    } finally {
      setIsGridLoading(false);
    }
  };

  const loadStockSummary = async () => {
    try {
      setIsLoading(true);
      const response = await inventoryService.getInventoryStockGrouped({
        page: pageIndex + 1,
        limit: pageSize,
        groupBy: groupBy === "none" ? null : groupBy,
        search: searchQuery,
      });
      if (response.success) {
        setStockSummary(response.data || []);
        setTotalCount(response.pagination?.total || response.total || 0);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load stock summary",
        variant: "destructive",
      });
      setStockSummary([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGroupByChange = (e) => {
    setGroupBy(e.target.value);
    setPageIndex(0);
    setExpandedGroups({});
  };

  const groups = useMemo(() => {
    if (groupBy === "none") return [];
    const map = {};
    stockSummary.forEach((item) => {
      let groupKey, groupName;
      if (groupBy === "location") {
        groupKey = item.location_id || "unknown_location";
        groupName = item.location?.name || "Unknown Location";
      } else if (groupBy === "location_tray") {
        groupKey = `${item.location_id || "unknown_location"}_${item.tray_id || "unknown_tray"}`;
        groupName = `${item.location?.name || "Unknown Location"} - ${item.tray?.name || item.tray?.tray_name || "Unknown Tray"}`;
      } else if (groupBy === "category") {
        groupKey = item.category_id || "unknown_category";
        groupName = item.category?.name || "Unknown Category";
      } else if (groupBy === "lens") {
        groupKey = item.lens_id || "unknown_lens";
        groupName = item.lensProduct?.lens_name || item.lensProduct?.name || "Unknown Lens";
      } else {
        return;
      }

      if (!map[groupKey]) {
        map[groupKey] = {
          key: groupKey,
          name: groupName,
          items: [],
          totalStock: 0,
          availableStock: 0,
          reservedStock: 0,
          damagedStock: 0,
        };
      }
      map[groupKey].items.push(item);
      map[groupKey].totalStock += item.totalStock ?? 0;
      map[groupKey].availableStock += item.availableStock ?? 0;
      map[groupKey].reservedStock += item.reservedStock ?? 0;
      map[groupKey].damagedStock += item.damagedStock ?? 0;
    });
    return Object.values(map);
  }, [stockSummary, groupBy]);

  // Define columns for standard Table component
  const columns = [
    {
      accessorKey: "lensProduct",
      header: "Lens Product",
      cell: (item) => <span className="text-xs font-medium">{item.lensProduct?.lens_name || "-"}</span>,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: (item) => <span className="text-xs">{item.category?.name || "-"}</span>,
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: (item) => <span className="text-xs">{item.location?.name || "-"}</span>,
    },
    ...(groupBy !== "none"
      ? [
        {
          accessorKey: "tray",
          header: "Tray",
          cell: (item) => <span className="text-xs">{item.tray?.tray_name || item.tray?.name || "-"}</span>,
        },
      ]
      : []),
    {
      accessorKey: "totalStock",
      header: "Total Stock",
      cell: (item) => <span className="text-xs font-semibold">{item.totalStock ?? 0}</span>,
    },
    {
      accessorKey: "availableStock",
      header: "Available",
      cell: (item) => (
        <Badge className="bg-green-100 text-green-800 text-xs hover:bg-green-100">
          {item.availableStock ?? 0}
        </Badge>
      ),
    },
    {
      accessorKey: "reservedStock",
      header: "Reserved",
      cell: (item) => (
        <Badge className="bg-yellow-100 text-yellow-800 text-xs hover:bg-yellow-100">
          {item.reservedStock ?? 0}
        </Badge>
      ),
    },
    {
      accessorKey: "damagedStock",
      header: "Damaged",
      cell: (item) => (
        <Badge className="bg-red-100 text-red-800 text-xs hover:bg-red-100">
          {item.damagedStock ?? 0}
        </Badge>
      ),
    },
    {
      accessorKey: "avgCostPrice",
      header: "Avg Cost",
      cell: (item) => <span className="text-xs">{formatCurrency(item.avgCostPrice)}</span>,
    },
    {
      accessorKey: "lastCostPrice",
      header: "Last Cost",
      cell: (item) => <span className="text-xs">{formatCurrency(item.lastCostPrice)}</span>,
    },
    {
      accessorKey: "totalValue",
      header: "Total Value",
      cell: (item) => <span className="text-xs font-semibold text-green-700">{formatCurrency(item.totalValue)}</span>,
    },
    {
      accessorKey: "lastInwardDate",
      header: "Last Inward",
      cell: (item) => <span className="text-xs">{formatDate(item.lastInwardDate)}</span>,
    },
  ];

  const parseValue = (val) => {
    if (val === null || val === undefined || val === "" || val === "—") return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  };

  const generateRange = (min, max, step = 0.25) => {
    if (min === null || max === null || min > max) return [];
    const values = [];
    const start = Math.floor(min / step) * step;
    const end = Math.ceil(max / step) * step;
    for (let i = start; i <= end + 0.001; i += step) {
      values.push(parseFloat(i.toFixed(2)));
    }
    return values;
  };

  const categoryName = useMemo(() => {
    return dropdowns.categories.find(c => c.id === parseInt(selectedCategoryId))?.name || "";
  }, [dropdowns.categories, selectedCategoryId]);

  const useAdd = useMemo(() => {
    const lowerCat = categoryName.toLowerCase();
    return lowerCat.includes("prog") || lowerCat.includes("bifocal") || lowerCat.includes("bi-focal");
  }, [categoryName]);

  const gridData = useMemo(() => {
    if (gridItems.length === 0) return null;

    let minSph = Infinity, maxSph = -Infinity;
    let minCol = Infinity, maxCol = -Infinity;

    // Parse all items
    const parsedItems = gridItems.map(item => {
      const sphVal = parseValue(item.rightSpherical || item.leftSpherical || "0");
      const cylVal = parseValue(item.rightCylindrical || item.leftCylindrical || "0");
      const addVal = parseValue(item.rightAdd || item.leftAdd);

      const sph = sphVal !== null ? sphVal : 0;
      const colVal = (useAdd && addVal !== null) ? addVal : (cylVal !== null ? cylVal : 0);

      if (sph < minSph) minSph = sph;
      if (sph > maxSph) maxSph = sph;
      if (colVal < minCol) minCol = colVal;
      if (colVal > maxCol) maxCol = colVal;

      return {
        id: item.id,
        sph,
        colVal,
        qty: item.quantity || 0,
        tray: item.tray?.name || item.tray?.tray_name || "No Tray",
        location: item.location?.name || "No Location"
      };
    });

    if (minSph === Infinity) {
      return { sphValues: [], colValues: [], cells: {}, colLabel: useAdd ? "ADD" : "CYL" };
    }

    const sphValues = generateRange(minSph, maxSph);
    const colValues = generateRange(minCol, maxCol);
    const colLabel = useAdd ? "ADD" : "CYL";

    // Populate cell counts and details
    const cells = {};
    parsedItems.forEach(item => {
      const key = `${item.sph.toFixed(2)}_${item.colVal.toFixed(2)}`;
      if (!cells[key]) {
        cells[key] = { qty: 0, items: [] };
      }
      cells[key].qty += item.qty;
      cells[key].items.push(item);
    });

    return {
      sphValues,
      colValues,
      cells,
      colLabel
    };
  }, [gridItems, useAdd]);

  const renderGridView = () => {
    return (
      <div className="flex flex-col gap-3 flex-1 min-h-0">
        <Card className="p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="gridLens" className="text-xs font-semibold text-muted-foreground block mb-1">
                Lens Product *
              </label>
              <select
                id="gridLens"
                value={selectedLensId}
                onChange={(e) => {
                  setSelectedLensId(e.target.value);
                  setSelectedCellInfo(null);
                }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Select Lens Product...</option>
                {dropdowns.lensProducts.map(lp => (
                  <option key={lp.id} value={lp.id}>{lp.lens_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="gridCategory" className="text-xs font-semibold text-muted-foreground block mb-1">
                Lens Category (Optional)
              </label>
              <select
                id="gridCategory"
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setSelectedCellInfo(null);
                }}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Categories</option>
                {dropdowns.categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {isGridLoading ? (
          <div className="flex items-center justify-center p-12 flex-1">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-muted-foreground">Loading stock grid...</p>
            </div>
          </div>
        ) : !selectedLensId ? (
          <Card className="p-8 flex items-center justify-center flex-1 text-muted-foreground text-xs">
            Select a Lens Product to display the stock grid matrix.
          </Card>
        ) : !gridData || gridData.sphValues.length === 0 ? (
          <Card className="p-8 flex items-center justify-center flex-1 text-muted-foreground text-xs">
            No available stock found matching the selected filters.
          </Card>
        ) : (
          <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0">
            {/* Grid Container */}
            <Card className="p-3 flex-1 overflow-auto max-h-[500px]">
              <div className="border rounded-lg overflow-auto max-w-full">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="p-2 border-r text-center font-bold text-primary bg-muted/70 sticky left-0 z-10">
                        SPH \ {gridData.colLabel}
                      </th>
                      {gridData.colValues.map(col => (
                        <th key={col} className="p-2 border-r text-center font-semibold min-w-[50px]">
                          {col > 0 ? `+${col.toFixed(2)}` : col.toFixed(2)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {gridData.sphValues.map(sph => (
                      <tr key={sph} className="hover:bg-muted/10 border-b">
                        <td className="p-2 border-r text-center font-bold bg-muted/45 sticky left-0 z-10">
                          {sph > 0 ? `+${sph.toFixed(2)}` : sph.toFixed(2)}
                        </td>
                        {gridData.colValues.map(col => {
                          const key = `${sph.toFixed(2)}_${col.toFixed(2)}`;
                          const cell = gridData.cells[key];
                          const hasQty = cell && cell.qty > 0;
                          const isSelected = selectedCellInfo && selectedCellInfo.sph === sph && selectedCellInfo.colVal === col;

                          return (
                            <td
                              key={col}
                              onClick={() => {
                                if (hasQty) {
                                  setSelectedCellInfo({ sph, colVal: col, items: cell.items, qty: cell.qty });
                                }
                              }}
                              className={`p-2 border-r text-center transition-all cursor-pointer ${isSelected ? "bg-primary/20 ring-1 ring-primary" :
                                  hasQty ? "bg-green-50 text-green-700 font-semibold hover:bg-green-100" :
                                    "text-muted-foreground/30 hover:bg-muted/5"
                                }`}
                            >
                              {hasQty ? cell.qty : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Cell Detail Card */}
            {selectedCellInfo && (
              <Card className="p-3 w-full lg:w-[320px] shrink-0 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-semibold text-sm text-primary">
                    Prescription Details
                  </h4>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    Total: {selectedCellInfo.qty}
                  </Badge>
                </div>
                <div className="text-xs space-y-1 py-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SPH:</span>
                    <span className="font-semibold">{selectedCellInfo.sph > 0 ? `+${selectedCellInfo.sph.toFixed(2)}` : selectedCellInfo.sph.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{gridData.colLabel}:</span>
                    <span className="font-semibold">{selectedCellInfo.colVal > 0 ? `+${selectedCellInfo.colVal.toFixed(2)}` : selectedCellInfo.colVal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t pt-2 flex-1 overflow-y-auto max-h-[300px]">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Location & Tray Breakdowns:</p>
                  <div className="space-y-2">
                    {(() => {
                      // Aggregate by Location + Tray
                      const breakdowns = {};
                      selectedCellInfo.items.forEach(item => {
                        const key = `${item.location} - ${item.tray}`;
                        breakdowns[key] = (breakdowns[key] || 0) + item.qty;
                      });

                      return Object.entries(breakdowns).map(([locTray, qty]) => (
                        <div key={locTray} className="flex items-center justify-between text-xs p-2 bg-muted/40 rounded border">
                          <span className="font-medium text-gray-700">{locTray}</span>
                          <span className="font-bold text-primary">{qty} pcs</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderPagination = () => {
    if (totalCount === 0) return null;
    const totalPages = Math.ceil(totalCount / pageSize);
    const currentPage = pageIndex + 1;
    const startIndex = pageIndex * pageSize + 1;
    const endIndex = Math.min((pageIndex + 1) * pageSize, totalCount);

    return (
      <div className="flex items-center justify-between px-2 py-3 bg-background border rounded-lg flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Showing {startIndex} to {endIndex} of {totalCount} results
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page:</span>
            <select
              value={pageSize.toString()}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPageIndex(0);
              }}
              className="h-8 px-2 py-1 border border-gray-300 rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPageIndex(0)}
                disabled={pageIndex === 0}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPageIndex(pageIndex - 1)}
                disabled={pageIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPageIndex(pageIndex + 1)}
                disabled={pageIndex >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPageIndex(totalPages - 1)}
                disabled={pageIndex >= totalPages - 1}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Search and Grouping Card */}
      <Card className="p-2 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {!showGridView && (
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search stock by product, code, category, or location..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPageIndex(0);
                  setExpandedGroups({});
                }}
                className="pl-8 h-8 text-xs"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            {!showGridView && (
              <>
                <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                  Group by:
                </span>
                <div className="w-40 mr-2">
                  <FormSelect
                    name="groupBy"
                    options={groupingOptions}
                    value={groupBy}
                    onChange={(value) => {
                      setGroupBy(value || "none");
                      setPageIndex(0);
                      setExpandedGroups({});
                    }}
                    placeholder="None"
                    isSearchable={false}
                    isClearable={false}
                  />
                </div>
              </>
            )}
            <Button
              type="button"
              variant={showGridView ? "default" : "outline"}
              size="xs"
              className="h-8 gap-1.5"
              onClick={() => {
                setShowGridView(!showGridView);
                setSelectedCellInfo(null);
              }}
            >
              {showGridView ? "List View" : "Grid View"}
            </Button>
            <Refresh onClick={() => {
              setLocalRefreshKey(prev => prev + 1);
              setPageIndex(0);
            }} />
          </div>
        </div>
      </Card>

      {/* Data Display */}
      {showGridView ? (
        renderGridView()
      ) : groupBy !== "none" ? (
        isLoading ? (
          <Card className="p-8 text-center flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading stock summary...</p>
            </div>
          </Card>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pr-1">
              {groups.map((group) => {
                const isExpanded = expandedGroups[group.key];
                return (
                  <Card key={group.key} className="overflow-hidden">
                    <div
                      className="p-3 cursor-pointer hover:bg-accent/50 transition-colors flex items-center justify-between"
                      onClick={() =>
                        setExpandedGroups((prev) => ({
                          ...prev,
                          [group.key]: !prev[group.key],
                        }))
                      }
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-primary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-primary" />
                        )}
                        <Layers className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm">
                          {group.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 text-xs">
                          Items: {group.items.length}
                        </Badge>
                        <Badge className="bg-green-100 text-green-800 text-xs hover:bg-green-100">
                          Total: {group.totalStock}
                        </Badge>
                        <Badge className="bg-blue-100 text-blue-800 text-xs hover:bg-blue-100">
                          Available: {group.availableStock}
                        </Badge>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t">
                        <Table
                          columns={columns}
                          data={group.items}
                          pagination={false}
                          emptyMessage="No stock items in this group"
                        />
                      </div>
                    )}
                  </Card>
                );
              })}
              {groups.length === 0 && (
                <Card className="p-8 text-center text-muted-foreground text-xs flex-1 flex items-center justify-center">
                  No stock data found matching the selected filters.
                </Card>
              )}
            </div>
            {renderPagination()}
          </div>
        )
      ) : (
        <Card className="flex-1 min-h-0">
          <Table
            columns={columns}
            data={stockSummary}
            totalCount={totalCount}
            pageIndex={pageIndex}
            pageSize={pageSize}
            onPageChange={setPageIndex}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPageIndex(0);
            }}
            setSorting={setSorting}
            sorting={sorting}
            loading={isLoading}
            emptyMessage="No stock data found"
          />
        </Card>
      )}
    </div>
  );
}
