export const invoiceDetailPath = (invoiceId) =>
  `/billing?invoiceId=${invoiceId}&openDetail=1`;

export const purchaseOrderDetailPath = (poId) =>
  `/masters/purchase-orders/view/${poId}`;
