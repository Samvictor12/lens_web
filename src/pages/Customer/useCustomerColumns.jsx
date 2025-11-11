import { Building, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Custom hook that returns the table columns configuration for the customer list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @returns {Array} Array of column definitions
 */
export const useCustomerColumns = (navigate, onDelete) => {
  return [
    {
      accessorKey: "customerCode",
      header: "Code",
      sortable: true,
    },
    {
      accessorKey: "name",
      header: "Customer Name",
      sortable: true,
      cell: (customer) => (
        <a
          href={`/sales/customers/view/${customer.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/sales/customers/view/${customer.id}`);
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          {customer.shopName && (
            <Building className="h-3 w-3 text-muted-foreground" />
          )}
          <div>
            <div className="font-medium text-xs text-primary">{customer.name}</div>
            {customer.shopName && (
              <div className="text-xs text-muted-foreground">
                {customer.shopName}
              </div>
            )}
          </div>
        </a>
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
      cell: (customer) => (
        <span className="text-xs">{customer.email || "-"}</span>
      ),
    },
    {
      accessorKey: "creditLimit",
      header: "Credit Limit",
      sortable: true,
      cell: (customer) => (
        <span className="text-xs">
          ₹{(customer.creditLimit || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "outstandingBalance",
      header: "Outstanding",
      sortable: true,
      cell: (customer) => (
        <span
          className={`text-xs font-medium ${
            (customer.outstandingBalance || 0) > 0
              ? "text-warning"
              : "text-success"
          }`}
        >
          ₹{(customer.outstandingBalance || 0).toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (customer) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs"
            onClick={() => navigate(`/sales/customers/view/${customer.id}`)}
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(customer)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
