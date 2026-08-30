import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { getCustomerPayments } from "@/services/customerPayment";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

/**
 * Collection tab — customer-wise totals for the shared filter month.
 */
export default function CollectionTab({ filters, refreshKey = 0 }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
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
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.customerId, filters.startDate, filters.endDate, refreshKey]);

  const rows = useMemo(() => {
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

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Loading collection…</p>;
  }

  if (!rows.length) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No collections in the selected period.
      </Card>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 pb-4">
      {rows.map((r) => (
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
  );
}
