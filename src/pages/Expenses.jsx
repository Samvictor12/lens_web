import { Plus, TrendingDown, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ViewToggle } from "@/components/ui/view-toggle";
import { CardGrid } from "@/components/ui/card-grid";
import { dummyExpenses } from "@/lib/dummyData";
import { useState, useMemo, useEffect } from "react";
import { Separator } from "@/components/ui/separator";

export default function Expenses() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });
  const [isLoading, setIsLoading] = useState(false);
  const [view, setView] = useState(() => {
    return localStorage.getItem("expensesView") || "table";
  });

  useEffect(() => {
    localStorage.setItem("expensesView", view);
  }, [view]);

  const totalDirect = dummyExpenses
    .filter((e) => e.type === "direct")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalIndirect = dummyExpenses
    .filter((e) => e.type === "indirect")
    .reduce((sum, e) => sum + e.amount, 0);

  // Sort expenses
  const sortedExpenses = useMemo(() => {
    if (!sortConfig.column) return dummyExpenses;

    return [...dummyExpenses].sort((a, b) => {
      let aValue = a[sortConfig.column];
      let bValue = b[sortConfig.column];

      // Handle date sorting
      if (sortConfig.column === "date") {
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
  }, [sortConfig]);

  // Paginate expenses
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedExpenses.slice(startIndex, startIndex + pageSize);
  }, [sortedExpenses, currentPage, pageSize]);

  // Define columns
  const columns = [
    {
      accessorKey: "date",
      header: "Date",
      sortable: true,
      cell: ({ value }) => new Date(value).toLocaleDateString(),
    },
    {
      accessorKey: "category",
      header: "Category",
      sortable: true,
      cell: ({ value }) => <span className="font-medium">{value}</span>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ value }) => <span className="text-muted-foreground">{value}</span>,
    },
    {
      accessorKey: "type",
      header: "Type",
      sortable: true,
      cell: ({ value }) => (
        <Badge
          variant="outline"
          className={
            value === "direct"
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-accent/10 text-accent border-accent/20"
          }
        >
          {value}
        </Badge>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      cell: ({ value }) => (
        <span className="font-semibold">
          ₹{value.toLocaleString("en-IN")}
        </span>
      ),
    },
  ];

  // Render card for each expense
  const renderExpenseCard = (expense) => (
    <Card key={expense.id} className="hover:shadow-md transition-shadow bg-card">
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-primary" />
            <div>
              <CardTitle className="text-sm">{expense.category}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {new Date(expense.date).toLocaleDateString("en-IN")}
              </p>
            </div>
          </div>
          <Badge
            variant={expense.type === "Direct" ? "default" : "secondary"}
            className="text-xs px-1.5 py-0 h-5"
          >
            {expense.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Amount</span>
            <span className="text-lg sm:text-xl font-bold">
              ₹{expense.amount.toLocaleString("en-IN")}
            </span>
          </div>
          {expense.description && (
            <p className="text-xs text-muted-foreground">
              {expense.description}
            </p>
          )}
          {expense.reference && (
            <p className="text-xs text-muted-foreground">
              Ref: {expense.reference}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Expense Management</h1>
          <p className="text-xs text-muted-foreground">
            Track direct and indirect expenses
          </p>
        </div>
        <Button size="sm" className="gap-1.5 w-full sm:w-auto">
          <Plus className="h-3.5 w-3.5" />
          <span className="text-sm">Add Expense</span>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-3">
        <Card className="bg-gradient-card shadow-sm">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1.5">
              <TrendingDown className="h-3 w-3" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold">
              ₹{(totalDirect + totalIndirect).toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-sm">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Direct Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-primary">
              ₹{totalDirect.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-sm">
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-xs text-muted-foreground">
              Indirect Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-accent">
              ₹{totalIndirect.toLocaleString("en-IN")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex justify-end">
        <ViewToggle view={view} onViewChange={setView} />
      </div>

      {/* Data Display */}
      {view === "table" ? (
        <Card>
          <DataTable
            columns={columns}
            data={paginatedExpenses}
            totalCount={sortedExpenses.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            onSortChange={setSortConfig}
            isLoading={isLoading}
            emptyMessage="No expenses found"
          />
        </Card>
      ) : (
        <>
          <CardGrid
            data={paginatedExpenses}
            renderCard={renderExpenseCard}
            isLoading={isLoading}
            emptyMessage="No expenses found"
          />
          
          {/* Pagination for card view */}
          {sortedExpenses.length > 0 && (
            <Card className="p-2 sm:p-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3">
                <div className="text-xs text-muted-foreground">
                  Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedExpenses.length)} of {sortedExpenses.length} results
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-xs px-1.5">
                    Page {currentPage} of {Math.ceil(sortedExpenses.length / pageSize)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7"
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(sortedExpenses.length / pageSize), p + 1))}
                    disabled={currentPage === Math.ceil(sortedExpenses.length / pageSize)}
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


