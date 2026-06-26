/** Frontend labels — keep in sync with src/backend/constants/saleOrderStatus.js */

export const STATUS_LABELS = {
  DRAFT: 'Draft',
  PO_RAISED: 'PO Raised',
  PO_RECEIVED: 'PO Received',
  PO_CANCELLED: 'PO Canceled',
  PRE_QC: 'Pre-QC',
  PRE_QC_REJECTED: 'Pre-QC Rejected',
  PRE_QC_SCRAPPED: 'Pre-QC Scrapped',
  PRODUCTION_READY: 'Production Ready',
  IN_PRODUCTION: 'In Production',
  ON_HOLD: 'In Production (On Hold)',
  AWAITING_QUALITY: 'Post-QC',
  POST_QC_REJECTED: 'Post-QC Rejected',
  POST_QC_SCRAPPED: 'Post-QC Scrapped',
  READY_FOR_DISPATCH: 'Dispatch Ready',
  DISPATCHED: 'Dispatched',
  DELIVERED: 'Delivered',
  INVOICED: 'Invoice Generated',
  COMPLETED: 'Completed',
  STOCK_ISSUED: 'Stock Issued',
};

export const STATUS_BAR_STEPS = [
  'DRAFT',
  'PO_RAISED',
  'PO_RECEIVED',
  'PRE_QC',
  'PRODUCTION_READY',
  'IN_PRODUCTION',
  'AWAITING_QUALITY',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'DELIVERED',
  'INVOICED',
  'COMPLETED',
];

export const RESET_ELIGIBLE = [
  'PRE_QC_REJECTED',
  'POST_QC_REJECTED',
  'PRE_QC_SCRAPPED',
  'POST_QC_SCRAPPED',
];

export function queueBadge(status) {
  switch (status) {
    case 'PO_RECEIVED':
      return 'PO received — issue pending';
    case 'PRE_QC_REJECTED':
      return 'Return from Pre-QC';
    case 'POST_QC_REJECTED':
      return 'Return from Post-QC';
    case 'PRE_QC_SCRAPPED':
      return 'Scrap — Pre-QC';
    case 'POST_QC_SCRAPPED':
      return 'Scrap — Post-QC';
    case 'PO_CANCELLED':
      return 'PO canceled';
    default:
      return null;
  }
}
