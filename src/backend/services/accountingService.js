import prisma from '../config/prisma.js';
import { APIError } from '../middleware/errorHandler.js';

// ── Number generators ────────────────────────────────────────────────────────

async function generateTransactionNumber() {
  const year = new Date().getFullYear();
  const prefix = `TXN-${year}-`;
  const last = await prisma.financialTransaction.findFirst({
    where: { transactionNumber: { startsWith: prefix } },
    orderBy: { transactionNumber: 'desc' },
  });
  const next = last ? parseInt(last.transactionNumber.split('-').pop()) + 1 : 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

export async function generateVoucherNumber() {
  const year = new Date().getFullYear();
  const prefix = `VPV-${year}-`;
  const last = await prisma.vendorPaymentVoucher.findFirst({
    where: { voucherNumber: { startsWith: prefix } },
    orderBy: { voucherNumber: 'desc' },
  });
  const next = last ? parseInt(last.voucherNumber.split('-').pop()) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

export async function generateReceiptNumber() {
  const year = new Date().getFullYear();
  const prefix = `CRV-${year}-`;
  const last = await prisma.customerPaymentVoucher.findFirst({
    where: { receiptNumber: { startsWith: prefix } },
    orderBy: { receiptNumber: 'desc' },
  });
  const next = last ? parseInt(last.receiptNumber.split('-').pop()) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

export async function generateExpenseNumber() {
  const year = new Date().getFullYear();
  const prefix = `EXP-${year}-`;
  const last = await prisma.expense.findFirst({
    where: { expenseNumber: { startsWith: prefix } },
    orderBy: { expenseNumber: 'desc' },
  });
  const next = last ? parseInt(last.expenseNumber.split('-').pop()) + 1 : 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

// ── System ledger lookup by code ─────────────────────────────────────────────

async function getLedger(tx, code) {
  const ledger = await tx.ledger.findFirst({
    where: { ledgerCode: code, delete_status: false },
  });
  if (!ledger) throw new APIError(`System ledger ${code} not found. Run seed script.`, 500, 'LEDGER_NOT_FOUND');
  return ledger;
}

// ── Vendor/customer-owned ledger lookup ──────────────────────────────────────

async function getOwnedLedger(tx, owner, label) {
  // owner = vendor or customer row (must include ledgerId)
  if (!owner.ledgerId) {
    throw new APIError(
      `${label} ${owner.code || owner.id} has no ledger. Run backfill-vendor-customer-ledgers.js.`,
      500,
      'LEDGER_NOT_FOUND'
    );
  }
  const ledger = await tx.ledger.findUnique({ where: { id: owner.ledgerId } });
  if (!ledger) throw new APIError(`Ledger id ${owner.ledgerId} not found for ${label} ${owner.code || owner.id}`, 500, 'LEDGER_NOT_FOUND');
  return ledger;
}

// ── Balance calculation (double-entry rules) ─────────────────────────────────

function calculateNewBalance(ledgerType, currentBalance, entryType, amount) {
  const cur = parseFloat(currentBalance);
  const amt = parseFloat(amount);
  if (entryType === 'DEBIT') {
    return (ledgerType === 'ASSET' || ledgerType === 'EXPENSE') ? cur + amt : cur - amt;
  } else {
    return (ledgerType === 'LIABILITY' || ledgerType === 'INCOME' || ledgerType === 'EQUITY') ? cur + amt : cur - amt;
  }
}

// ── Core transaction poster ──────────────────────────────────────────────────

/**
 * Post a balanced double-entry financial transaction.
 * entries: [{ ledgerId, entryType: 'DEBIT'|'CREDIT', amount, description? }]
 * Must be called inside or outside an existing Prisma tx.
 */
export async function postTransaction(tx, { transactionType, referenceType, referenceId, referenceNumber, description, transactionDate, notes }, entries, userId) {
  // Validate Dr = Cr
  let totalDr = 0, totalCr = 0;
  for (const e of entries) {
    if (e.entryType === 'DEBIT') totalDr += parseFloat(e.amount);
    else totalCr += parseFloat(e.amount);
  }
  if (Math.abs(totalDr - totalCr) > 0.01) {
    throw new APIError(`Transaction not balanced. Dr: ${totalDr}, Cr: ${totalCr}`, 400, 'UNBALANCED_TRANSACTION');
  }

  // Reject posting to group control / non-posting ledgers
  for (const e of entries) {
    const ledger = await tx.ledger.findUnique({ where: { id: e.ledgerId } });
    if (!ledger) throw new APIError(`Ledger id ${e.ledgerId} not found`, 500, 'LEDGER_NOT_FOUND');
    if (ledger.isGroupLedger || ledger.allowsDirectPosting === false) {
      throw new APIError(
        `Cannot post to control ledger ${ledger.ledgerCode}. Post to a sub-ledger instead.`,
        400,
        'NON_POSTING_LEDGER'
      );
    }
  }

  const txnNumber = await generateTransactionNumber();

  const txn = await tx.financialTransaction.create({
    data: {
      transactionNumber: txnNumber,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      transactionType,
      referenceType: referenceType || null,
      referenceId: referenceId || null,
      referenceNumber: referenceNumber || null,
      description,
      totalAmount: totalDr,
      notes: notes || null,
      isPosted: true,
      createdBy: userId,
      entries: {
        create: entries.map(e => ({
          ledgerId: e.ledgerId,
          entryType: e.entryType,
          amount: parseFloat(e.amount),
          description: e.description || null,
          createdBy: userId,
        })),
      },
    },
    include: { entries: true },
  });

  // Update ledger running balances
  for (const entry of txn.entries) {
    const ledger = await tx.ledger.findUnique({ where: { id: entry.ledgerId } });
    if (!ledger) throw new APIError(`Ledger id ${entry.ledgerId} not found`, 500, 'LEDGER_NOT_FOUND');
    const newBalance = calculateNewBalance(ledger.ledgerType, ledger.currentBalance, entry.entryType, entry.amount);
    await tx.ledger.update({ where: { id: entry.ledgerId }, data: { currentBalance: newBalance } });

    if (ledger.parentLedgerId) {
      const parent = await tx.ledger.findUnique({ where: { id: ledger.parentLedgerId } });
      if (parent) {
        const parentNewBalance = calculateNewBalance(parent.ledgerType, parent.currentBalance, entry.entryType, entry.amount);
        await tx.ledger.update({ where: { id: parent.id }, data: { currentBalance: parentNewBalance } });
      }
    }
  }

  return txn;
}

// ── Specific auto-post functions ─────────────────────────────────────────────

/**
 * Auto-post on PO receipt save.
 * Dr Inventory (AC-1004), Dr GST Input (AC-1005 if tax > 0), Cr vendor's AP ledger (child of AC-2001)
 */
export async function postPurchaseReceipt(tx, { purchaseOrderId, poNumber, subtotal, taxAmount, totalValue, vendor }, userId) {
  const [inventoryLedger, apLedger] = await Promise.all([
    getLedger(tx, 'AC-1004'),
    getOwnedLedger(tx, vendor, 'Vendor'),
  ]);

  const entries = [
    { ledgerId: inventoryLedger.id, entryType: 'DEBIT', amount: subtotal, description: `PO receipt — ${poNumber}` },
    { ledgerId: apLedger.id, entryType: 'CREDIT', amount: totalValue, description: `Payable to vendor — ${poNumber}` },
  ];

  const tax = parseFloat(taxAmount || 0);
  if (tax > 0.001) {
    const gstInputLedger = await getLedger(tx, 'AC-1005');
    entries.splice(1, 0, { ledgerId: gstInputLedger.id, entryType: 'DEBIT', amount: tax, description: 'GST Input Credit' });
  }

  return postTransaction(tx, {
    transactionType: 'PURCHASE',
    referenceType: 'PURCHASE_ORDER',
    referenceId: purchaseOrderId,
    referenceNumber: poNumber,
    description: `Purchase receipt — ${poNumber}`,
  }, entries, userId);
}

/**
 * Auto-post on Invoice creation.
 * Dr customer's AR ledger (child of AC-1003), Cr Sales Revenue (AC-3001), Cr GST Output (AC-2003 if tax > 0)
 */
export async function postInvoice(tx, { invoiceId, invoiceNo, totalAmount, taxAmount, customer }, userId) {
  const [arLedger, salesLedger] = await Promise.all([
    getOwnedLedger(tx, customer, 'Customer'),
    getLedger(tx, 'AC-3001'),
  ]);

  const tax = parseFloat(taxAmount || 0);
  const net = parseFloat(totalAmount) - tax;

  const entries = [
    { ledgerId: arLedger.id, entryType: 'DEBIT', amount: parseFloat(totalAmount), description: `Invoice raised — ${invoiceNo}` },
    { ledgerId: salesLedger.id, entryType: 'CREDIT', amount: net, description: `Sales revenue — ${invoiceNo}` },
  ];

  if (tax > 0.001) {
    const gstOutputLedger = await getLedger(tx, 'AC-2003');
    entries.push({ ledgerId: gstOutputLedger.id, entryType: 'CREDIT', amount: tax, description: 'GST Output Collected' });
  }

  return postTransaction(tx, {
    transactionType: 'SALE',
    referenceType: 'INVOICE',
    referenceId: invoiceId,
    referenceNumber: invoiceNo,
    description: `Invoice — ${invoiceNo}`,
  }, entries, userId);
}

/**
 * Reverse a previously posted invoice (on cancel).
 * Dr Sales Revenue (AC-3001), Dr GST Output (AC-2003 if tax > 0), Cr customer's AR ledger
 */
export async function reverseInvoice(tx, { invoiceId, invoiceNo, totalAmount, taxAmount, customer }, userId) {
  const [arLedger, salesLedger] = await Promise.all([
    getOwnedLedger(tx, customer, 'Customer'),
    getLedger(tx, 'AC-3001'),
  ]);

  const tax = parseFloat(taxAmount || 0);
  const net = parseFloat(totalAmount) - tax;

  const entries = [
    { ledgerId: salesLedger.id, entryType: 'DEBIT', amount: net, description: `Sales revenue reversal — ${invoiceNo}` },
    { ledgerId: arLedger.id, entryType: 'CREDIT', amount: parseFloat(totalAmount), description: `Invoice reversal — ${invoiceNo}` },
  ];

  if (tax > 0.001) {
    const gstOutputLedger = await getLedger(tx, 'AC-2003');
    entries.splice(1, 0, { ledgerId: gstOutputLedger.id, entryType: 'DEBIT', amount: tax, description: 'GST Output reversal' });
  }

  return postTransaction(tx, {
    transactionType: 'JOURNAL',
    referenceType: 'INVOICE',
    referenceId: invoiceId,
    referenceNumber: invoiceNo,
    description: `Invoice reversal — ${invoiceNo}`,
  }, entries, userId);
}

/**
 * Auto-post on client payment received.
 * Dr Cash/Bank (bankLedgerId), Cr customer's AR ledger (child of AC-1003)
 */
export async function postClientPayment(tx, { invoiceId, invoiceNo, amount, bankLedgerId, customer }, userId) {
  const [bankLedger, arLedger] = await Promise.all([
    tx.ledger.findUnique({ where: { id: bankLedgerId } }),
    getOwnedLedger(tx, customer, 'Customer'),
  ]);
  if (!bankLedger) throw new APIError('Selected bank/cash ledger not found', 400, 'LEDGER_NOT_FOUND');

  return postTransaction(tx, {
    transactionType: 'RECEIPT',
    referenceType: 'INVOICE',
    referenceId: invoiceId,
    referenceNumber: invoiceNo,
    description: `Payment received — ${invoiceNo}`,
  }, [
    { ledgerId: bankLedger.id, entryType: 'DEBIT', amount, description: `Client payment — ${invoiceNo}` },
    { ledgerId: arLedger.id, entryType: 'CREDIT', amount, description: `AR cleared — ${invoiceNo}` },
  ], userId);
}

/**
 * Auto-post on customer payment receipt voucher.
 * Dr Cash/Bank (bankLedgerId), Cr customer's AR ledger (child of AC-1003)
 */
export async function postCustomerPaymentReceipt(tx, { voucherId, receiptNumber, totalAmount, bankLedgerId, customer }, userId) {
  const [bankLedger, arLedger] = await Promise.all([
    tx.ledger.findUnique({ where: { id: bankLedgerId } }),
    getOwnedLedger(tx, customer, 'Customer'),
  ]);
  if (!bankLedger) throw new APIError('Selected bank/cash ledger not found', 400, 'LEDGER_NOT_FOUND');

  return postTransaction(tx, {
    transactionType: 'RECEIPT',
    referenceType: 'RECEIPT',
    referenceId: voucherId,
    referenceNumber: receiptNumber,
    description: `Customer payment receipt — ${receiptNumber}`,
  }, [
    { ledgerId: bankLedger.id, entryType: 'DEBIT', amount: totalAmount, description: `Receipt — ${receiptNumber}` },
    { ledgerId: arLedger.id, entryType: 'CREDIT', amount: totalAmount, description: `AR cleared — ${receiptNumber}` },
  ], userId);
}

/**
 * Auto-post on vendor payment voucher.
 * Dr vendor's AP ledger (child of AC-2001), Cr Cash/Bank (bankLedgerId)
 */
export async function postVendorPayment(tx, { voucherId, voucherNumber, totalAmount, bankLedgerId, vendor }, userId) {
  const [apLedger, bankLedger] = await Promise.all([
    getOwnedLedger(tx, vendor, 'Vendor'),
    tx.ledger.findUnique({ where: { id: bankLedgerId } }),
  ]);
  if (!bankLedger) throw new APIError('Selected bank/cash ledger not found', 400, 'LEDGER_NOT_FOUND');

  return postTransaction(tx, {
    transactionType: 'PAYMENT',
    referenceType: 'PURCHASE_ORDER',
    referenceId: voucherId,
    referenceNumber: voucherNumber,
    description: `Vendor payment — ${voucherNumber}`,
  }, [
    { ledgerId: apLedger.id, entryType: 'DEBIT', amount: totalAmount, description: `AP reduced — ${voucherNumber}` },
    { ledgerId: bankLedger.id, entryType: 'CREDIT', amount: totalAmount, description: `Payment from ${bankLedger.ledgerName}` },
  ], userId);
}

/**
 * Auto-post on expense creation.
 * Dr [category ledger], Cr Cash/Bank (bankLedgerId)
 */
export async function postExpense(tx, { expenseId, expenseNumber, amount, categoryLedgerId, bankLedgerId, description }, userId) {
  const [expLedger, bankLedger] = await Promise.all([
    tx.ledger.findUnique({ where: { id: categoryLedgerId } }),
    tx.ledger.findUnique({ where: { id: bankLedgerId } }),
  ]);
  if (!expLedger) throw new APIError('Expense category ledger not found', 400, 'LEDGER_NOT_FOUND');
  if (!bankLedger) throw new APIError('Bank/cash ledger not found', 400, 'LEDGER_NOT_FOUND');

  return postTransaction(tx, {
    transactionType: 'JOURNAL',
    referenceType: 'MANUAL',
    referenceId: expenseId,
    referenceNumber: expenseNumber,
    description: description || `Expense — ${expenseNumber}`,
  }, [
    { ledgerId: expLedger.id, entryType: 'DEBIT', amount, description: `Expense — ${description}` },
    { ledgerId: bankLedger.id, entryType: 'CREDIT', amount, description: `Paid from ${bankLedger.ledgerName}` },
  ], userId);
}

/**
 * Post a reversing transaction (negates a previous posting).
 * Swaps DEBIT↔CREDIT on all entries of the original transaction.
 */
export async function postReversingTransaction(tx, originalTxnId, userId, note) {
  const original = await tx.financialTransaction.findUnique({
    where: { id: originalTxnId },
    include: { entries: true },
  });
  if (!original) throw new APIError('Original transaction not found', 404, 'TXN_NOT_FOUND');

  const reversedEntries = original.entries.map(e => ({
    ledgerId: e.ledgerId,
    entryType: e.entryType === 'DEBIT' ? 'CREDIT' : 'DEBIT',
    amount: parseFloat(e.amount),
    description: `Reversal: ${e.description || ''}`,
  }));

  return postTransaction(tx, {
    transactionType: original.transactionType,
    referenceType: original.referenceType,
    referenceId: original.referenceId,
    referenceNumber: original.referenceNumber,
    description: `REVERSAL of ${original.transactionNumber} — ${note || ''}`,
  }, reversedEntries, userId);
}
