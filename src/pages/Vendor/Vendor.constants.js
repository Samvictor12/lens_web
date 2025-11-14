// Backend-supported filters only
export const vendorFilters = {
  // Backend query params
  active_status: "all", // all/true/false - maps to active_status filter
  category: "", // string - contains search (case insensitive)
  city: "", // string - contains search (case insensitive)
};

export const defaultVendor = {
  vendorCode: "",
  name: "",
  shopName: "",
  phone: "",
  alternatephone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  category: "",
  gstNumber: "",
  remarks: "",
  activeStatus: true,
};

// Common vendor categories
export const vendorCategories = [
  "Lens Manufacturer",
  "Frame Supplier",
  "Equipment Supplier",
  "Contact Lens Supplier",
  "Packaging Supplier",
  "Service Provider",
  "Wholesale Distributor",
  "Other",
];

// Active status options
export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];
