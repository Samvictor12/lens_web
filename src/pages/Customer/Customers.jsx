import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Upload,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { ViewToggle } from "@/components/ui/view-toggle";
import { CardGrid } from "@/components/ui/card-grid";
import { dummyCustomers } from "@/lib/dummyData";
import {
  downloadCustomerTemplate,
  exportCustomersToExcel,
  importCustomersFromExcel,
} from "@/lib/excelUtils";
import { customerFilters } from "./Customer.constants";
import CustomerFilter from "./CustomerFilter";
import { useCustomerColumns } from "./useCustomerColumns";
import CustomerCard from "./CustomerCard";

export default function Customers() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState(
    () => localStorage.getItem("customersView") || "card"
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  
  // Pagination states
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Sorting state
  const [sorting, setSorting] = useState([]);

  // Filter states
  const [filters, setFilters] = useState(customerFilters);
  const [tempFilters, setTempFilters] = useState(customerFilters);

  // Get table columns
  const columns = useCustomerColumns(navigate);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.status !== "all" ||
      filters.minCreditLimit !== "" ||
      filters.maxCreditLimit !== "" ||
      filters.minOutstanding !== "" ||
      filters.maxOutstanding !== "" ||
      filters.hasEmail !== "all" ||
      filters.hasGST !== "all"
    );
  }, [filters]);

  // Save view preference
  const handleViewChange = (newView) => {
    setView(newView);
    localStorage.setItem("customersView", newView);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterDialog(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = customerFilters;
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setShowFilterDialog(false);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

  const filteredCustomers = useMemo(() => {
    return dummyCustomers.filter((customer) => {
      // Search filter
      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.customerCode
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery) ||
        customer.email?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus =
        filters.status === "all" ||
        (filters.status === "outstanding" && customer.outstandingBalance > 0) ||
        (filters.status === "clear" && customer.outstandingBalance === 0);

      // Credit limit filter
      const matchesCreditLimit =
        (filters.minCreditLimit === "" ||
          customer.creditLimit >= parseFloat(filters.minCreditLimit)) &&
        (filters.maxCreditLimit === "" ||
          customer.creditLimit <= parseFloat(filters.maxCreditLimit));

      // Outstanding balance filter
      const matchesOutstanding =
        (filters.minOutstanding === "" ||
          customer.outstandingBalance >= parseFloat(filters.minOutstanding)) &&
        (filters.maxOutstanding === "" ||
          customer.outstandingBalance <= parseFloat(filters.maxOutstanding));

      // Email filter
      const matchesEmail =
        filters.hasEmail === "all" ||
        (filters.hasEmail === "yes" && customer.email) ||
        (filters.hasEmail === "no" && !customer.email);

      // GST filter
      const matchesGST =
        filters.hasGST === "all" ||
        (filters.hasGST === "yes" && customer.gstNumber) ||
        (filters.hasGST === "no" && !customer.gstNumber);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCreditLimit &&
        matchesOutstanding &&
        matchesEmail &&
        matchesGST
      );
    });
  }, [searchQuery, filters]);

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          const customers = await importCustomersFromExcel(file);
          console.log("Imported customers:", customers);
          alert(`Successfully imported ${customers.length} customers!`);
          // Here you would typically update your state or refetch data
        } catch (error) {
          alert("Error importing file: " + error.message);
        }
      }
    };
    input.click();
  };

  const handleDownloadSample = () => {
    downloadCustomerTemplate();
  };

  return (
    <div className="flex flex-col h-[92vh] p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Customers
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage customer information and accounts
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="xs"
            className="gap-1.5 h-8"
            onClick={handleDownloadSample}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download Sample</span>
          </Button>
          <Button
            variant="outline"
            size="xs"
            className="gap-1.5 h-8"
            onClick={handleUpload}
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Upload</span>
          </Button>
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate("/sales/customers/add")}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Customer</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <ViewToggle view={view} onViewChange={handleViewChange} />
            <CustomerFilter
              filters={filters}
              tempFilters={tempFilters}
              setTempFilters={setTempFilters}
              showFilterDialog={showFilterDialog}
              setShowFilterDialog={setShowFilterDialog}
              hasActiveFilters={hasActiveFilters}
              onApplyFilters={handleApplyFilters}
              onClearFilters={handleClearFilters}
              onCancelFilters={handleCancelFilters}
            />
          </div>
        </div>
      </Card>

      {/* Table View */}
      {view === "table" && (
        <div className="flex-1 min-h-0">
          <Table
            data={filteredCustomers}
            columns={columns}
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalCount={filteredCustomers.length}
            onPageChange={setPageIndex}
            loading={isLoading}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPageIndex(0);
            }}
            setSorting={setSorting}
            sorting={sorting}
            pagination={true}
            emptyMessage="No customers found"
          />
        </div>
      )}

      {/* Card View */}
      {view === "card" && (
        <div className="flex-1 overflow-auto">
          <CardGrid
            items={filteredCustomers}
            renderCard={(customer) => (
              <CustomerCard
                customer={customer}
                onView={(id) => navigate(`/sales/customers/view/${id}`)}
              />
            )}
            isLoading={isLoading}
            emptyMessage="No customers found"
          />
        </div>
      )}
    </div>
  );
}
