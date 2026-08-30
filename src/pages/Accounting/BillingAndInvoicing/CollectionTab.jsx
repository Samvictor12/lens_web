import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { getCustomerPayments, getOutstandingInvoices } from "@/services/customerPayment";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

/**
 * Collection tab — per-customer balance to collect (target) and receipts received in period.
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
          ...(filters.customerId && { customerId: filters.customerId }),
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
  }, [filters.customerId, filters.startDate, filters.endDate, refreshKey]);

  const balanceRows = useMemo(() => {
    return collectGroups
      .map((g) => {
        const total = (g.invoices || []).reduce(
          (s, inv) => s + parseFloat(inv.outstanding || 0),
          0
        );
        return {
          customerId: g.customerId,
          name: g.customerName || g.shopname || `Customer #${g.customerId}`,
          code: g.customerCode || "",
          total,
          count: (g.invoices || []).length,
        };
      })
      .filter((r) => r.total > 0.01)
      .sort((a, b) => b.total - a.total);
  }, [collectGroups]);

  const receiptRows = useMemo(() => {
    const map = new Map();
    for (const p of payments) {
      if (p.cancelledStatus) continue;
      const key = p.customerId;
      if (!map.has(key)) {
        map.set(key, {
          customerId: key,
          name: p.customer?.name || p.customer?.shopname || `Customer #${key}`,
          code: p.customer?.code || "",
          total: 0,
          count: 0,
        });
      }
      const row = map.get(key);
      row.total += parseFloat(p.totalAmount || 0);
      row.count += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [payments]);

  const loading = loadingCollect || loadingPayments;

  if (loading && !balanceRows.length && !receiptRows.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Loading collection…</p>;
  }

  return (
    <div className="space-y-6 pb-4">
      <section>
        <h3 className="text-sm font-semibold mb-2">Balance to Collect</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Cumulative collectible balance per customer (invoices due on or before today or filter end
          date).
        </p>
        {loadingCollect ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading balances…</p>
        ) : !balanceRows.length ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No balance to collect for the selected filters.
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {balanceRows.map((r) => (
              <Card key={r.customerId} className="p-3">
                <div className="font-medium text-sm truncate">{r.name}</div>
                {r.code && (
                  <div className="text-xs text-muted-foreground">{r.code}</div>
                )}
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-violet-600">{fmt(r.total)}</span>
                  <span className="text-xs text-muted-foreground">{r.count} invoice(s)</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">Collections Received</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Payment receipts recorded in the selected period.
        </p>
        {loadingPayments ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading receipts…</p>
        ) : !receiptRows.length ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No collections in the selected period.
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {receiptRows.map((r) => (
              <Card key={r.customerId} className="p-3">
                <div className="font-medium text-sm truncate">{r.name}</div>
                {r.code && (
                  <div className="text-xs text-muted-foreground">{r.code}</div>
                )}
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-green-600">{fmt(r.total)}</span>
                  <span className="text-xs text-muted-foreground">{r.count} receipt(s)</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
