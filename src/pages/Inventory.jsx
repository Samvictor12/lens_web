import { Plus, Search, AlertTriangle, Package, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ViewToggle } from "@/components/ui/view-toggle";
import { CardGrid } from "@/components/ui/card-grid";
import { dummyLensVariants, dummyLensTypes } from "@/lib/dummyData";
import { useState, useMemo, useEffect } from "react";
import { Separator } from "@/components/ui/separator";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState(() => {
    return localStorage.getItem("inventoryView") || "table";
  });

  useEffect(() => {
    localStorage.setItem("inventoryView", view);
  }, [view]);

  const inventory = dummyLensVariants.map((variant) => ({
    ...variant,
    lensType: dummyLensTypes.find((lt) => lt.id === variant.lensTypeId),
  }));

  // Filter inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter(
      (item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.lensType?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inventory, searchQuery]);

  // Sort inventory
  const sortedInventory = useMemo(() => {
    if (!sortConfig.column) return filteredInventory;

    return [...filteredInventory].sort((a, b) => {
      let aValue = a[sortConfig.column];
      let bValue = b[sortConfig.column];

      // Handle nested lens type name
      if (sortConfig.column === "lensTypeName") {
        aValue = a.lensType?.name || "";
        bValue = b.lensType?.name || "";
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredInventory, sortConfig]);

  // Paginate inventory
  const paginatedInventory = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedInventory.slice(startIndex, startIndex + pageSize);
  }, [sortedInventory, currentPage, pageSize]);

  // Define columns
  const columns = [
    {
      accessorKey: "sku",
      header: "SKU",
      sortable: true,
      cell: ({ value }) => <span className="font-mono text-sm">{value}</span>,
    },
    {
      accessorKey: "lensTypeName",
      header: "Lens Type",
      sortable: true,
      cell: ({ row }) => <span>{row.lensType?.name}</span>,
    },
    {
      accessorKey: "name",
      header: "Variant",
      sortable: true,
    },
    {
      accessorKey: "stockQuantity",
      header: "Stock",
      align: "right",
      sortable: true,
      cell: ({ value }) => <span className="font-semibold">{value}</span>,
    },
    {
      accessorKey: "reorderLevel",
      header: "Reorder Level",
      align: "right",
      sortable: true,
      cell: ({ value }) => <span className="text-muted-foreground">{value}</span>,
    },
    {
      accessorKey: "costPrice",
      header: "Cost Price",
      align: "right",
      sortable: true,
      cell: ({ value }) => `₹${value.toLocaleString("en-IN")}`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const isLowStock = row.stockQuantity <= row.reorderLevel;
        return isLowStock ? (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-1">
            <AlertTriangle className="h-3 w-3" />
            Low Stock
          </Badge>
        ) : (
          <Badge className="bg-success/10 text-success border-success/20" variant="outline">
            In Stock
          </Badge>
        );
      },
    },
  ];

  // Render card for each inventory item
  const renderInventoryCard = (item) => {
    const isLowStock = item.stockQuantity <= item.reorderLevel;
    
    return (
      <Card key={item.id} className="hover:shadow-md transition-all duration-200">
        <CardHeader className="pb-2 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm sm:text-base truncate">
                {item.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {item.lensType?.name}
              </p>
            </div>
            {isLowStock ? (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 gap-0.5 flex-shrink-0 text-xs px-1.5 py-0">
                <AlertTriangle className="h-2.5 w-2.5" />
                <span className="hidden sm:inline">Low</span>
              </Badge>
            ) : (
              <Badge className="bg-success/10 text-success border-success/20 flex-shrink-0 text-xs px-1.5 py-0" variant="outline">
                <span className="hidden sm:inline">Stock</span>
                <span className="sm:hidden">✓</span>
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-3 pt-0">
          <div className="flex items-center gap-1.5 text-xs">
            <Tag className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="font-mono truncate">{item.sku}</span>
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Stock</p>
              <p className="text-base font-semibold">{item.stockQuantity}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Reorder</p>
              <p className="text-base font-semibold">{item.reorderLevel}</p>
            </div>
          </div>
          <div className="pt-1.5 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Cost</span>
              <span className="font-semibold">₹{item.costPrice.toLocaleString("en-IN")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Inventory Management</h1>
          <p className="text-xs text-muted-foreground">
            Track and manage stock levels
          </p>
        </div>
        <Button size="sm" className="gap-1.5 w-full sm:w-auto">
          <Plus className="h-3.5 w-3.5" />
          <span className="text-sm">Add Stock</span>
        </Button>
      </div>

      {/* Search and View Toggle */}
      <Card className="p-2 sm:p-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </Card>

      {/* Data Display */}
      {view === "table" ? (
        <Card>
          <DataTable
            columns={columns}
            data={paginatedInventory}
            totalCount={sortedInventory.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            onSortChange={setSortConfig}
            isLoading={isLoading}
            emptyMessage="No inventory items found"
          />
        </Card>
      ) : (
        <>
          <CardGrid
            data={paginatedInventory}
            renderCard={renderInventoryCard}
            isLoading={isLoading}
            emptyMessage="No inventory items found"
          />
          
          {/* Pagination for card view */}
          {sortedInventory.length > 0 && (
            <Card className="p-2 sm:p-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, sortedInventory.length)} of {sortedInventory.length}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Prev
                  </Button>
                  <span className="text-xs px-2">
                    {currentPage}/{Math.ceil(sortedInventory.length / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(sortedInventory.length / pageSize), p + 1))}
                    disabled={currentPage === Math.ceil(sortedInventory.length / pageSize)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}



