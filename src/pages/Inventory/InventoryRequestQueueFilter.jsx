import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { FormInput } from "@/components/ui/form-input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  getCustomersDropdown,
  getLensProductsDropdown,
} from "@/services/saleOrder";

export default function InventoryRequestQueueFilter({
  open,
  onOpenChange,
  filters,
  onFilterChange,
  onApply,
  onCancel,
  hasActiveFilters,
}) {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [custRes, prodRes] = await Promise.all([
          getCustomersDropdown(),
          getLensProductsDropdown(),
        ]);
        if (custRes.success) setCustomers(custRes.data || []);
        if (prodRes.success) setProducts(prodRes.data || []);
      } catch (err) {
        console.error("Failed to load filter dropdowns", err);
      }
    }
    loadDropdowns();
  }, []);

  return (
    <div className="flex items-center gap-1.5">
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild>
          <Button variant="outline" size="xs" className="gap-1.5 h-8 relative">
            <Filter className="h-3.5 w-3.5" />
            <span className="text-sm">Filters</span>
            {hasActiveFilters && (
              <Badge variant="default" className="ml-1 h-4 px-1 text-xs">
                •
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filter SO Request Queue</SheetTitle>
            <SheetDescription>
              Apply filters to refine the sales order request list
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer-filter" className="text-sm font-medium">
                Customer
              </Label>
              <FormSelect
                name="customerId"
                options={[{ id: null, name: "All Customers" }, ...customers]}
                value={filters.customerId}
                onChange={(value) =>
                  onFilterChange({ ...filters, customerId: value })
                }
                placeholder="Select customer"
                isSearchable
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-filter" className="text-sm font-medium">
                Lens Product
              </Label>
              <FormSelect
                name="lensProductId"
                options={[
                  { id: null, name: "All Products" },
                  ...products.map((p) => ({
                    id: p.id,
                    name: p.label || p.lens_name,
                  })),
                ]}
                value={filters.lensProductId}
                onChange={(value) =>
                  onFilterChange({ ...filters, lensProductId: value })
                }
                placeholder="Select product"
                isSearchable
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-ref-filter" className="text-sm font-medium">
                Customer Ref No
              </Label>
              <FormInput
                name="customerRefNo"
                value={filters.customerRefNo}
                onChange={(e) =>
                  onFilterChange({ ...filters, customerRefNo: e.target.value })
                }
                placeholder="Ref number..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="order-no-filter" className="text-sm font-medium">
                SO Number
              </Label>
              <FormInput
                name="orderNo"
                value={filters.orderNo}
                onChange={(e) =>
                  onFilterChange({ ...filters, orderNo: e.target.value })
                }
                placeholder="SO-XXXX..."
              />
            </div>
          </div>

          <SheetFooter className="flex flex-row gap-2">
            <Button variant="outline" size="xs" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button size="xs" onClick={onApply} className="flex-1">
              Apply Filters
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
