import { Building, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Custom hook that returns the table columns configuration for the vendor list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @returns {Array} Array of column definitions
 */
export const useVendorColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "vendorCode",
      header: "Code",
      sortable: true,
    },
    {
      accessorKey: "name",
      header: "Vendor Name",
      sortable: true,
      cell: (vendor) => (
        <a
          href={`/masters/vendors/view/${vendor.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/masters/vendors/view/${vendor.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          {vendor.shopName && (
            <Building className="h-3 w-3 text-muted-foreground" />
          )}
          <div>
            <div className="font-medium text-xs text-primary">{vendor.name}</div>
            {vendor.shopName && (
              <div className="text-xs text-muted-foreground">
                {vendor.shopName}
              </div>
            )}
          </div>
        </a>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      sortable: true,
      cell: (vendor) => (
        <span className="text-xs">{vendor.category || "-"}</span>
      ),
    },
    {
      accessorKey: "phone",
      header: "Phone",
      sortable: false,
    },
    {
      accessorKey: "email",
      header: "Email",
      sortable: false,
      cell: (vendor) => (
        <span className="text-xs">{vendor.email || "-"}</span>
      ),
    },
    {
      accessorKey: "city",
      header: "Location",
      sortable: true,
      cell: (vendor) => (
        <span className="text-xs">
          {[vendor.city, vendor.state].filter(Boolean).join(", ") || "-"}
        </span>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (vendor) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs"
            onClick={() => navigate(`/masters/vendors/view/${vendor.id}`)}
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(vendor)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
