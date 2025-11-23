import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { statusColors } from "./SaleOrder.constants";

export const useSaleOrderColumns = (navigate, handleDeleteClick) => {
  return [
    {
      accessorKey: "orderNo",
      header: "Order #",
      sortable: true,
      cell: (row) => (
        <a
          onClick={() => window.open(`/sales/orders/view/${row.id}`, "_blank")}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <div>
            <div className="font-medium text-xs text-primary">{row.orderNo}</div>

          </div>
        </a>
      ),
    },
    {
      accessorKey: "customerName",
      header: "Customer",
      sortable: true,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm">{row.customer?.name || "N/A"}</span>
          {row.customer?.code && (
            <span className="text-xs text-muted-foreground">
              {row.customer.code}
            </span>
          )}
        </div>
      )
    },
    {
      accessorKey: "orderDate",
      header: "Order Date",
      sortable: true,
      cell: (row) => (
        <span className="text-sm">
          {row.orderDate ? new Date(row.orderDate).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: (row) => {
        console.log("type", row.type);
        return (
          <span className="text-sm">{row.type || "N/A"}</span>
        )
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      sortable: true,
      cell: (row) => (
        <Badge
          className={`${statusColors[row.status] || statusColors.DRAFT} text-xs`}
          variant="outline"
        >
          {row.status ? row.status.replace(/_/g, " ") : "DRAFT"}
        </Badge>
      ),
    },
    {
      accessorKey: "lensPrice",
      header: "Price",
      align: "right",
      sortable: true,
      cell: (row) => {
        console.log("lensPrice", row);
        const price = row.lensPrice || 0;
        const discount = row.discount || 0;
        const finalPrice = price - (price * discount) / 100;

        return (
          <div className="flex flex-col items-end">
            <span className="font-semibold text-sm">
              ₹{finalPrice.toLocaleString("en-IN")}
            </span>
            {discount > 0 && (
              <span className="text-xs text-muted-foreground">
                ({discount}% off)
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "actions",
      header: "Actions",
      align: "right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={() => handleDeleteClick(row)}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
