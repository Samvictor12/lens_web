import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { statusColors } from "./SaleOrder.constants";

import { STATUS_LABELS, procurementBadgeStyles } from "@/constants/saleOrderStatus";

export const useSaleOrderColumns = (navigate, handleDeleteClick, onStatusClick) => {
  return [
    {
      accessorKey: "orderNo",
      header: "Order #",
      sortable: true,
      cell: (row) => (
        <a
          href={`/sales/orders/view/${row.id}`}
          target="_blank"
          rel="noopener noreferrer"
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
        <span className="text-xs">{row.customer?.name || "N/A"}</span>
      )
    },
    {
      accessorKey: "customerRefNo",
      header: "Customer Reference No",
      sortable: true,
      cell: (row) => (
        <span className="text-xs">{row.customerRefNo || "N/A"}</span>
      )
    },
    {
      accessorKey: "lensName",
      header: "Lens Name",
      sortable: false,
      width: 220,
      cell: (row) => (
        <span className="text-xs font-medium block min-w-[200px]">
          {row.lensProduct?.lens_name || "N/A"}
          {row.lensProduct?.product_code ? ` (${row.lensProduct.product_code})` : ""}
        </span>
      ),
    },
    {
      accessorKey: "lensCategory",
      header: "Lens Category",
      sortable: false,
      cell: (row) => (
        <span className="text-xs">
          {row.category?.name || "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "orderDate",
      header: "Order Date",
      sortable: true,
      cell: (row) => (
        <span className="text-xs">
          {row.orderDate ? new Date(row.orderDate).toLocaleDateString() : "N/A"}
        </span>
      ),
    },
    {
      accessorKey: "procurementType",
      header: "Type",
      cell: (row) => {
        const procurementType = row.procurementType || "RX";
        const style =
          procurementBadgeStyles[procurementType] || procurementBadgeStyles.RX;
        return (
          <Badge variant="outline" className={`text-3xs border ${style}`}>
            {procurementType}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      sortable: true,
      cell: (row) => (
        <Badge
          className={`${statusColors[row.status] || statusColors.DRAFT} text-3xs text-wrap max-w-[140px] cursor-pointer hover:opacity-80`}
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onStatusClick?.(row);
          }}
          title="View status history"
        >
          {row.status ? (STATUS_LABELS[row.status] || row.status.replace(/_/g, " ")) : "DRAFT"}
        </Badge>
      ),
    },
    // {
    //   accessorKey: "lensPrice",
    //   header: "Total Amount",
    //   align: "right",
    //   sortable: true,
    //   cell: (row) => {
    //     const lensPrice   = row.lensPrice    || 0;
    //     const rightExtra  = row.rightEyeExtra || 0;
    //     const leftExtra   = row.leftEyeExtra  || 0;
    //     const fitting     = row.fittingPrice  || 0;
    //     const tinting     = row.tintingPrice  || 0;
    //     const additional  = Array.isArray(row.additionalPrice)
    //       ? row.additionalPrice.reduce((sum, p) => sum + (parseFloat(p.value) || 0), 0)
    //       : 0;

    //     const baseLensPrice = lensPrice + rightExtra + leftExtra + fitting + tinting;
    //     const subtotal = baseLensPrice + additional;

    //     const freeLensDeduction   = row.freeLens    ? lensPrice : 0;
    //     const freeFittingDeduction = row.freeFitting ? fitting  : 0;

    //     const subtotalAfterFree = subtotal - freeLensDeduction - freeFittingDeduction;
    //     const discountPct = row.discount || 0;
    //     const discountAmt = (subtotalAfterFree * discountPct) / 100;
    //     let finalTotal = subtotalAfterFree - discountAmt;

    //     // Apply offer discount on top
    //     const offer = row.offer;
    //     if (offer) {
    //       if (offer.offerType === 'PERCENTAGE') {
    //         // PERCENTAGE offer replaces the category discount
    //         const offerDiscount = (subtotalAfterFree * (offer.discountPercentage || 0)) / 100;
    //         finalTotal = subtotalAfterFree - offerDiscount;
    //       } else if (offer.offerType === 'VALUE') {
    //         finalTotal = finalTotal - (offer.discountValue || 0);
    //       }
    //       // EXCHANGE_COATING_PRICE requires fetching the exchange price — skip for list
    //     }

    //     return (
    //       <div className="flex flex-col items-end">
    //         <span className="font-semibold text-sm">
    //           ₹{finalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
    //         </span>
    //         {discountPct > 0 && (
    //           <span className="text-xs text-muted-foreground">
    //             ({discountPct}% off)
    //           </span>
    //         )}
    //       </div>
    //     );
    //   },
    // },
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
