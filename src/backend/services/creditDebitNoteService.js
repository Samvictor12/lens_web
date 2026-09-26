import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';
import { postDebitNote, postCreditNote, postReversingTransaction } from './accountingService.js';

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

/**
 * Customer Credit Note / Debit Note service (M4).
 * CN: applied to an invoice when invoiceId is set; otherwise customer-level pending CN.
 * Reduces outstanding_credit and posts GL. DN increases AR (legacy).
 */
export class CreditDebitNoteService {
  async list({ type, customerId, from, to, page = 1, limit = 20 } = {}) {
    const model = type === 'debit' ? 'debitNote' : 'creditNote';
    const where = {
      ...(customerId && { customerId: parseInt(customerId, 10) }),
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
          customer: { select: { id: true, code: true, name: true } },
          invoice: { select: { id: true, invoiceNo: true } },
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
    const model = type === 'debit' ? 'debitNote' : 'creditNote';
    const note = await prisma[model].findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        customer: true,
        invoice: { select: { id: true, invoiceNo: true, totalAmount: true, paidAmount: true } },
        createdByUser: { select: { id: true, name: true } },
      },
    });
    if (!note) throw new APIError('Note not found', 404, 'NOT_FOUND');
    return note;
  }

  async createCreditNote({ customerId, invoiceId, amount, taxAmount = 0, reason, noteDate }, userId) {
    return this._create('credit', { customerId, invoiceId, amount, taxAmount, reason, noteDate }, userId);
  }

  async createDebitNote({ customerId, invoiceId, amount, taxAmount = 0, reason, noteDate }, userId) {
    throw new APIError(
      'Customer debit notes are disabled. Use Credit Notes only.',
      400,
      'CUSTOMER_DEBIT_NOTE_DISABLED'
    );
  }

  async _create(kind, { customerId, invoiceId, amount, taxAmount, reason, noteDate }, userId) {
    const cid = parseInt(customerId, 10);
    if (!cid) throw new APIError('customerId is required', 400, 'VALIDATION_ERROR');

    const amt = round2(amount);
    if (!amt || amt <= 0) throw new APIError('amount must be greater than zero', 400, 'VALIDATION_ERROR');
    const tax = round2(taxAmount || 0);
    if (tax < 0 || tax > amt) throw new APIError('taxAmount must be between 0 and amount', 400, 'VALIDATION_ERROR');

    const customer = await prisma.customer.findFirst({ where: { id: cid, delete_status: false } });
    if (!customer) throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');

    let invoice = null;
    if (invoiceId) {
      invoice = await prisma.invoice.findFirst({ where: { id: parseInt(invoiceId, 10), deleteStatus: false } });
      if (!invoice) throw new APIError('Invoice not found', 404, 'INVOICE_NOT_FOUND');
      if (invoice.customerId !== cid) {
        throw new APIError('Invoice does not belong to this customer', 400, 'INVOICE_CUSTOMER_MISMATCH');
      }
      if (kind === 'credit' && !['ISSUED', 'PARTIALLY_PAID'].includes(invoice.status)) {
        throw new APIError(
          'Credit note can only be applied to issued or partially paid invoices',
          400,
          'INVALID_INVOICE_STATUS'
        );
      }
    }

    const isCredit = kind === 'credit';
    const model = isCredit ? 'creditNote' : 'debitNote';
    const noteNumber = await generateNoteNumber(model, isCredit ? 'CN' : 'DN');

    return prisma.$transaction(async (tx) => {
      const note = await tx[model].create({
        data: {
          noteNumber,
          customerId: cid,
          invoiceId: invoice?.id || null,
          amount: amt,
          taxAmount: tax,
          reason: reason || null,
          noteDate: noteDate ? new Date(noteDate) : new Date(),
          createdBy: userId,
        },
        include: {
          customer: { select: { id: true, code: true, name: true } },
          invoice: { select: { id: true, invoiceNo: true } },
        },
      });

      if (isCredit) {
        if (invoice) {
          const outstanding = round2(invoice.totalAmount - invoice.paidAmount);
          if (amt > outstanding + 0.01) {
            throw new APIError(
              `Credit note amount exceeds invoice ${invoice.invoiceNo} outstanding (₹${outstanding.toFixed(2)})`,
              400,
              'OVER_ALLOCATION'
            );
          }
          const newPaidAmount = round2(invoice.paidAmount + amt);
          const isFullyPaid = newPaidAmount >= invoice.totalAmount - 0.01;
          const newStatus = isFullyPaid ? 'PAID' : 'PARTIALLY_PAID';
          await tx.invoice.update({
            where: { id: invoice.id },
            data: { paidAmount: newPaidAmount, status: newStatus, updatedBy: userId },
          });
        }

        await tx.customer.update({
          where: { id: cid },
          data: { outstanding_credit: { decrement: Math.round(amt) } },
        });
        await postCreditNote(
          tx,
          { creditNoteId: note.id, noteNumber, amount: amt, taxAmount: tax, customer },
          userId
        );
      } else {
        await tx.customer.update({
          where: { id: cid },
          data: { outstanding_credit: { increment: Math.round(amt) } },
        });
        await postDebitNote(tx, {
          debitNoteId: note.id,
          noteNumber,
          amount: amt,
          taxAmount: tax,
          customer,
        }, userId);
      }

      return note;
    });
  }

  async cancel(type, id, userId) {
    const model = type === 'debit' ? 'debitNote' : 'creditNote';
    const note = await prisma[model].findUnique({ where: { id: parseInt(id, 10) } });
    if (!note) throw new APIError('Note not found', 404, 'NOT_FOUND');
    if (note.status === 'CANCELLED') throw new APIError('Note already cancelled', 400, 'ALREADY_CANCELLED');

    return prisma.$transaction(async (tx) => {
      const isCredit = model === 'creditNote';

      if (isCredit) {
        const postedTxn = await tx.financialTransaction.findFirst({
          where: { referenceType: 'CREDIT_NOTE', referenceId: note.id },
          orderBy: { createdAt: 'asc' },
        });
        if (postedTxn) {
          await postReversingTransaction(tx, postedTxn.id, userId, `Cancel ${note.noteNumber}`);
          await tx.customer.update({
            where: { id: note.customerId },
            data: { outstanding_credit: { increment: Math.round(note.amount) } },
          });
          if (note.invoiceId) {
            const inv = await tx.invoice.findUnique({ where: { id: note.invoiceId } });
            if (inv && inv.deleteStatus === false) {
              const cnAmt = round2(note.amount);
              const newPaid = round2(Math.max(0, inv.paidAmount - cnAmt));
              let newStatus = 'ISSUED';
              if (newPaid >= inv.totalAmount - 0.01) newStatus = 'PAID';
              else if (newPaid > 0.01) newStatus = 'PARTIALLY_PAID';
              await tx.invoice.update({
                where: { id: inv.id },
                data: { paidAmount: newPaid, status: newStatus, updatedBy: userId },
              });
            }
          }
        }
      } else {
        // Debit notes always posted AR — reverse on cancel.
        await tx.customer.update({
          where: { id: note.customerId },
          data: { outstanding_credit: { decrement: Math.round(note.amount) } },
        });
      }

      return tx[model].update({
        where: { id: note.id },
        data: { status: 'CANCELLED', updatedBy: userId },
      });
    });
  }
}

export default new CreditDebitNoteService();
