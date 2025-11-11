import { Plus, Search, Upload, Calendar, Building, Package, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ViewToggle } from "@/components/ui/view-toggle";
import { CardGrid } from "@/components/ui/card-grid";
import { dummyPurchaseOrders, dummyVendors } from "@/lib/dummyData";
import { useState, useMemo, useEffect } from "react";
import { Separator } from "@/components/ui/separator";

export default function PurchaseOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState(() => {
    return localStorage.getItem("purchaseOrdersView") || "table";
  });

  useEffect(() => {
    localStorage.setItem("purchaseOrdersView", view);
  }, [view]);

  const pos = dummyPurchaseOrders.map((po) => ({
    ...po,
    vendor: dummyVendors.find((v) => v.id === po.vendorId),
  }));

  const statusColors = {
    pending: "bg-warning/10 text-warning border-warning/20",
    ordered: "bg-primary/10 text-primary border-primary/20",
    received: "bg-success",
  };

  // Filter POs
  const filteredPOs = useMemo(() => {
    return pos.filter(
      (po) =>
        po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        po.vendor?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pos, searchQuery]);

  // Sort POs
  const sortedPOs = useMemo(() => {
    if (!sortConfig.column) return filteredPOs;

    return [...filteredPOs].sort((a, b) => {
      let aValue = a[sortConfig.column];
      let bValue = b[sortConfig.column];

      // Handle nested vendor name
      if (sortConfig.column === "vendorName") {
        aValue = a.vendor?.name || "";
        bValue = b.vendor?.name || "";
      }

      // Handle date sorting
      if (sortConfig.column === "createdAt") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredPOs, sortConfig]);

  // Paginate POs
  const paginatedPOs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedPOs.slice(startIndex, startIndex + pageSize);
  }, [sortedPOs, currentPage, pageSize]);

  // Define columns
  const columns = [
    {
      accessorKey: "poNumber",
      header: "PO Number",
      sortable: true,
      cell: ({ value }) => <span className="font-medium">{value}</span>,
    },
    {
      accessorKey: "vendorName",
      header: "Vendor",
      sortable: true,
      cell: ({ row }) => <span>{row.vendor?.name}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Created Date",
      sortable: true,
      cell: ({ value }) => new Date(value).toLocaleDateString(),
    },
    {
      accessorKey: "items",
      header: "Items",
      cell: ({ value }) => `${value.length} item(s)`,
    },
    {
      accessorKey: "totalAmount",
      header: "Total Amount",
      align: "right",
      sortable: true,
      cell: ({ value }) => (
        <span className="font-semibold">
          ₹{value.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ value }) => (
        <Badge className={statusColors[value]} variant="outline">
          {value}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      align: "right",
      cell: () => (
        <Button variant="ghost" size="sm">
          View
        </Button>
      ),
    },
  ];

  // Render card for each PO
  const renderPOCard = (po) => (
    <Card key={po.id} className="hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm sm:text-base truncate">
              {po.poNumber}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              <Building className="h-2.5 w-2.5 inline mr-0.5" />
              {po.vendor?.name}
            </p>
          </div>
          <Badge className={`${statusColors[po.status]} text-xs px-1.5 py-0`} variant="outline">
            {po.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{new Date(po.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span>{po.items.length} item(s)</span>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-sm sm:text-base">
              ₹{po.totalAmount.toLocaleString("en-IN")}
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Purchase Orders</h1>
          <p className="text-xs text-muted-foreground">
            Manage vendor purchase orders
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="gap-1.5 flex-1 sm:flex-initial h-8">
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-sm">Import</span>
            <span className="sm:hidden text-xs">CSV</span>
          </Button>
          <Button size="sm" className="gap-1.5 flex-1 sm:flex-initial h-8">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-sm">Create PO</span>
          </Button>
        </div>
      </div>

      {/* Search and View Toggle */}
      <Card className="p-2 sm:p-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search PO or vendor..."
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
            data={paginatedPOs}
            totalCount={sortedPOs.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            onSortChange={setSortConfig}
            isLoading={isLoading}
            emptyMessage="No purchase orders found"
          />
        </Card>
      ) : (
        <>
          <CardGrid
            data={paginatedPOs}
            renderCard={renderPOCard}
            isLoading={isLoading}
            emptyMessage="No purchase orders found"
          />
          
          {/* Pagination for card view */}
          {sortedPOs.length > 0 && (
            <Card className="p-2 sm:p-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, sortedPOs.length)} of {sortedPOs.length}
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
                    {currentPage}/{Math.ceil(sortedPOs.length / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(sortedPOs.length / pageSize), p + 1))}
                    disabled={currentPage === Math.ceil(sortedPOs.length / pageSize)}
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




