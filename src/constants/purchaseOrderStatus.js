/** PO pipeline stages — keep in sync with prisma POStatus enum. */

export const PO_STAGE_LABELS = {
  DRAFT: 'Pending',
  PO_PARTIAL_RECEIVED: 'Partial Received',
  RECEIVED: 'Full Received',
  INVOICE_RECEIVED: 'Full Received',
  PAID: 'Paid',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

/** Visible pipeline steps (no partial-paid — payment jumps to Paid when complete). */
export const PO_STAGE_STEPS = ['DRAFT', 'PO_PARTIAL_RECEIVED', 'RECEIVED', 'PAID'];

/** Map DB status to pipeline step key for the status bar. */
export function poPipelineStep(status) {
  if (status === 'PAID') return 'PAID';
  if (status === 'PO_PARTIAL_RECEIVED') return 'PO_PARTIAL_RECEIVED';
  if (['RECEIVED', 'INVOICE_RECEIVED', 'CLOSED'].includes(status)) return 'RECEIVED';
  if (status === 'DRAFT') return 'DRAFT';
  return status;
}

export function poStageIndex(status) {
  const step = poPipelineStep(status);
  const idx = PO_STAGE_STEPS.indexOf(step);
  return idx >= 0 ? idx : 0;
}

export function getPoStageLabel(status) {
  return PO_STAGE_LABELS[status] || PO_STAGE_LABELS[poPipelineStep(status)] || status || '';
}
