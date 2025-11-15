// Backend-supported filters only
export const lensBrandFilters = {
  // Backend query params
  activeStatus: "all", // all/true/false - maps to activeStatus filter
  // Note: name, description are handled via search params
};

export const defaultLensBrand = {
  name: "",
  description: "",
  activeStatus: true,
};

// Active status options
export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];
