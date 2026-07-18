// Backend-supported filters only
export const locationFilters = {
  // Backend query params
  activeStatus: "all", // all/true/false - maps to activeStatus filter
  godownType: "all", // all/STOCK/RX
  // Note: name and description are handled via search params
};

export const defaultLocation = {
  name: "",
  description: "",
  godownType: "STOCK",
  activeStatus: true,
};

// Active status options
export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];

export const godownTypeOptions = [
  { value: "STOCK", label: "Stock Godown" },
  { value: "RX", label: "Rx Godown" },
];

export const godownTypeLabel = (type) => {
  if (type === "STOCK") return "Stock Godown";
  if (type === "RX") return "Rx Godown";
  return "—";
};
