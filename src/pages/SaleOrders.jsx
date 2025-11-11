import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Calendar, User, Package, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ViewToggle } from "@/components/ui/view-toggle";
import { CardGrid } from "@/components/ui/card-grid";
import { dummySaleOrders, dummyCustomers } from "@/lib/dummyData";
import { Separator } from "@/components/ui/separator";

export default function SaleOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState(() => {
    // Load view preference from localStorage
    return localStorage.getItem("saleOrdersView") || "table";
  });
  const navigate = useNavigate();

  // Save view preference
  useEffect(() => {
    localStorage.setItem("saleOrdersView", view);
  }, [view]);

  const orders = dummySaleOrders.map((order) => ({
    ...order,
    customer: dummyCustomers.find((c) => c.id === order.customerId),
  }));

  const statusColors = {
    pending: "bg-warning/10 text-warning border-warning/20",
    "in-production": "bg-primary/10 text-primary border-primary/20",
    "ready-for-dispatch": "bg-accent/10 text-accent border-accent/20",
    dispatched: "bg-success/10 text-success border-success/20",
    delivered: "bg-success",
    returned: "bg-destructive/10 text-destructive border-destructive/20",
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.customer?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orders, searchQuery]);

  // Sort orders
  const sortedOrders = useMemo(() => {
    if (!sortConfig.column) return filteredOrders;

    return [...filteredOrders].sort((a, b) => {
      let aValue = a[sortConfig.column];
      let bValue = b[sortConfig.column];

      // Handle nested customer name
      if (sortConfig.column === "customerName") {
        aValue = a.customer?.name || "";
        bValue = b.customer?.name || "";
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
  }, [filteredOrders, sortConfig]);

  // Paginate orders
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedOrders.slice(startIndex, startIndex + pageSize);
  }, [sortedOrders, currentPage, pageSize]);

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
      accessorKey: "customerName",
      header: "Customer",
      sortable: true,
      cell: ({ row }) => <span>{row.customer?.name}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Date",
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
      header: "Amount",
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
          {value.replace(/-/g, " ")}
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
              {order.customer?.name}
            </p>
          </div>
          <Badge className={`${statusColors[order.status]} text-xs px-1.5 py-0`} variant="outline">
            <span className="hidden sm:inline">{order.status.replace(/-/g, " ")}</span>
            <span className="sm:hidden">{order.status.split("-")[0]}</span>
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
            <span>{order.items.length} item(s)</span>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-semibold text-sm sm:text-base">
              ₹{order.totalAmount.toLocaleString("en-IN")}
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
              onChange={(e) => setSearchQuery(e.target.value)}
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
            data={paginatedOrders}
            totalCount={sortedOrders.length}
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
            data={paginatedOrders}
            renderCard={renderOrderCard}
            isLoading={isLoading}
            emptyMessage="No sale orders found"
          />
          
          {/* Pagination for card view */}
          {sortedOrders.length > 0 && (
            <Card className="p-2 sm:p-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, sortedOrders.length)} of {sortedOrders.length}
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
                    {currentPage}/{Math.ceil(sortedOrders.length / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(sortedOrders.length / pageSize), p + 1))}
                    disabled={currentPage === Math.ceil(sortedOrders.length / pageSize)}
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





