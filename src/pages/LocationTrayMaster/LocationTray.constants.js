// Backend-supported filters only
export const locationTrayFilters = {
  activeStatus: "all",
  location_id: null,
};

export const defaultLocationTray = {
  name: "",
  description: "",
  activeStatus: true,
};

export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];
