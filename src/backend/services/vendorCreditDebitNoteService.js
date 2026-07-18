import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { postVendorCreditNote, postVendorDebitNote } from './accountingService.js';

function round2(n) {
  return Math.round(parseFloat(n) * 100) / 100;
}

async function generateNoteNumber(model, prefix) {
  const year = new Date().getFullYear();
  const p = `${prefix}-${year}-`;
  const last = await prisma[model].findFirst({
    where: { noteNumber: { startsWith: p } },
    orderBy: { noteNumber: 'desc' },
  });
  const next = last ? parseInt(last.noteNumber.split('-').pop(), 10) + 1 : 1;
  return `${p}${String(next).padStart(3, '0')}`;
}

/** Vendor Credit Note / Debit Note business logic (M5). Mirrors creditDebitNoteService (M4). */
export class VendorCreditDebitNoteService {
  async list({ type, vendorId, from, to, page = 1, limit = 20 } = {}) {
    const model = type === 'debit' ? 'vendorDebitNote' : 'vendorCreditNote';
    const where = {
      ...(vendorId && { vendorId: parseInt(vendorId, 10) }),
      ...((from || to) && {
        noteDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
        },
      }),
    };
    const [data, total] = await Promise.all([
      prisma[model].findMany({
        where,
        include: {
          vendor: { select: { id: true, code: true, name: true } },
          vendorInvoice: { select: { id: true, invoiceNumber: true } },
          createdByUser: { select: { id: true, name: true } },
        },
        orderBy: { noteDate: 'desc' },
        skip: (parseInt(page, 10) - 1) * parseInt(limit, 10),
        take: parseInt(limit, 10),
      }),
      prisma[model].count({ where }),
    ]);
    return {
      data,
      pagination: { page: parseInt(page, 10), limit: parseInt(limit, 10), total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(type, id) {
    const model = type === 'debit' ? 'vendorDebitNote' : 'vendorCreditNote';
    const note = await prisma[model].findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        vendor: true,
        vendorInvoice: { select: { id: true, invoiceNumber: true, totalAmount: true, paidAmount: true } },
        createdByUser: { select: { id: true, name: true } },
      },
    });
    if (!note) throw new APIError('Note not found', 404, 'NOT_FOUND');
    return note;
  }

  async createCreditNote({ vendorId, vendorInvoiceId, amount, taxAmount = 0, reason, noteDate }, userId) {
    return this._create('credit', { vendorId, vendorInvoiceId, amount, taxAmount, reason, noteDate }, userId);
  }

  async createDebitNote({ vendorId, vendorInvoiceId, amount, taxAmount = 0, reason, noteDate }, userId) {
    return this._create('debit', { vendorId, vendorInvoiceId, amount, taxAmount, reason, noteDate }, userId);
  }

  async _create(kind, { vendorId, vendorInvoiceId, amount, taxAmount, reason, noteDate }, userId) {
    const vid = parseInt(vendorId, 10);
    if (!vid) throw new APIError('vendorId is required', 400, 'VALIDATION_ERROR');

    const amt = round2(amount);
    if (!amt || amt <= 0) throw new APIError('amount must be greater than zero', 400, 'VALIDATION_ERROR');
    const tax = round2(taxAmount || 0);
    if (tax < 0 || tax > amt) throw new APIError('taxAmount must be between 0 and amount', 400, 'VALIDATION_ERROR');

    const vendor = await prisma.vendor.findFirst({ where: { id: vid } });
    if (!vendor) throw new APIError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

    let vendorInvoice = null;
    if (vendorInvoiceId) {
      vendorInvoice = await prisma.vendorInvoice.findFirst({ where: { id: parseInt(vendorInvoiceId, 10), deleteStatus: false } });
      if (!vendorInvoice) throw new APIError('Vendor invoice not found', 404, 'INVOICE_NOT_FOUND');
      if (vendorInvoice.vendorId !== vid) {
        throw new APIError('Invoice does not belong to this vendor', 400, 'INVOICE_VENDOR_MISMATCH');
      }
    }

    const isCredit = kind === 'credit';
    const model = isCredit ? 'vendorCreditNote' : 'vendorDebitNote';
    const noteNumber = await generateNoteNumber(model, isCredit ? 'VCN' : 'VDN');

    return prisma.$transaction(async (tx) => {
      const note = await tx[model].create({
        data: {
          noteNumber,
          vendorId: vid,
          vendorInvoiceId: vendorInvoice?.id || null,
          amount: amt,
          taxAmount: tax,
          reason: reason || null,
          noteDate: noteDate ? new Date(noteDate) : new Date(),
          createdBy: userId,
        },
        include: {
          vendor: { select: { id: true, code: true, name: true } },
          vendorInvoice: { select: { id: true, invoiceNumber: true } },
        },
      });

      if (isCredit) {
        await postVendorCreditNote(tx, { creditNoteId: note.id, noteNumber, amount: amt, taxAmount: tax, vendor }, userId);
      } else {
        await postVendorDebitNote(tx, { debitNoteId: note.id, noteNumber, amount: amt, taxAmount: tax, vendor }, userId);
      }

      return note;
    });
  }

  async cancel(type, id, userId) {
    const model = type === 'debit' ? 'vendorDebitNote' : 'vendorCreditNote';
    const note = await prisma[model].findUnique({ where: { id: parseInt(id, 10) } });
    if (!note) throw new APIError('Note not found', 404, 'NOT_FOUND');
    if (note.status === 'CANCELLED') throw new APIError('Note already cancelled', 400, 'ALREADY_CANCELLED');

    return prisma[model].update({
      where: { id: note.id },
      data: { status: 'CANCELLED', updatedBy: userId },
    });
  }
}

export default new VendorCreditDebitNoteService();
