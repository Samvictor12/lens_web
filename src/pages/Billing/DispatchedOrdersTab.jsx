import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  Receipt,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  TablePrimitive as RawTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Refresh } from "@/components/ui/Refresh";
import { getDispatchedOrders } from "@/services/invoice";
import { fmt, orderTotal } from "./Billing.constants";

export default function DispatchedOrdersTab({ onBillCustomer }) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["dispatched-orders", { search, page }],
    queryFn: () => getDispatchedOrders({ search: search || undefined, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  const orders = res?.data || [];
  const pagination = res?.pagination;

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleClear = () => {
    setSearch("");
    setSearchInput("");
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <Card className="p-1 sm:p-1">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search order no. or customer…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Button size="sm" onClick={handleSearch} className="h-8 px-3">
              <Search className="h-4 w-4" />
            </Button>
            {search && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground"
                onClick={handleClear}
              >
                Clear
              </Button>
            )}
            <Refresh onClick={() => refetch()} />
          </div>
        </div>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-10">Loading dispatched orders…</p>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-16 flex flex-col items-center gap-3">
            <Receipt className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-muted-foreground font-medium">
              {search
                ? "No delivered orders match your search."
                : "No delivered orders waiting to be billed."}
            </p>
            <p className="text-sm text-muted-foreground">
              Orders in <strong>DELIVERED</strong> status that are not yet invoiced appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <RawTable>
              <TableHeader>
                <TableRow>
                  <TableHead>Order No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product / Coating</TableHead>
                  <TableHead>Dispatch Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.orderNo}</TableCell>
                    <TableCell>
                      <div className="font-medium">{o.customer?.name || "—"}</div>
                      {o.customer?.code && (
                        <div className="text-xs text-muted-foreground">{o.customer.code}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{o.lensProduct?.lens_name || "—"}</div>
                      {o.coating?.name && (
                        <div className="text-xs text-muted-foreground">{o.coating.name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {o.orderDate
                        ? new Date(o.orderDate).toLocaleDateString("en-IN")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmt(orderTotal(o))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => onBillCustomer(String(o.customer?.id))}
                      >
                        <Receipt className="h-3.5 w-3.5" /> Create Bill
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </RawTable>
          </div>

          {/* Pagination */}
          {pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-sm text-muted-foreground">
                Page {page} of {pagination.totalPages} · {pagination.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
