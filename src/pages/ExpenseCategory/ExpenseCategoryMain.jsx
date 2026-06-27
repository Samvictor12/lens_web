import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { getExpenseCategories, deleteExpenseCategory } from "@/services/expense";
import { expenseCategoryFilters } from "./ExpenseCategory.constants";
import ExpenseCategoryFilter from "./ExpenseCategoryFilter";
import { useExpenseCategoryColumns } from "./useExpenseCategoryColumns";
import { Refresh } from "@/components/ui/Refresh";

export default function ExpenseCategoryMain() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState([]);
  const [filters, setFilters] = useState(expenseCategoryFilters);
  const [tempFilters, setTempFilters] = useState(expenseCategoryFilters);
  const [categories, setCategories] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };

  const columns = useExpenseCategoryColumns(navigate, handleDeleteClick);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await getExpenseCategories();

      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch expense categories",
        variant: "destructive",
      });
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    toast({
      title: "Refreshed",
      description: "Expense category list has been refreshed.",
    });
  };

  useEffect(() => {
    fetchCategories();
  }, [refreshKey]);

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      setIsDeleting(true);
      await deleteExpenseCategory(categoryToDelete.id);

      toast({
        title: "Success",
        description: `Expense category "${categoryToDelete.name}" has been deleted successfully.`,
      });

      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete expense category.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.active_status !== "all" || filters.expenseType !== "all"
    );
  }, [filters]);

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setPageIndex(0);
    setShowFilterDialog(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = expenseCategoryFilters;
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setPageIndex(0);
    setShowFilterDialog(false);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

  const filteredCategories = useMemo(() => {
    let result = categories;

    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter((c) => c.name?.toLowerCase().includes(q));
    }

    if (filters.active_status !== "all") {
      result = result.filter(
        (c) => c.active_status === filters.active_status
      );
    }

    if (filters.expenseType !== "all") {
      result = result.filter(
        (c) => c.expenseType === filters.expenseType
      );
    }

    return result;
  }, [categories, searchQuery, filters]);

  const sortedCategories = useMemo(() => {
    if (!sorting.length) return filteredCategories;
    const { id, desc } = sorting[0];
    return [...filteredCategories].sort((a, b) => {
      let av = a[id];
      let bv = b[id];

      if (id === "expenses") {
        av = a._count?.expenses || 0;
        bv = b._count?.expenses || 0;
      }

      if (id === "createdAt") {
        av = new Date(a.createdAt).getTime();
        bv = new Date(b.createdAt).getTime();
      }

      if (typeof av === "boolean") {
        av = av ? 1 : 0;
        bv = bv ? 1 : 0;
      }

      if (av == null) av = "";
      if (bv == null) bv = "";

      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));

      return desc ? -cmp : cmp;
    });
  }, [filteredCategories, sorting]);

  const pagedCategories = useMemo(() => {
    const start = pageIndex * pageSize;
    return sortedCategories.slice(start, start + pageSize);
  }, [sortedCategories, pageIndex, pageSize]);

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, filters]);

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Expense Categories
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage expense category master data
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate("/masters/expense-categories/add")}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Category</span>
          </Button>
        </div>
      </div>

      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search expense categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Refresh onClick={handleRefresh} />
            <ExpenseCategoryFilter
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

      <div className="flex-1 min-h-0">
        <Table
          data={pagedCategories}
          columns={columns}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={sortedCategories.length}
          onPageChange={setPageIndex}
          loading={isLoading}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
          setSorting={setSorting}
          sorting={sorting}
          pagination={true}
          emptyMessage="No expense categories found"
        />
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Expense Category?"
        description={
          categoryToDelete
            ? `Are you sure you want to delete "${categoryToDelete.name}"? This action cannot be undone.`
            : "Are you sure you want to delete this expense category?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
}
