import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { getCustomerPayments, getOutstandingInvoices } from "@/services/customerPayment";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

/**
 * Collection tab — current-month list of Target, Actual, and Balance to collect per customer.
 */
export default function CollectionTab({ filters, collectibleParams, refreshKey = 0 }) {
  const [payments, setPayments] = useState([]);
  const [collectGroups, setCollectGroups] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingCollect, setLoadingCollect] = useState(false);

  const targetParams = collectibleParams ?? {
    endDate: filters.endDate,
    customerId: filters.customerId,
    productId: filters.productId,
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCollect(true);
      try {
        const params = {
          groupBy: "customer",
          collectible: true,
          ...(targetParams.endDate && { endDate: targetParams.endDate }),
          ...(targetParams.customerId && { customerId: targetParams.customerId }),
          ...(targetParams.productId && { productId: targetParams.productId }),
        };
        const res = await getOutstandingInvoices(params);
        if (!cancelled) setCollectGroups(res.data?.groups || []);
      } catch {
        if (!cancelled) setCollectGroups([]);
      } finally {
        if (!cancelled) setLoadingCollect(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    targetParams.endDate,
    targetParams.customerId,
    targetParams.productId,
    refreshKey,
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPayments(true);
      try {
        const params = {
          page: 1,
          limit: 500,
          cancelledStatus: false,
          ...(filters.customerId && { customerId: filters.customerId }),
          ...(filters.productId && { productId: filters.productId }),
          ...(filters.startDate && { from: filters.startDate }),
          ...(filters.endDate && { to: filters.endDate }),
        };
        const res = await getCustomerPayments(params);
        if (!cancelled) setPayments(res.data || []);
      } catch {
        if (!cancelled) setPayments([]);
      } finally {
        if (!cancelled) setLoadingPayments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.customerId, filters.productId, filters.startDate, filters.endDate, refreshKey]);

  const remainingByCustomer = useMemo(() => {
    return collectGroups
      .map((g) => {
        const remaining = (g.invoices || []).reduce(
          (s, inv) => s + parseFloat(inv.outstanding || 0),
          0
        );
        return {
          customerId: g.customerId,
          name: g.customerName || g.shopname || `Customer #${g.customerId}`,
          code: g.customerCode || "",
          remaining,
        };
      })
      .filter((r) => r.remaining > 0.01);
  }, [collectGroups]);

  const actualByCustomer = useMemo(() => {
    const map = new Map();
    for (const p of payments) {
      if (p.cancelledStatus) continue;
      const key = p.customerId;
      if (!map.has(key)) {
        map.set(key, {
          customerId: key,
          name: p.customer?.name || p.customer?.shopname || `Customer #${key}`,
          code: p.customer?.code || "",
          actual: 0,
        });
      }
      map.get(key).actual += parseFloat(p.totalAmount || 0);
    }
    return map;
  }, [payments]);

  const rows = useMemo(() => {
    const map = new Map();
    for (const r of remainingByCustomer) {
      map.set(r.customerId, {
        customerId: r.customerId,
        name: r.name,
        code: r.code,
        remaining: r.remaining,
        actual: 0,
      });
    }
    for (const r of actualByCustomer.values()) {
      if (!map.has(r.customerId)) {
        map.set(r.customerId, {
          customerId: r.customerId,
          name: r.name,
          code: r.code,
          remaining: 0,
          actual: 0,
        });
      }
      map.get(r.customerId).actual += r.actual;
    }
    return Array.from(map.values())
      .map((r) => ({
        ...r,
        id: r.customerId,
        target: r.remaining + r.actual,
        balance: r.remaining,
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [remainingByCustomer, actualByCustomer]);

  const loading = loadingCollect || loadingPayments;

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Customer",
        cell: (row) => (
          <div>
            <div className="font-medium truncate">{row.name}</div>
            {row.code ? (
              <div className="text-xs text-muted-foreground">{row.code}</div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "target",
        header: "Target",
        align: "right",
        cell: (row) => <span className="font-mono">{fmt(row.target)}</span>,
      },
      {
        accessorKey: "actual",
        header: "Actual",
        align: "right",
        cell: (row) => (
          <span className="font-mono text-green-600">{fmt(row.actual)}</span>
        ),
      },
      {
        accessorKey: "balance",
        header: "Balance to collect",
        align: "right",
        cell: (row) => (
          <span className="font-mono font-semibold text-violet-600">{fmt(row.balance)}</span>
        ),
      },
    ],
    []
  );

  if (loading && !rows.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Loading collection…</p>;
  }

  if (!loading && !rows.length) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        No collection targets for the selected period.
      </Card>
    );
  }

  return (
    <div className="min-h-0 flex-1 pb-4">
      <Table
        data={rows}
        columns={columns}
        loading={loading}
        emptyMessage="No collection targets for the selected period."
      />
    </div>
  );
}
