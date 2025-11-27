import { Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom hook that returns the table columns configuration for the lens product list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @returns {Array} Array of column definitions
 */
export const useLensProductColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "productCode",
      header: "Product Code",
      sortable: true,
    },
    {
      accessorKey: "lensName",
      header: "Lens Name",
      sortable: true,
      cell: (product) => (
        <a
          href={`/masters/lens-product/view/${product.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/lens-product/view/${product.id}`);
          }}
          className="hover:underline cursor-pointer text-primary font-medium text-xs"
        >
          {product.lensName}
        </a>
      ),
    },
    {
      accessorKey: "brandName",
      header: "Brand",
      sortable: true,
      cell: (product) => (
        <span className="text-xs">{product.brandName || "-"}</span>
      ),
    },
    {
      accessorKey: "categoryName",
      header: "Category",
      sortable: true,
      cell: (product) => (
        <span className="text-xs">{product.categoryName || "-"}</span>
      ),
    },
    {
      accessorKey: "materialName",
      header: "Material",
      sortable: false,
      cell: (product) => (
        <span className="text-xs">{product.materialName || "-"}</span>
      ),
    },
    {
      accessorKey: "typeName",
      header: "Type",
      sortable: false,
      cell: (product) => (
        <span className="text-xs">{product.typeName || "-"}</span>
      ),
    },
    // {
    //   accessorKey: "prices",
    //   header: "Prices",
    //   sortable: false,
    //   cell: (product) => {
    //     const priceCount = product.prices?.length || 0;
    //     if (priceCount === 0)
    //       return (
    //         <span className="text-xs text-muted-foreground">No prices</span>
    //       );

    //     const minPrice = Math.min(
    //       ...product.prices.map((p) => parseFloat(p.price) || 0)
    //     );
    //     const maxPrice = Math.max(
    //       ...product.prices.map((p) => parseFloat(p.price) || 0)
    //     );

    //     return (
    //       <div className="text-xs">
    //         <div className="font-medium">
    //           {minPrice === maxPrice
    //             ? `₹${minPrice.toLocaleString("en-IN")}`
    //             : `₹${minPrice.toLocaleString(
    //                 "en-IN"
    //               )} - ₹${maxPrice.toLocaleString("en-IN")}`}
    //         </div>
    //         <div className="text-muted-foreground">
    //           {priceCount} coating{priceCount > 1 ? "s" : ""}
    //         </div>
    //       </div>
    //     );
    //   },
    // },
    {
      accessorKey: "activeStatus",
      header: "Status",
      sortable: true,
      cell: (product) => (
        <Badge
          variant={product.activeStatus === "active" ? "default" : "secondary"}
          className="text-xs"
        >
          {product.activeStatus === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (product) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(product)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
