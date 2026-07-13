import { useMemo, useState } from "react";
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
import {
  AWAITING_GROUP_OPTIONS,
  BillingGroupBySelect,
  BillingGroupedList,
  groupAwaitingOrders,
} from "./BillingGroupBy";

function OrdersTable({ orders, onBillCustomer }) {
  return (
    <RawTable>
      <TableHeader>
        <TableRow>
          <TableHead>Order No</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Customer Ref No</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Order Date</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead className="text-right">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((o) => (
          <TableRow key={o.id}>
            <TableCell className="font-medium">{o.orderNo}</TableCell>
            <TableCell>
              <div className="font-medium text-sm">{o.customer?.name || "—"}</div>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {o.customerRefNo || "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {[o.lensProduct?.lens_name, o.coating?.name].filter(Boolean).join(" · ") || "—"}
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
                className="h-7 text-xs"
                onClick={() => onBillCustomer(String(o.customer?.id))}
              >
                Bill
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </RawTable>
  );
}

export default function DispatchedOrdersTab({ onBillCustomer }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [groupBy, setGroupBy] = useState(null);

  const { data: res, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dispatched-orders", { search, page, groupBy }],
    queryFn: () =>
      getDispatchedOrders({
        search: search || undefined,
        page: groupBy ? 1 : page,
        limit: groupBy ? 500 : 20,
      }),
    placeholderData: keepPreviousData,
  });

  const orders = res?.data || [];
  const pagination = res?.pagination;

  const groups = useMemo(
    () => groupAwaitingOrders(orders, groupBy, orderTotal),
    [orders, groupBy]
  );

  return (
    <div className="space-y-4">
      {/* Search + Group by — same placement as Lens Product list */}
      <Card className="p-1 sm:p-1">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search order no, customer, customer ref…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <BillingGroupBySelect
            value={groupBy}
            onChange={(v) => {
              setGroupBy(v);
              setPage(1);
            }}
            options={AWAITING_GROUP_OPTIONS}
          />
          <Refresh onClick={() => refetch()} />
        </div>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-10">Loading orders…</p>
      ) : isError ? (
        <Card className="border-destructive/50">
          <CardContent className="py-10 flex flex-col items-center gap-2 text-center">
            <p className="font-medium text-destructive">Failed to load orders</p>
            <p className="text-sm text-muted-foreground">
              {typeof error === "string"
                ? error
                : error?.message || "An unexpected error occurred. Check your permissions or try refreshing."}
            </p>
            <button
              className="mt-2 text-sm underline text-muted-foreground hover:text-foreground"
              onClick={() => refetch()}
            >
              Retry
            </button>
          </CardContent>
        </Card>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-2 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">No orders awaiting invoice</p>
            <p className="text-sm text-muted-foreground">
              Delivered sale orders that are not yet billed will appear here.
            </p>
          </CardContent>
        </Card>
      ) : groupBy ? (
        <BillingGroupedList
          groups={groups}
          emptyMessage="No groups found"
          renderItems={(items) => (
            <OrdersTable orders={items} onBillCustomer={onBillCustomer} />
          )}
        />
      ) : (
        <>
          <Card>
            <OrdersTable orders={orders} onBillCustomer={onBillCustomer} />
          </Card>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} order(s)
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
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
