// Backend-supported filters only
export const lensOffersFilters = {
  activeStatus: "all", // all/true/false
  offerType: "all",    // all/VALUE/PERCENTAGE/EXCHANGE_PRODUCT
};

export const defaultLensOffer = {
  offerName: "",
  description: "",
  offerType: "VALUE",
  discountValue: "",
  discountPercentage: "",
  offerPrice: "",
  lens_id: null,
  coating_id: null,
  startDate: "",
  endDate: "",
  activeStatus: true,
};

export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];

export const offerTypeOptions = [
  { id: "VALUE", name: "Value (Fixed Amount Discount)" },
  { id: "PERCENTAGE", name: "Percentage (% Discount)" },
  { id: "EXCHANGE_PRODUCT", name: "Exchange Product (Fixed Offer Price)" },
];

export const offerTypeBadgeVariant = {
  VALUE: "default",
  PERCENTAGE: "secondary",
  EXCHANGE_PRODUCT: "outline",
};

export const offerTypeLabel = {
  VALUE: "Value",
  PERCENTAGE: "Percentage",
  EXCHANGE_PRODUCT: "Exchange",
};
