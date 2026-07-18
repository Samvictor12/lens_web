import { useState, useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import {
  RefreshCw,
  Search,
  Filter,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  ChevronRight,
  Layers,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { inventoryService } from "@/services/inventory";
import { getLocationDropdown } from "@/services/location";
import { formatCurrency } from "./Inventory.constants";
import { formatItemPowerRange } from "./useInventoryColumns";

export default function InventoryStockTab({ refreshKey = 0, godownType = "STOCK" }) {
  const { toast } = useToast();
  
  // View mode
  const [viewMode, setViewMode] = useState("pivot"); // "pivot" | "list"
  const [groupBy, setGroupBy] = useState("location"); // "location" | "location_tray" | "category" | "lens" | "none"

  // Data states
  const [pivotData, setPivotData] = useState({ products: [], locations: [] });
  const [stockSummary, setStockSummary] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  // Pagination states for List view
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLensId, setSelectedLensId] = useState("");
  const [selectedCoatingId, setSelectedCoatingId] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [sphFilter, setSphFilter] = useState("");
  const [cylFilter, setCylFilter] = useState("");
  const [addFilter, setAddFilter] = useState("");

  // Dropdowns
  const [dropdowns, setDropdowns] = useState({
    lensProducts: [],
    coatings: [],
    locations: [],
  });

  // Load dropdown options (locations scoped to godown)
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [invRes, locRes] = await Promise.all([
          inventoryService.getInventoryDropdowns(
            godownType ? { godownType } : {}
          ),
          getLocationDropdown({ godownType }),
        ]);
        setDropdowns({
          lensProducts: invRes.success ? invRes.data?.lensProducts || [] : [],
          coatings: invRes.success ? invRes.data?.coatings || [] : [],
          locations: locRes.success ? locRes.data || [] : [],
        });
        setSelectedLocationId("");
      } catch (err) {
        console.error("Failed to load dropdowns:", err);
      }
    };
    fetchDropdowns();
  }, [godownType]);

  // Fetch pivot stock summary
  const loadPivotStock = async () => {
    try {
      setIsLoading(true);
      const params = { godownType };
      if (searchQuery) params.search = searchQuery;
      if (selectedLensId) params.lens_id = selectedLensId;
      if (selectedCoatingId) params.coating_id = selectedCoatingId;
      if (selectedLocationId) params.location_id = selectedLocationId;
      if (sphFilter) params.sph = sphFilter;
      if (cylFilter) params.cyl = cylFilter;
      if (addFilter) params.add = addFilter;

      const response = await inventoryService.getInventoryStockPivot(params);
      if (response.success) {
        setPivotData(response.data || { products: [], locations: [] });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load stock pivot summary",
        variant: "destructive",
      });
      setPivotData({ products: [], locations: [] });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch list stock summary (expandable list)
  const loadListStock = async () => {
    try {
      setIsLoading(true);
      const params = {
        page: pageIndex + 1,
        limit: pageSize,
        groupBy: groupBy === "none" ? null : groupBy,
        godownType,
      };
      if (searchQuery) params.search = searchQuery;
      if (selectedLensId) params.lens_id = selectedLensId;
      if (selectedCoatingId) params.coating_id = selectedCoatingId;
      if (selectedLocationId) params.location_id = selectedLocationId;
      if (sphFilter) params.sph = sphFilter;
      if (cylFilter) params.cyl = cylFilter;
      if (addFilter) params.add = addFilter;

      const response = await inventoryService.getInventoryStockGrouped(params);
      if (response.success) {
        setStockSummary(response.data || []);
        setTotalCount(response.pagination?.total || response.total || 0);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load stock list summary",
        variant: "destructive",
      });
      setStockSummary([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger loads
  useEffect(() => {
    if (viewMode === "pivot") {
      loadPivotStock();
    } else {
      loadListStock();
    }
  }, [
    viewMode,
    groupBy,
    pageIndex,
    pageSize,
    searchQuery,
    selectedLensId,
    selectedCoatingId,
    selectedLocationId,
    sphFilter,
    cylFilter,
    addFilter,
    refreshKey,
    localRefreshKey,
    godownType,
  ]);

  // Reset pageIndex on filter changes
  useEffect(() => {
    setPageIndex(0);
    setExpandedGroups({});
  }, [
    viewMode,
    groupBy,
    searchQuery,
    selectedLensId,
    selectedCoatingId,
    selectedLocationId,
    sphFilter,
    cylFilter,
    addFilter,
    godownType,
  ]);

  // Helpers
  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : d;

  const handleExportExcel = () => {
    const row1 = ["", "", "", "", ""];
    const row2 = ["Product Name", "Coating", "SPH", "CYL", "ADD"];

    pivotData.locations.forEach((loc) => {
      loc.trays.forEach((tray) => {
        row1.push(loc.name);
        row2.push(`${tray.name} (Cap: ${tray.capacity})`);
      });
    });
    row1.push("Total Qty");
    row2.push("Total Qty");

    const rows = [
      row1.join(","),
      row2.join(","),
    ];

    pivotData.products.forEach((prod) => {
      const row = [
        `"${prod.lensProduct?.lens_name || ""}"`,
        `"${prod.coating?.name || ""}"`,
        prod.sph,
        prod.cyl,
        prod.add,
      ];
      pivotData.locations.forEach((loc) => {
        loc.trays.forEach((tray) => {
          row.push(prod.trays[tray.id] || 0);
        });
      });
      row.push(prod.totalQty);
      rows.push(row.join(","));
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_summary_pivot_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const title = "Stock Summary Pivot Report";
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    let locHeadersHTML = `<th colspan="5" class="border-r">Product Details</th>`;
    let trayHeadersHTML = `
      <th class="border-r">Product Name</th>
      <th class="border-r">Coating</th>
      <th class="border-r text-center">SPH</th>
      <th class="border-r text-center">CYL</th>
      <th class="border-r text-center">ADD</th>
    `;
    pivotData.locations.forEach((loc) => {
      locHeadersHTML += `<th colspan="${loc.trays.length}" class="border-r text-center">${loc.name}</th>`;
      loc.trays.forEach((tray) => {
        trayHeadersHTML += `<th class="border-r text-center">${tray.name}<br/><span style="font-size: 8px; color: #64748b;">Cap: ${tray.capacity}</span></th>`;
      });
    });
    locHeadersHTML += `<th rowspan="2" class="text-center bg-slate-100">Total Qty</th>`;

    let rowsHTML = "";
    pivotData.products.forEach((prod) => {
      let cellsHTML = `
        <td>${prod.lensProduct?.lens_name || "—"}</td>
        <td>${prod.coating?.name || "—"}</td>
        <td class="text-center">${prod.sph}</td>
        <td class="text-center">${prod.cyl}</td>
        <td class="text-center">${prod.add}</td>
      `;
      pivotData.locations.forEach((loc) => {
        loc.trays.forEach((tray) => {
          const qty = prod.trays[tray.id] || 0;
          cellsHTML += `<td class="text-center ${qty > 0 ? "has-qty" : "no-qty"}">${qty > 0 ? qty : "—"}</td>`;
        });
      });
      cellsHTML += `<td class="text-center font-bold bg-slate-50">${prod.totalQty}</td>`;
      rowsHTML += `<tr>${cellsHTML}</tr>`;
    });

    const htmlContent = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            @page { size: landscape; margin: 10mm; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 10px; color: #333; font-size: 10px; }
            h1 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; margin-bottom: 10px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 4px; text-align: left; }
            th { background-color: #f1f5f9; color: #1e293b; font-weight: 600; font-size: 9px; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            .bg-slate-50 { background-color: #f8fafc; }
            .bg-slate-100 { background-color: #f1f5f9; }
            .border-r { border-right: 1.5px solid #94a3b8; }
            .has-qty { background-color: #f0fdf4; color: #15803d; font-weight: 600; }
            .no-qty { color: #cbd5e1; }
            .footer { margin-top: 20px; font-size: 8px; color: #64748b; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 5px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p style="margin-bottom: 8px;">Generated on: ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr class="bg-slate-100">${locHeadersHTML}</tr>
              <tr class="bg-slate-50">${trayHeadersHTML}</tr>
            </thead>
            <tbody>
              ${rowsHTML}
            </tbody>
          </table>
          <div class="footer">
            Lens Management System &copy; ${new Date().getFullYear()} - Confidential Report
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedLensId("");
    setSelectedCoatingId("");
    setSelectedLocationId("");
    setSphFilter("");
    setCylFilter("");
    setAddFilter("");
  };

  // Group items by selected groupBy option for list view
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

  // List View Columns
  const listColumns = [
    {
      accessorKey: "lensProduct",
      header: "Lens Product",
      cell: (item) => {
        const powerRange = formatItemPowerRange(item);
        return (
          <div className="flex flex-col gap-0.5 leading-tight">
            <span className="text-xs font-medium">
              {item.lensProduct?.lens_name || "-"}
            </span>
            {powerRange ? (
              <span className="text-[11px] text-muted-foreground font-mono">
                {powerRange}
              </span>
            ) : null}
          </div>
        );
      },
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
            cell: (item) => <span className="text-xs">{item.tray?.name || item.tray?.tray_name || "-"}</span>,
          },
        ]
      : []),
    {
      accessorKey: "totalStock",
      header: "Total Stock",
      cell: (item) => <span className="text-xs font-semibold">{item.totalStock ?? item.quantity ?? 1}</span>,
    },
    {
      accessorKey: "availableStock",
      header: "Available",
      cell: (item) => (
        <Badge className="bg-green-100 text-green-800 text-xs hover:bg-green-100">
          {item.availableStock ?? (item.status === "AVAILABLE" ? item.quantity : 0)}
        </Badge>
      ),
    },
    {
      accessorKey: "reservedStock",
      header: "Reserved",
      cell: (item) => (
        <Badge className="bg-yellow-100 text-yellow-800 text-xs hover:bg-yellow-100">
          {item.reservedStock ?? (item.status === "RESERVED" ? item.quantity : 0)}
        </Badge>
      ),
    },
    {
      accessorKey: "damagedStock",
      header: "Damaged",
      cell: (item) => (
        <Badge className="bg-red-100 text-red-800 text-xs hover:bg-red-100">
          {item.damagedStock ?? (item.status === "DAMAGED" ? item.quantity : 0)}
        </Badge>
      ),
    },
    {
      accessorKey: "avgCostPrice",
      header: "Avg Cost",
      cell: (item) => <span className="text-xs">{formatCurrency(item.avgCostPrice ?? item.costPrice ?? 0)}</span>,
    },
    {
      accessorKey: "lastCostPrice",
      header: "Last Cost",
      cell: (item) => <span className="text-xs">{formatCurrency(item.lastCostPrice ?? item.costPrice ?? 0)}</span>,
    },
    {
      accessorKey: "totalValue",
      header: "Total Value",
      cell: (item) => (
        <span className="text-xs font-semibold text-green-700">
          {formatCurrency(item.totalValue ?? (item.quantity * item.costPrice) ?? 0)}
        </span>
      ),
    },
    {
      accessorKey: "lastInwardDate",
      header: "Last Inward",
      cell: (item) => <span className="text-xs">{fmtDate(item.lastInwardDate ?? item.inwardDate ?? item.createdAt)}</span>,
    },
  ];

  const totalPages = Math.ceil(totalCount / pageSize);

  const renderPagination = () => {
    if (totalCount === 0) return null;
    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 border-t mt-auto flex-shrink-0 bg-white px-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Showing {pageIndex * pageSize + 1} to{" "}
            {Math.min((pageIndex + 1) * pageSize, totalCount)} of {totalCount} records
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPageIndex(0);
              }}
              className="h-8 w-16 px-1 border rounded bg-white text-xs"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">
              Page {pageIndex + 1} of {totalPages || 1}
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
      {/* ── Filters & Controls ────────────────────────────────────────── */}
      <Card className="p-3 flex-shrink-0">
        <div className="space-y-3">
          {/* Row 1: Search & Actions */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by product, code, location or tray..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
              {/* Group By selector (List view only) */}
              {viewMode === "list" && (
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="text-[10px] font-semibold text-muted-foreground block whitespace-nowrap">
                    GROUP BY
                  </span>
                  <select
                    value={groupBy}
                    onChange={(e) => {
                      setGroupBy(e.target.value);
                      setPageIndex(0);
                      setExpandedGroups({});
                    }}
                    className="h-8 px-2 border rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary min-w-[120px]"
                  >
                    <option value="location">Location</option>
                    <option value="location_tray">Location + Tray</option>
                    <option value="category">Category</option>
                    <option value="lens">Lens Product</option>
                    <option value="none">No Grouping</option>
                  </select>
                </div>
              )}

              {/* View Mode Toggle */}
              <div className="flex border rounded-md overflow-hidden h-8 bg-slate-50 mr-2">
                <Button
                  variant={viewMode === "pivot" ? "default" : "ghost"}
                  size="xs"
                  className="h-full rounded-none px-3 text-xs"
                  onClick={() => setViewMode("pivot")}
                >
                  Pivot Grid
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="xs"
                  className="h-full rounded-none px-3 text-xs border-l"
                  onClick={() => setViewMode("list")}
                >
                  Expandable List
                </Button>
              </div>

              <Button
                variant="outline"
                size="xs"
                className="h-8 text-xs gap-1.5"
                onClick={handleResetFilters}
              >
                <Filter className="h-3 w-3" />
                Reset Filters
              </Button>
              <Button
                variant="outline"
                size="xs"
                className="h-8 text-xs gap-1.5"
                onClick={() => setLocalRefreshKey((prev) => prev + 1)}
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                Reload
              </Button>
              
              {viewMode === "pivot" && (
                <>
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-8 text-xs gap-1.5"
                    disabled={pivotData.products.length === 0}
                    onClick={handleExportExcel}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
                    Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-8 text-xs gap-1.5"
                    disabled={pivotData.products.length === 0}
                    onClick={handleExportPDF}
                  >
                    <FileText className="h-3.5 w-3.5 text-red-500" />
                    PDF
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Row 2: Advanced Attributes Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            <div>
              <label htmlFor="filterLens" className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                Product Name
              </label>
              <select
                id="filterLens"
                value={selectedLensId}
                onChange={(e) => setSelectedLensId(e.target.value)}
                className="w-full h-8 px-2 border rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Products</option>
                {dropdowns.lensProducts.map((p) => (
                  <option key={p.id} value={p.id}>{p.lens_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filterCoating" className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                Coating
              </label>
              <select
                id="filterCoating"
                value={selectedCoatingId}
                onChange={(e) => setSelectedCoatingId(e.target.value)}
                className="w-full h-8 px-2 border rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Coatings</option>
                {dropdowns.coatings.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filterLocation" className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                Location
              </label>
              <select
                id="filterLocation"
                value={selectedLocationId}
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full h-8 px-2 border rounded-md text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Locations</option>
                {dropdowns.locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="filterSph" className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                Spherical (SPH)
              </label>
              <Input
                id="filterSph"
                placeholder="e.g. -2.00"
                value={sphFilter}
                onChange={(e) => setSphFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label htmlFor="filterCyl" className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                Cylindrical (CYL)
              </label>
              <Input
                id="filterCyl"
                placeholder="e.g. +1.25"
                value={cylFilter}
                onChange={(e) => setCylFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label htmlFor="filterAdd" className="text-[10px] font-semibold text-muted-foreground block mb-0.5">
                Add Value (ADD)
              </label>
              <Input
                id="filterAdd"
                placeholder="e.g. +2.00"
                value={addFilter}
                onChange={(e) => setAddFilter(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* ── Pivot Grid Representation ───────────────────────────────── */}
      {viewMode === "pivot" ? (
        isLoading ? (
          <Card className="p-12 text-center flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading stock summary pivot...</p>
            </div>
          </Card>
        ) : pivotData.products.length === 0 ? (
          <Card className="p-12 flex items-center justify-center flex-1 text-muted-foreground text-xs bg-white">
            No stock items found matching the selected filters.
          </Card>
        ) : (
          <Card className="flex-1 overflow-auto max-h-[580px] bg-white">
            <div className="border rounded-lg overflow-auto max-w-full">
              <table className="w-full border-collapse text-xs table-layout-fixed">
                <thead>
                  {/* Row 1: Location Headers */}
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b text-[11px]">
                    <th colSpan={5} className="p-2.5 border-r text-left bg-slate-100 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      Product Details
                    </th>
                    {pivotData.locations.map((loc) => (
                      <th key={loc.id} colSpan={loc.trays.length} className="p-2 border-r text-center bg-slate-100">
                        {loc.name}
                      </th>
                    ))}
                    <th className="p-2 text-center bg-slate-200 sticky right-0 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]" rowSpan={2}>
                      Total Qty
                    </th>
                  </tr>
                  {/* Row 2: Tray Headers */}
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b text-[10px]">
                    <th className="p-2 border-r text-left min-w-[160px] bg-slate-50 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Product Name</th>
                    <th className="p-2 border-r text-left min-w-[80px] bg-slate-50">Coating</th>
                    <th className="p-2 border-r text-center min-w-[50px] bg-slate-50">SPH</th>
                    <th className="p-2 border-r text-center min-w-[50px] bg-slate-50">CYL</th>
                    <th className="p-2 border-r text-center min-w-[50px] bg-slate-50">ADD</th>
                    {pivotData.locations.map((loc) =>
                      loc.trays.map((tray) => (
                        <th key={tray.id} className="p-2 border-r text-center font-normal min-w-[80px]">
                          <div>{tray.name}</div>
                          <div className="text-[9px] text-slate-400 font-mono">Cap: {tray.capacity}</div>
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pivotData.products.map((prod) => (
                    <tr key={prod.key} className="hover:bg-slate-50/70 border-b text-xs transition-colors">
                      {/* Row Product Attributes */}
                      <td className="p-2 border-r font-medium bg-white sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate max-w-[200px]" title={prod.lensProduct?.lens_name}>
                        {prod.lensProduct?.lens_name || "—"}
                      </td>
                      <td className="p-2 border-r truncate max-w-[100px]">{prod.coating?.name || "—"}</td>
                      <td className="p-2 border-r text-center font-mono">{prod.sph}</td>
                      <td className="p-2 border-r text-center font-mono">{prod.cyl}</td>
                      <td className="p-2 border-r text-center font-mono">{prod.add}</td>
                      
                      {/* Tray Stock Quantity Cells */}
                      {pivotData.locations.map((loc) =>
                        loc.trays.map((tray) => {
                          const qty = prod.trays[tray.id] || 0;
                          return (
                            <td
                              key={tray.id}
                              className={`p-2 border-r text-center font-mono ${
                                qty > 0
                                  ? "bg-green-50/50 text-green-700 font-semibold"
                                  : "text-slate-300"
                              }`}
                            >
                              {qty > 0 ? qty : "—"}
                            </td>
                          );
                        })
                      )}
                      
                      {/* Total Cell */}
                      <td className="p-2 text-center font-bold font-mono bg-slate-50 text-slate-800 sticky right-0 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        {prod.totalQty}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : (
        /* ── Expandable List Representation ──────────────────────────── */
        groupBy !== "none" ? (
          isLoading ? (
            <Card className="p-8 text-center flex-1 flex items-center justify-center bg-white">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs text-muted-foreground">Loading stock summary list...</p>
              </div>
            </Card>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto pr-1">
                {groups.map((group) => {
                  const isExpanded = expandedGroups[group.key];
                  return (
                    <Card key={group.key} className="overflow-hidden bg-white">
                      <div
                        className="p-3 cursor-pointer hover:bg-slate-50/50 transition-colors flex items-center justify-between"
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
                        <div className="border-t bg-white">
                          <Table
                            columns={listColumns}
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
                  <Card className="p-8 text-center text-muted-foreground text-xs flex-1 flex items-center justify-center bg-white">
                    No stock data found matching the selected filters.
                  </Card>
                )}
              </div>
              {renderPagination()}
            </div>
          )
        ) : (
          <Card className="flex-1 min-h-0 bg-white">
            <Table
              columns={listColumns}
              data={stockSummary}
              totalCount={totalCount}
              pageIndex={pageIndex}
              pageSize={pageSize}
              onPageChange={setPageIndex}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setPageIndex(0);
              }}
              loading={isLoading}
              emptyMessage="No stock data found"
            />
          </Card>
        )
      )}
    </div>
  );
}
