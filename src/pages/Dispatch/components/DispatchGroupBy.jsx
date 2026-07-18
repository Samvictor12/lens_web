import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { FormSelect } from "@/components/ui/form-select";

export const DISPATCH_GROUP_OPTIONS = [
  { value: "none", label: "None" },
  { value: "customer", label: "Customer" },
  { value: "date", label: "Delivery Date" },
  { value: "customerDate", label: "Customer and Date" },
];

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

function dateIsoKey(value) {
  if (!value) return "none";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "none";
  return d.toISOString().slice(0, 10);
}

function customerLabel(dispatch) {
  return (
    dispatch.customer?.shopname ||
    dispatch.customer?.name ||
    "Unknown Customer"
  );
}

function sortGroups(groups) {
  return [...groups].sort((a, b) => {
    if (typeof a.sort === "string" && typeof b.sort === "string") {
      return a.sort.localeCompare(b.sort);
    }
    return a.sort - b.sort;
  });
}

function groupByCustomer(dispatches) {
  const map = new Map();
  for (const d of dispatches) {
    const key = String(d.customerId ?? d.customer?.id ?? "unknown");
    const label = customerLabel(d);
    if (!map.has(key)) {
      map.set(key, { key, label, sort: label.toLowerCase(), items: [] });
    }
    map.get(key).items.push(d);
  }
  return sortGroups([...map.values()]);
}

function groupByDate(dispatches) {
  const map = new Map();
  for (const d of dispatches) {
    const key = dateIsoKey(d.expectedDeliveryDate);
    const label = formatDateKey(d.expectedDeliveryDate);
    const raw = d.expectedDeliveryDate ? new Date(d.expectedDeliveryDate) : null;
    const sort = raw && !Number.isNaN(raw.getTime()) ? -raw.getTime() : 0;
    if (!map.has(key)) {
      map.set(key, { key, label, sort, items: [] });
    }
    map.get(key).items.push(d);
  }
  return sortGroups([...map.values()]);
}

/**
 * Flat groups for customer or date mode.
 * Nested groups for customerDate: { key, label, sort, children: [{ key, label, sort, items }] }
 */
export function groupDispatches(dispatches, groupBy) {
  if (!groupBy || groupBy === "none") return [];

  if (groupBy === "customer") return groupByCustomer(dispatches);
  if (groupBy === "date") return groupByDate(dispatches);

  if (groupBy === "customerDate") {
    const byCustomer = groupByCustomer(dispatches);
    return byCustomer.map((customerGroup) => ({
      key: customerGroup.key,
      label: customerGroup.label,
      sort: customerGroup.sort,
      nested: true,
      children: groupByDate(customerGroup.items),
      count: customerGroup.items.length,
    }));
  }

  return [];
}

export function DispatchGroupBySelect({ value, onChange, className = "" }) {
  return (
    <div className={`flex items-center gap-2 shrink-0 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap hidden sm:inline">
        Group by:
      </span>
      <div className="w-44">
        <FormSelect
          name="dispatchGroupBy"
          options={DISPATCH_GROUP_OPTIONS}
          value={value}
          onChange={(v) => onChange(v || "none")}
          placeholder="None"
          isSearchable={false}
          isClearable={false}
        />
      </div>
    </div>
  );
}

function GroupHeader({ label, count, isOpen, onToggle }) {
  return (
    <button
      type="button"
      className="w-full flex items-center justify-between gap-3 px-3 py-2.5 bg-muted/40 hover:bg-muted/70 transition-colors text-left"
      onClick={onToggle}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <span className="text-sm font-semibold truncate">{label}</span>
        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 shrink-0">
          {count}
        </Badge>
      </div>
    </button>
  );
}

/** Collapsible group cards — supports flat and nested (customer → date) */
export function DispatchGroupedList({ groups, renderItems, emptyMessage = "No groups found" }) {
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
        const count = group.nested
          ? group.count ?? group.children?.reduce((s, c) => s + c.items.length, 0)
          : group.items.length;

        return (
          <Card key={group.key} className="overflow-hidden">
            <GroupHeader
              label={group.label}
              count={count}
              isOpen={isOpen}
              onToggle={() => toggle(group.key)}
            />
            {isOpen && (
              <div className="border-t p-2 space-y-2">
                {group.nested
                  ? (group.children || []).map((child) => {
                      const childKey = `${group.key}::${child.key}`;
                      const childOpen = !!expanded[childKey];
                      return (
                        <Card key={childKey} className="overflow-hidden border-muted">
                          <GroupHeader
                            label={child.label}
                            count={child.items.length}
                            isOpen={childOpen}
                            onToggle={() => toggle(childKey)}
                          />
                          {childOpen && (
                            <div className="border-t p-2 space-y-2">
                              {renderItems(child.items, child)}
                            </div>
                          )}
                        </Card>
                      );
                    })
                  : renderItems(group.items, group)}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
