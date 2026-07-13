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
  vehicleNumber: "",
  bloodgroup: null,
  address: "",
  city: "",
  state: "",
  pincode: "",
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

// Active status options
export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];
