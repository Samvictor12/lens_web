/** Shared DispatchCopy status colors — used by card grid and table list */
export const DISPATCH_STATUS_CONFIG = {
  PENDING: {
    label: "Ready for Pickup",
    className: "border-amber-300 bg-amber-50 text-amber-800",
    borderClass: "border-l-4 border-l-amber-400",
  },
  IN_TRANSIT: {
    label: "In Transit",
    className: "border-blue-300 bg-blue-50 text-blue-800",
    borderClass: "border-l-4 border-l-blue-400",
  },
  DELIVERED: {
    label: "Delivered",
    className: "border-green-300 bg-green-50 text-green-800",
    borderClass: "border-l-4 border-l-green-400",
  },
  ON_HOLD: {
    label: "On Hold",
    className: "border-red-300 bg-red-50 text-red-800",
    borderClass: "border-l-4 border-l-red-400",
  },
};
