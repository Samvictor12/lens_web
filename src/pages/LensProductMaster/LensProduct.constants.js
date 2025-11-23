// Backend-supported filters
export const lensProductFilters = {
  activeStatus: "all", // all/active/inactive
  brand_id: null,
  category_id: null,
  material_id: null,
  type_id: null,
};

export const defaultLensProduct = {
  productCode: "",
  lensName: "",
  brandId: null,
  categoryId: null,
  materialId: null,
  typeId: null,
  sphereMin: "",
  sphereMax: "",
  sphereExtraCharge: 0,
  cylinderMin: "",
  cylinderMax: "",
  cylinderExtraCharge: 0,
  addMin: "",
  addMax: "",
  rangeText: "",
  prices: [],
  activeStatus: "active",
};

// Default price row structure
export const defaultPriceRow = {
  coatingId: null,
  price: "",
};

// Active status options
export const activeStatusOptions = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// Filter display options
export const filterOptions = {
  activeStatus: activeStatusOptions,
};
