// Backend-supported filters only
export const trayFilters = {
  // Backend query params
  activeStatus: "all", // all/true/false - maps to activeStatus filter
  location_id: null, // Filter by location
  // Note: name, tray_code, description are handled via search params
};

export const defaultTray = {
  name: "",
  trayCode: "",
  description: "",
  capacity: 0,
  locationId: null,
  activeStatus: true,
};

// Active status options
export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];
