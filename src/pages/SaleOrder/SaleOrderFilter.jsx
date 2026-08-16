import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { orderStatusOptions } from "./SaleOrder.constants";

const ALL = "__all__";

function CompactSelect({
  value,
  onChange,
  placeholder,
  options,
  className = "min-w-[88px] flex-1",
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <Select
        value={value == null || value === "" ? ALL : String(value)}
        onValueChange={(v) => onChange(v === ALL ? null : v)}
      >
        <SelectTrigger className="!h-8 !w-full text-xs px-2">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL} className="text-xs">
            {placeholder}
          </SelectItem>
          {options.map((opt) => (
            <SelectItem
              key={String(opt.value)}
              value={String(opt.value)}
              className="text-xs"
            >
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Compact filters that share row width (grow/shrink, no inner scroll).
 */
export default function SaleOrderFilter({
  filters,
  onChange,
  customers = [],
  lensTypes = [],
  categories = [],
  coatings = [],
}) {
  const set = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <>
      <Input
        type="date"
        value={filters.startDate || ""}
        onChange={(e) => set("startDate", e.target.value || null)}
        className="!h-8 min-w-[110px] max-w-[140px] flex-[0.9] text-xs px-1.5"
        title="Start date"
      />
      <Input
        type="date"
        value={filters.endDate || ""}
        onChange={(e) => set("endDate", e.target.value || null)}
        className="!h-8 min-w-[110px] max-w-[140px] flex-[0.9] text-xs px-1.5"
        title="End date"
      />
      <CompactSelect
        placeholder="Status"
        value={filters.status}
        onChange={(v) => set("status", v)}
        options={orderStatusOptions.map((opt) => ({
          value: opt.value,
          label: opt.label,
        }))}
      />
      <CompactSelect
        placeholder="Lens Type"
        value={filters.Type_id}
        onChange={(v) => set("Type_id", v ? Number(v) : null)}
        className="min-w-[72px] max-w-[100px] flex-[0.65]"
        options={lensTypes.map((t) => ({
          value: t.id,
          label: t.name || t.label,
        }))}
      />
      <CompactSelect
        placeholder="Category"
        value={filters.category_id}
        onChange={(v) => set("category_id", v ? Number(v) : null)}
        options={categories.map((c) => ({
          value: c.id,
          label: c.name || c.label,
        }))}
      />
      <CompactSelect
        placeholder="Coating"
        value={filters.coating_id}
        onChange={(v) => set("coating_id", v ? Number(v) : null)}
        options={coatings.map((c) => ({
          value: c.id,
          label: c.name || c.label,
        }))}
      />
      <CompactSelect
        placeholder="Customer"
        value={filters.customerId}
        onChange={(v) => set("customerId", v ? Number(v) : null)}
        className="min-w-[100px] flex-[1.2]"
        options={customers.map((c) => ({
          value: c.id,
          label: c.name,
        }))}
      />
      <CompactSelect
        placeholder="Urgent"
        value={
          filters.urgentOrder === true
            ? "true"
            : filters.urgentOrder === false
              ? "false"
              : null
        }
        onChange={(v) =>
          set("urgentOrder", v === "true" ? true : v === "false" ? false : null)
        }
        className="min-w-[72px] flex-[0.7]"
        options={[
          { value: "true", label: "Yes" },
          { value: "false", label: "No" },
        ]}
      />
    </>
  );
}
