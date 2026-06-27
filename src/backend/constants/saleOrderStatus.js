/**
 * Sale order workflow — statuses, transitions, queue groupings
 */

export const SALE_ORDER_STATUSES = [
  'DRAFT',
  'PO_RAISED',
  'PO_RECEIVED',
  'PO_CANCELLED',
  'PRE_QC',
  'PRE_QC_REJECTED',
  'PRE_QC_SCRAPPED',
  'PRODUCTION_READY',
  'IN_PRODUCTION',
  'ON_HOLD',
  'AWAITING_QUALITY',
  'POST_QC_REJECTED',
  'POST_QC_SCRAPPED',
  'READY_FOR_DISPATCH',
  'DISPATCHED',
  'DELIVERED',
  'INVOICED',
  'COMPLETED',
  'CANCELLED',
];

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
  CANCELLED: 'Cancelled',
};

/** Statuses shown in inventory SO Order Queue */
export const INVENTORY_QUEUE_STATUSES = [
  'DRAFT',
  'PO_RECEIVED',
  'PO_CANCELLED',
  'PRE_QC_REJECTED',
  'POST_QC_REJECTED',
  'PRE_QC_SCRAPPED',
  'POST_QC_SCRAPPED',
];

/** Statuses requiring SO person confirm reset → DRAFT */
export const RESET_ELIGIBLE_STATUSES = [
  'PRE_QC_REJECTED',
  'POST_QC_REJECTED',
  'PRE_QC_SCRAPPED',
  'POST_QC_SCRAPPED',
];

/** Production operator list */
export const PRODUCTION_QUEUE_STATUSES = ['PRODUCTION_READY', 'IN_PRODUCTION', 'ON_HOLD'];

/** Pre-QC operator list */
export const PRE_QC_QUEUE_STATUSES = ['PRE_QC'];

/** Post-QC operator list */
export const POST_QC_QUEUE_STATUSES = ['AWAITING_QUALITY'];

/** Status bar pipeline steps (PO steps filtered client-side if no PO) */
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

/**
 * Allowed transitions: fromStatus -> [toStatus, ...]
 */
export const ALLOWED_TRANSITIONS = {
  DRAFT: ['PO_RAISED', 'PRE_QC', 'CANCELLED'],
  PO_RAISED: ['PO_RECEIVED', 'PO_CANCELLED', 'CANCELLED'],
  PO_RECEIVED: ['PRE_QC'],
  PO_CANCELLED: ['PO_RAISED', 'DRAFT', 'PRE_QC', 'CANCELLED'],
  PRE_QC: ['PRODUCTION_READY', 'PRE_QC_REJECTED', 'PRE_QC_SCRAPPED'],
  PRE_QC_REJECTED: ['DRAFT'],
  PRE_QC_SCRAPPED: ['DRAFT'],
  PRODUCTION_READY: ['IN_PRODUCTION'],
  IN_PRODUCTION: ['ON_HOLD', 'AWAITING_QUALITY'],
  ON_HOLD: ['IN_PRODUCTION', 'AWAITING_QUALITY'],
  AWAITING_QUALITY: ['READY_FOR_DISPATCH', 'POST_QC_REJECTED', 'POST_QC_SCRAPPED'],
  POST_QC_REJECTED: ['DRAFT'],
  POST_QC_SCRAPPED: ['DRAFT'],
  READY_FOR_DISPATCH: ['DISPATCHED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: ['INVOICED'],
  INVOICED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransition(fromStatus, toStatus) {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

export function isSoLocked(order) {
  if (!order) return false;
  if (order.hasLinkedPoEver) return true;
  const lockedFrom = [
    'PO_RAISED',
    'PO_RECEIVED',
    'PO_CANCELLED',
    'PRE_QC',
    'PRE_QC_REJECTED',
    'PRE_QC_SCRAPPED',
    'PRODUCTION_READY',
    'IN_PRODUCTION',
    'ON_HOLD',
    'AWAITING_QUALITY',
    'POST_QC_REJECTED',
    'POST_QC_SCRAPPED',
    'READY_FOR_DISPATCH',
    'DISPATCHED',
    'DELIVERED',
    'INVOICED',
    'COMPLETED',
    'CANCELLED',
  ];
  return lockedFrom.includes(order.status);
}

export function getQueueBadge(status) {
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
