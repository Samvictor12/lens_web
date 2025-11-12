// Backend-supported filters only
export const departmentFilters = {
  active_status: "all", // all/true/false - maps to active_status filter
};

export const defaultDepartment = {
  department: "",
  activeStatus: true,
};

// Active status options
export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];
