// Backend-supported filters only
export const locationFilters = {
  // Backend query params
  activeStatus: "all", // all/true/false - maps to activeStatus filter
  // Note: name, location_code, description are handled via search params
};

export const defaultLocation = {
  name: "",
  locationCode: "",
  description: "",
  activeStatus: true,
};

// Active status options
export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];
