export const customerFilters = {
  status: "all",
  minCreditLimit: "",
  maxCreditLimit: "",
  minOutstanding: "",
  maxOutstanding: "",
  hasEmail: "all",
  hasGST: "all",
};

export const defaultCustomer = {
  customerCode: "",
  name: "",
  shopName: "",
  phone: "",
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
