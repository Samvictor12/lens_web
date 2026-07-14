import { Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStatusColor, formatCurrency, formatDate } from "./Inventory.constants";

function hasSpecValue(value) {
  return value !== null && value !== undefined && value !== "";
}

/** Compact power-range text after product name (SPH / CYL / ADD + related). */
export function formatItemPowerRange(item) {
  // Prefer flat sph/cyl/add when present (grouped list / pivot-style rows)
  const flat = [
    ["SPH", item?.sph ?? item?.spherical],
    ["CYL", item?.cyl ?? item?.cylindrical],
    ["ADD", item?.add],
  ]
    .filter(([, v]) => hasSpecValue(v))
    .map(([lbl, v]) => `${lbl} ${v}`);
  if (flat.length) return flat.join(" · ");

  const parts = [];
  const pushEye = (label, prefix) => {
    const fields = [
      ["SPH", `${prefix}Spherical`],
      ["CYL", `${prefix}Cylindrical`],
      ["AXIS", `${prefix}Axis`],
      ["ADD", `${prefix}Add`],
      ["DIA", `${prefix}Dia`],
    ];
    const eyeParts = fields
      .map(([lbl, key]) => (hasSpecValue(item?.[key]) ? `${lbl} ${item[key]}` : null))
      .filter(Boolean);
    if (eyeParts.length) parts.push(`${label}: ${eyeParts.join(" · ")}`);
  };
  pushEye("R", "right");
  pushEye("L", "left");
  return parts.join(" | ");
}

/**
 * Custom hook that returns table column configurations for the inventory item list.
 * Mirrors the pattern of usePurchaseOrderColumns.
 *
 * @param {Function} onView   - Called with the full item object when View is clicked
 * @param {Function} onEdit   - Called with the full item object when Edit is clicked
 * @param {Function} onDelete - Called with the full item object when Delete is clicked
 */
export const useInventoryColumns = (onView, onEdit, onDelete) => {
  return [
    {
      accessorKey: "id",
      header: "ID",
      sortable: true,
      cell: (item) => (
        <span className="text-xs font-medium text-muted-foreground">#{item.id}</span>
      ),
    },
    {
      accessorKey: "batchNo",
      header: "Batch No",
      sortable: true,
      cell: (item) => (
        <span className="text-xs font-mono">{item.batchNo || "-"}</span>
      ),
    },
    {
      accessorKey: "lensProduct",
      header: "Lens Product",
      sortable: false,
      cell: (item) => {
        const powerRange = formatItemPowerRange(item);
        return (
          <div>
            <div className="text-xs font-medium">
              {item.lensProduct?.lens_name || "-"}
              {powerRange ? (
                <span className="font-normal text-muted-foreground ml-1.5 font-mono">
                  {powerRange}
                </span>
              ) : null}
            </div>
            {item.category?.name && (
              <div className="text-xs text-muted-foreground">{item.category.name}</div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "location",
      header: "Location / Tray",
      sortable: false,
      cell: (item) => (
        <span className="text-xs">
          {item.location?.name || "-"}
          {item.tray?.name ? ` / ${item.tray.name}` : ""}
        </span>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Qty",
      sortable: true,
      cell: (item) => (
        <span className="text-xs font-semibold">{item.quantity}</span>
      ),
    },
    {
      accessorKey: "costPrice",
      header: "Cost Price",
      sortable: true,
      cell: (item) => (
        <span className="text-xs">{formatCurrency(item.costPrice)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      sortable: true,
      cell: (item) => (
        <Badge className={`${getStatusColor(item.status)} text-xs`}>
          {item.status}
        </Badge>
      ),
    },
    {
      accessorKey: "inwardDate",
      header: "Inward Date",
      sortable: true,
      cell: (item) => (
        <span className="text-xs">{formatDate(item.inwardDate)}</span>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onView(item)}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(item)}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
