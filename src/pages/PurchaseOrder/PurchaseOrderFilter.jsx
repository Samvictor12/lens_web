import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getVendorDropdown } from "@/services/vendor";
import {
  statusFilterOptions,
  dateTypeFilterOptions,
  DATE_TYPE_ALL,
} from "./PurchaseOrder.constants";

const ALL = "__all__";

function CompactSelect({
  value,
  onChange,
  placeholder,
  options,
  className = "min-w-[88px] flex-1",
  includePlaceholder = true,
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
          {includePlaceholder && (
            <SelectItem value={ALL} className="text-xs">
              {placeholder}
            </SelectItem>
          )}
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
 * Compact filters that share row width (same design as Sale Orders).
 */
export default function PurchaseOrderFilter({
  filters,
  onChange,
  orderType,
  onOrderTypeChange,
}) {
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await getVendorDropdown();
        if (response.success) {
          setVendors(response.data || []);
        }
      } catch (error) {
        console.error("Error fetching vendors:", error);
      }
    };
    fetchVendors();
  }, []);

  const set = (key, value) => onChange({ ...filters, [key]: value });

  const dateInputClass =
    "!h-8 min-w-[110px] max-w-[140px] flex-[0.9] text-xs px-1.5";

  return (
    <>
      <Input
        type="date"
        value={filters.start_date || ""}
        onChange={(e) => set("start_date", e.target.value || "")}
        className={dateInputClass}
        title="From date"
      />
      <Input
        type="date"
        value={filters.end_date || ""}
        onChange={(e) => set("end_date", e.target.value || "")}
        className={dateInputClass}
        title="To date"
      />
      <CompactSelect
        placeholder="Date type"
        value={filters.date_type || DATE_TYPE_ALL}
        onChange={(v) => set("date_type", v || DATE_TYPE_ALL)}
        includePlaceholder={false}
        className="min-w-[120px] flex-1"
        options={dateTypeFilterOptions}
      />
      <CompactSelect
        placeholder="Status"
        value={filters.status || "all"}
        onChange={(v) => set("status", v || "all")}
        includePlaceholder={false}
        className="min-w-[110px] flex-1"
        options={statusFilterOptions}
      />
      <CompactSelect
        placeholder="Vendor"
        value={filters.vendor_id}
        onChange={(v) => set("vendor_id", v ? Number(v) : null)}
        className="min-w-[100px] flex-[1.2]"
        options={vendors.map((v) => ({
          value: v.id,
          label: v.name || v.label,
        }))}
      />
      <CompactSelect
        placeholder="Type"
        value={orderType && orderType !== "all" ? orderType : null}
        onChange={(v) => onOrderTypeChange(v || "all")}
        className="min-w-[80px] flex-[0.7]"
        options={[
          { value: "Single", label: "Single" },
          { value: "Bulk", label: "Bulk" },
        ]}
      />
    </>
  );
}
