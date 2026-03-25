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
  exchange_coating_id: null,
  withDiscount: false,
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
  { id: "EXCHANGE_COATING_PRICE", name: "Exchange Coating Price (Use Different Coating's Price)" },
];

export const offerTypeBadgeVariant = {
  VALUE: "default",
  PERCENTAGE: "secondary",
  EXCHANGE_PRODUCT: "outline",
  EXCHANGE_COATING_PRICE: "warning",
};

export const offerTypeLabel = {
  VALUE: "Value",
  PERCENTAGE: "Percentage",
  EXCHANGE_PRODUCT: "Exchange",
  EXCHANGE_COATING_PRICE: "Exchange Coating",
};
