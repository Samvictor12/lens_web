import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { getCheckSheets, deleteCheckSheet } from "@/services/checkSheet";
import { checkSheetFilters } from "./CheckSheet.constants";
import { useCheckSheetColumns } from "./useCheckSheetColumns";
import { Refresh } from "@/components/ui/Refresh";

export default function CheckSheetMain() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState([]);
  const [filters] = useState(checkSheetFilters);
  const [refreshKey, setRefreshKey] = useState(0);
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (row) => { setToDelete(row); setDeleteDialogOpen(true); };
  const columns = useCheckSheetColumns(navigate, handleDeleteClick);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || "createdAt";
      const sortDir   = sorting[0]?.desc ? "desc" : "asc";
      const res = await getCheckSheets(pageIndex + 1, pageSize, searchQuery, filters, sortField, sortDir);
      if (res.success) {
        setRecords(res.data);
        setTotalCount(res.pagination.total);
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to fetch check sheets", variant: "destructive" });
      setRecords([]); setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    toast({ title: "Refreshed", description: "Check sheet list has been refreshed." });
  };

  useEffect(() => { fetchRecords(); }, [pageIndex, pageSize, searchQuery, filters, sorting, refreshKey]);

  const handleDeleteConfirm = async () => {
    if (!toDelete) return;
    try {
      setIsDeleting(true);
      await deleteCheckSheet(toDelete.id);
      toast({ title: "Deleted", description: `"${toDelete.name}" deleted successfully.` });
      setDeleteDialogOpen(false);
      setToDelete(null);
      fetchRecords();
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to delete check sheet", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Check Sheets</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Manage check sheet masters and their items</p>
        </div>
        <Button size="xs" className="gap-1.5 h-8" onClick={() => navigate("/masters/check-sheets/add")}>
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add Check Sheet</span>
        </Button>
      </div>

      {/* Search */}
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name, key or description..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPageIndex(0); }}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Refresh onClick={handleRefresh} />
        </div>
      </Card>

      {/* Table */}
      <div className="flex-1 min-h-0">
        <Table
          data={records}
          columns={columns}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPageIndex}
          loading={isLoading}
          onPageSizeChange={(size) => { setPageSize(size); setPageIndex(0); }}
          setSorting={setSorting}
          sorting={sorting}
          pagination={true}
          emptyMessage="No check sheets found"
        />
      </div>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Check Sheet?"
        description={toDelete ? `Are you sure you want to delete "${toDelete.name}"? All items inside will also be removed.` : ""}
        isDeleting={isDeleting}
      />
    </div>
  );
}
