import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Calendar, User, Package, DollarSign, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ViewToggle } from "@/components/ui/view-toggle";
import { CardGrid } from "@/components/ui/card-grid";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { getSaleOrders } from "@/services/saleOrder";
import { toast } from "sonner";

export default function SaleOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [view, setView] = useState(() => {
    // Load view preference from localStorage
    return localStorage.getItem("saleOrdersView") || "table";
  });
  const navigate = useNavigate();

  // Save view preference
  useEffect(() => {
    localStorage.setItem("saleOrdersView", view);
  }, [view]);

  // Fetch orders using React Query
  const { data: ordersData, isLoading, isError, error } = useQuery({
    queryKey: ['saleOrders', currentPage, pageSize, searchQuery, sortConfig],
    queryFn: () => getSaleOrders(
      currentPage,
      pageSize,
      searchQuery,
      {}, // filters
      sortConfig.column || 'createdAt',
      sortConfig.direction || 'desc'
    ),
    keepPreviousData: true,
  });

  const orders = useMemo(() => {
    if (!ordersData?.data) return [];
    return ordersData.data;
  }, [ordersData]);

  const totalCount = ordersData?.pagination?.total || 0;
  const totalPages = ordersData?.pagination?.pages || 0;

  useEffect(() => {
    if (isError) {
      toast.error(error?.message || "Failed to fetch sale orders");
    }
  }, [isError, error]);

  const statusColors = {
    DRAFT: "bg-gray-100 text-gray-800 border-gray-200",
    CONFIRMED: "bg-blue-100 text-blue-800 border-blue-200",
    IN_PRODUCTION: "bg-yellow-100 text-yellow-800 border-yellow-200",
    READY_FOR_DISPATCH: "bg-purple-100 text-purple-800 border-purple-200",
    DELIVERED: "bg-green-100 text-green-800 border-green-200",
    CANCELLED: "bg-red-100 text-red-800 border-red-200",
  };

  const handleCreateNewOrder = () => {
    navigate("/sales/orders/new");
  };

  // Define columns
  const columns = [
    {
      accessorKey: "orderNumber",
      header: "Order #",
      sortable: true,
      cell: ({ value }) => <span className="font-medium">{value}</span>,
    },
    {
      accessorKey: "customerRefNo",
      header: "Customer Ref",
      sortable: true,
      cell: ({ value }) => <span>{value || '-'}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      sortable: true,
      cell: ({ value }) => new Date(value).toLocaleDateString(),
    },
    {
      accessorKey: "lensName",
      header: "Lens",
      cell: ({ value }) => <span className="truncate max-w-[150px] inline-block" title={value}>{value}</span>,
    },
    {
      accessorKey: "totalAmount",
      header: "Amount",
      align: "right",
      sortable: true,
      cell: ({ value }) => (
        <span className="font-semibold">
          ₹{value?.toLocaleString("en-IN") || 0}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ value }) => (
        <Badge className={statusColors[value] || "bg-gray-100"} variant="outline">
          {value?.replace(/_/g, " ")}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      align: "right",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/sales/orders/${row.id}`)}>
          View
        </Button>
      ),
    },
  ];

  // Render card for each order
  const renderOrderCard = (order) => (
    <Card key={order.id} className="hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm sm:text-base truncate">
              {order.orderNumber}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {order.customerRefNo || 'No Ref'}
            </p>
          </div>
          <Badge className={`${statusColors[order.status] || "bg-gray-100"} text-xs px-1.5 py-0`} variant="outline">
            <span className="hidden sm:inline">{order.status?.replace(/_/g, " ")}</span>
            <span className="sm:hidden">{order.status?.split("_")[0]}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-3 pt-0">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{new Date(order.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="truncate" title={order.lensName}>{order.lensName}</span>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-sm sm:text-base">
              ₹{order.totalAmount?.toLocaleString("en-IN") || 0}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => navigate(`/sales/orders/${order.id}`)}
          >
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
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Sale Orders</h1>
          <p className="text-xs text-muted-foreground">
            Manage all customer orders
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 w-full sm:w-auto"
          onClick={handleCreateNewOrder}
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="text-sm">New Order</span>
        </Button>
      </div>

      {/* Search and View Toggle */}
      <Card className="p-2 sm:p-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <ViewToggle view={view} onViewChange={setView} />
            <Button variant="outline" size="sm" className="gap-1.5 flex-1 sm:flex-initial h-8">
              <Filter className="h-3.5 w-3.5" />
              <span className="text-sm">Filters</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Display */}
      {view === "table" ? (
        <Card>
          <DataTable
            columns={columns}
            data={orders}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            onSortChange={setSortConfig}
            isLoading={isLoading}
            emptyMessage="No sale orders found"
          />
        </Card>
      ) : (
        <>
          <CardGrid
            data={orders}
            renderCard={renderOrderCard}
            isLoading={isLoading}
            emptyMessage="No sale orders found"
          />

          {/* Pagination for card view */}
          {orders.length > 0 && (
            <Card className="p-2 sm:p-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount}
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
                    {currentPage}/{totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
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





