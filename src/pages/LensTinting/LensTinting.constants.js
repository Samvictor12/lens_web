// Backend-supported filters only
export const lensTintingFilters = {
  // Backend query params
  activeStatus: "all", // all/true/false - maps to activeStatus filter
  // Note: name, short_name, description are handled via search params
};

export const defaultLensTinting = {
  name: "",
  short_name: "",
  description: "",
  tinting_price: 0,
  activeStatus: true,
};

// Active status options
export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];
