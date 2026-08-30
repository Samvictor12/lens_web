import { useCallback, useEffect, useState } from "react";
import { Table } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getVendorIndirectExpenses } from "@/services/vendorIndirectExpense";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

const STATUS_LABELS = {
  MARKED: "Marked",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
};

export default function IndirectExpensesTab({ filters, refreshKey = 0 }) {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 200,
        ...(filters.vendorId && { vendorId: filters.vendorId }),
        ...(filters.startDate && { from: filters.startDate }),
        ...(filters.endDate && { to: filters.endDate }),
      };
      const res = await getVendorIndirectExpenses(params);
      setRows(res.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load indirect expenses" });
    } finally {
      setLoading(false);
    }
  }, [filters.vendorId, filters.startDate, filters.endDate, refreshKey, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { accessorKey: "expenseNumber", header: "No." },
    {
      accessorKey: "vendor",
      header: "Vendor",
      cell: ({ row }) =>
        row.original.vendor?.shopname || row.original.vendor?.name || "—",
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => row.original.category?.name || "—",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => fmt(row.original.amount),
    },
    {
      accessorKey: "outstanding",
      header: "Outstanding",
      cell: ({ row }) => fmt(row.original.outstanding),
    },
    {
      accessorKey: "vendorExpenseStatus",
      header: "Status",
      cell: ({ row }) => STATUS_LABELS[row.original.vendorExpenseStatus] || row.original.vendorExpenseStatus,
    },
    {
      accessorKey: "dueDate",
      header: "Due",
      cell: ({ row }) =>
        row.original.dueDate
          ? new Date(row.original.dueDate).toLocaleDateString("en-IN")
          : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      <div className="min-h-0 flex-1">
        <Table
          data={rows}
          columns={columns}
          loading={loading}
          pagination={false}
          emptyMessage="No indirect vendor expenses for the selected filters."
        />
      </div>
    </div>
  );
}
