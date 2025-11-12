// Backend-supported filters only
export const businessCategoryFilters = {
  active_status: "all", // all/true/false - maps to active_status filter
};

export const defaultBusinessCategory = {
  name: "",
  activeStatus: true,
};

// Active status options
export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];
