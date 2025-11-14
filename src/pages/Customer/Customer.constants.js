// Backend-supported filters only
export const customerFilters = {
  // Backend query params
  active_status: "all", // all/true/false - maps to active_status filter
  businessCategory_id: null, // number - exact match
  city: "", // string - contains search (case insensitive)
  // Note: name, code, email, phone are handled via search/query params, not filters
};

export const defaultCustomer = {
  customerCode: "",
  name: "",
  shopName: "",
  phone: "",
  alternatePhone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  categoryId: null,
  gstNumber: "",
  creditLimit: "",
  remarks: "",
  activeStatus: true,
};

// Business categories for dropdown
export const businessCategories = [
  { id: 1, name: "Retail" },
  { id: 2, name: "Shop" },
  { id: 3, name: "Hospital" },
  { id: 4, name: "Clinic" },
  { id: 5, name: "Wholesale" },
  { id: 6, name: "Corporate" },
];

// Active status options
export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];
