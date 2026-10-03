import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Unique PO numbers linked on vendor invoice line items (order preserved). */
export function uniquePoNumbersFromInvoiceItems(items = []) {
  const seen = new Set();
  const list = [];
  for (const item of items) {
    const n = item.purchaseOrder?.poNumber;
    if (n && !seen.has(n)) {
      seen.add(n);
      list.push(n);
    }
  }
  return list;
}

export function PoCountCell({ items, className = "text-[11px]" }) {
  const pos = uniquePoNumbersFromInvoiceItems(items);
  if (!pos.length) {
    return <span className={className}>—</span>;
  }

  const label = `${pos.length} PO${pos.length !== 1 ? "s" : ""}`;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`cursor-default underline decoration-dotted underline-offset-2 ${className}`}
          >
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-xs">
          <ul className="list-disc pl-3 space-y-0.5">
            {pos.map((po) => (
              <li key={po}>{po}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
