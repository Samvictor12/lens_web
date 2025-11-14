// Backend-supported filters only
export const userFilters = {
  active_status: "all", // all/true/false - maps to active_status filter
  department_id: null, // number - exact match for department filter
  role_id: null, // number - exact match for role filter
};

export const defaultUser = {
  name: "",
  usercode: "", // Auto-generated
  email: "",
  phonenumber: "",
  alternatenumber: "",
  bloodgroup: null,
  address: "",
  city: "",
  state: "",
  pincode: "",
  roleId: null,
  department_id: null,
  salary: "",
  activeStatus: true,
};

// Blood group options
export const bloodGroupOptions = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A-" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B-" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB-" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O-" },
];

// Dummy role options (not connected to API yet)
export const roleOptions = [
  { id: 1, name: "Admin" },
  { id: 2, name: "Sales" },
  { id: 3, name: "Inventory" },
  { id: 4, name: "Accounts" },
];

// Active status options
export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];
