import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FormSelect } from "@/components/ui/form-select";
import { fmt } from "./Billing.constants";

export const AWAITING_GROUP_OPTIONS = [
  { id: null, name: "No Grouping" },
  { id: "customer", name: "Customer" },
  { id: "orderDate", name: "Order Date" },
  { id: "amount", name: "Bill Amount" },
];

export const INVOICE_GROUP_OPTIONS = [
  { id: null, name: "No Grouping" },
  { id: "customer", name: "Customer" },
  { id: "status", name: "Status" },
  { id: "dueDate", name: "Due Date" },
  { id: "amount", name: "Bill Amount" },
];

const AMOUNT_TIERS = [
  { key: "high", label: "High (≥ ₹10,000)", min: 10000, max: Infinity },
  { key: "medium", label: "Medium (₹2,000 – ₹9,999)", min: 2000, max: 10000 },
  { key: "low", label: "Low (< ₹2,000)", min: 0, max: 2000 },
];

function amountTierLabel(amount) {
  const n = Number(amount) || 0;
  if (n >= 10000) return AMOUNT_TIERS[0].label;
  if (n >= 2000) return AMOUNT_TIERS[1].label;
  return AMOUNT_TIERS[2].label;
}

function formatDateKey(value) {
  if (!value) return "No date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "No date";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Build groups for awaiting-invoice orders.
 * @param {Array} orders
 * @param {'customer'|'orderDate'|'amount'|null} groupBy
 * @param {(o: any) => number} getAmount
 */
export function groupAwaitingOrders(orders, groupBy, getAmount) {
  if (!groupBy) return [];

  const map = new Map();

  for (const order of orders) {
    let key;
    let label;
    let sort = 0;

    if (groupBy === "customer") {
      key = String(order.customer?.id ?? "unknown");
      label = order.customer?.name || "Unknown Customer";
      sort = label.toLowerCase();
    } else if (groupBy === "orderDate") {
      const raw = order.orderDate ? new Date(order.orderDate) : null;
      key = raw && !Number.isNaN(raw.getTime())
        ? raw.toISOString().slice(0, 10)
        : "none";
      label = formatDateKey(order.orderDate);
      sort = raw ? -raw.getTime() : 0;
    } else if (groupBy === "amount") {
      const amt = getAmount(order);
      label = amountTierLabel(amt);
      key = label;
      sort = amt >= 10000 ? 0 : amt >= 2000 ? 1 : 2;
    } else {
      continue;
    }

    if (!map.has(key)) {
      map.set(key, { key, label, sort, items: [], total: 0 });
    }
    const g = map.get(key);
    g.items.push(order);
    g.total += getAmount(order) || 0;
  }

  return [...map.values()].sort((a, b) => {
    if (typeof a.sort === "string" && typeof b.sort === "string") {
      return a.sort.localeCompare(b.sort);
    }
    return a.sort - b.sort;
  });
}

/**
 * Build groups for invoices.
 */
export function groupInvoices(invoices, groupBy) {
  if (!groupBy) return [];

  const map = new Map();

  for (const inv of invoices) {
    let key;
    let label;
    let sort = 0;

    if (groupBy === "customer") {
      key = String(inv.customerId ?? inv.customer?.id ?? "unknown");
      label = inv.customer?.name || "Unknown Customer";
      sort = label.toLowerCase();
    } else if (groupBy === "status") {
      key = inv.status || "UNKNOWN";
      label = inv.status || "Unknown";
      sort = label;
    } else if (groupBy === "dueDate") {
      const raw = inv.dueDate ? new Date(inv.dueDate) : null;
      key = raw && !Number.isNaN(raw.getTime())
        ? raw.toISOString().slice(0, 10)
        : "none";
      label = formatDateKey(inv.dueDate);
      sort = raw ? -raw.getTime() : 0;
    } else if (groupBy === "amount") {
      const amt = Number(inv.totalAmount) || 0;
      label = amountTierLabel(amt);
      key = label;
      sort = amt >= 10000 ? 0 : amt >= 2000 ? 1 : 2;
    } else {
      continue;
    }

    if (!map.has(key)) {
      map.set(key, { key, label, sort, items: [], total: 0 });
    }
    const g = map.get(key);
    g.items.push(inv);
    g.total += Number(inv.totalAmount) || 0;
  }

  return [...map.values()].sort((a, b) => {
    if (typeof a.sort === "string" && typeof b.sort === "string") {
      return a.sort.localeCompare(b.sort);
    }
    return a.sort - b.sort;
  });
}

/** Group-by dropdown — same placement pattern as Lens Product list */
export function BillingGroupBySelect({ value, onChange, options, className = "" }) {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        Group by:
      </span>
      <div className="w-40">
        <FormSelect
          name="groupBy"
          options={options}
          value={value}
          onChange={(v) => onChange(v ?? null)}
          placeholder="None"
          isSearchable={false}
          isClearable={false}
        />
      </div>
    </div>
  );
}

/** Collapsible group cards for billing lists */
export function BillingGroupedList({ groups, renderItems, emptyMessage = "No groups found" }) {
  const [expanded, setExpanded] = useState(() => ({}));

  const toggle = (key) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  if (!groups.length) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isOpen = !!expanded[group.key];
        return (
          <Card key={group.key} className="overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
              onClick={() => toggle(group.key)}
            >
              <div className="flex items-center gap-2 min-w-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className="text-sm font-semibold truncate">{group.label}</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
                  {group.items.length}
                </Badge>
              </div>
              <span className="text-sm font-semibold shrink-0">{fmt(group.total)}</span>
            </button>
            {isOpen && (
              <div className="border-t p-2">
                {renderItems(group.items, group)}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
