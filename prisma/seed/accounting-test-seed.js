/**
 * Accounting Module Test Seed
 * ────────────────────────────
 * Creates sample GL transactions for the full accounting flow:
 *   Opening Balance → PO Receipt → Vendor Payment → Invoice → Client Payment → Expenses
 *
 * Prerequisites: system user (id=1) + master data (run `npm run db:seed` first).
 * Also runs financial-ledgers-seed if AC-* ledgers are missing.
 *
 * Run:  node prisma/seed/accounting-test-seed.js
 * Safe to re-run — skips records that already exist (by unique keys).
 */

import { PrismaClient } from '@prisma/client';
import {
  postTransaction,
  postPurchaseReceipt,
  postInvoice,
  postClientPayment,
  postVendorPayment,
  postExpense,
} from '../../src/backend/services/accountingService.js';
import { seedFinancialLedgers } from './financial-ledgers-seed.js';

const prisma = new PrismaClient();
const USER_ID = 1;

async function getLedger(client, code) {
  const ledger = await client.ledger.findFirst({ where: { ledgerCode: code, delete_status: false } });
  if (!ledger) throw new Error(`Ledger ${code} not found. Run financial-ledgers-seed first.`);
  return ledger;
}

async function ensureMasterRefs(client) {
  const vendor = await client.vendor.findFirst({ where: { code: 'VEND-001', delete_status: false } });
  const vendor2 = await client.vendor.findFirst({ where: { code: 'VEND-002', delete_status: false } });
  const customer = await client.customer.findFirst({ where: { code: 'CUST-001', delete_status: false } });
  const customer2 = await client.customer.findFirst({ where: { code: 'CUST-002', delete_status: false } });
  const lensProduct = await client.lensProductMaster.findFirst({ where: { deleteStatus: false } });
  const category = await client.lensCategoryMaster.findFirst({ where: { deleteStatus: false } });
  const lensType = await client.lensTypeMaster.findFirst({ where: { deleteStatus: false } });
  const coating = await client.lensCoatingMaster.findFirst({ where: { deleteStatus: false } });

  if (!vendor || !customer || !lensProduct) {
    throw new Error('Master data missing. Run `npm run db:seed` before accounting-test-seed.');
  }

  return { vendor, vendor2, customer, customer2, lensProduct, category, lensType, coating };
}

export async function seedAccountingTestData(client = prisma) {
  console.log('💰 Starting Accounting Test Seed…\n');

  const user = await client.user.findUnique({ where: { id: USER_ID } });
  if (!user) throw new Error('System user (id=1) not found. Run `npm run db:seed` first.');

  const cashLedger = await client.ledger.findFirst({ where: { ledgerCode: 'AC-1001' } });
  if (!cashLedger) {
    console.log('   ℹ️  AC-* ledgers missing — seeding Chart of Accounts…');
    await seedFinancialLedgers(client);
  }

  const { vendor, vendor2, customer, customer2, lensProduct, category, lensType, coating } = await ensureMasterRefs(client);
  const bankLedger = await getLedger(client, 'AC-1002');
  const capitalLedger = await getLedger(client, 'AC-5001');

  // ── 1. Opening balance ────────────────────────────────────────────────────
  console.log('📒 Posting opening balance…');
  const openingExists = await client.financialTransaction.findFirst({
    where: { referenceNumber: 'OB-TEST-2026' },
  });
  if (!openingExists) {
    await client.$transaction(async (tx) => {
      await postTransaction(
        tx,
        {
          transactionType: 'OPENING_BALANCE',
          referenceType: 'MANUAL',
          referenceNumber: 'OB-TEST-2026',
          description: 'Opening balance — test seed',
          transactionDate: new Date('2026-01-01'),
        },
        [
          { ledgerId: cashLedger.id, entryType: 'DEBIT', amount: 500000, description: 'Opening cash' },
          { ledgerId: capitalLedger.id, entryType: 'CREDIT', amount: 500000, description: "Owner's capital" },
        ],
        USER_ID,
      );
    });
    console.log('   ✅ Opening balance TXN posted (₹5,00,000)');
  } else {
    console.log('   ⏭️  Opening balance already exists');
  }

  // ── 2. Purchase orders + receipts ─────────────────────────────────────────
  console.log('📦 Creating purchase orders with receipts…');

  const poBase = {
    lens_id: lensProduct.id,
    category_id: category?.id,
    Type_id: lensType?.id,
    coating_id: coating?.id,
    rightEye: true,
    leftEye: false,
    rightSpherical: '-2.00',
    quantity: 10,
    unitPrice: 1000,
    subtotal: 10000,
    taxAmount: 1800,
    totalValue: 11800,
    orderType: 'Single',
    activeStatus: true,
    deleteStatus: false,
    createdBy: USER_ID,
  };

  const po1 = await client.purchaseOrder.upsert({
    where: { poNumber: 'TEST-PO-2026-001' },
    update: {},
    create: {
      ...poBase,
      poNumber: 'TEST-PO-2026-001',
      vendorId: vendor.id,
      status: 'RECEIVED',
      receivedQty: 10,
      supplierInvoiceNo: 'SUP-INV-1001',
      purchaseType: 'Local',
      placeOfSupply: 'Maharashtra',
    },
  });

  const receipt1Exists = await client.purchaseOrderReceipt.findFirst({
    where: { receiptNumber: 'TEST-REC-2026-001' },
  });
  if (!receipt1Exists) {
    await client.purchaseOrderReceipt.create({
      data: {
        receiptNumber: 'TEST-REC-2026-001',
        purchaseOrderId: po1.id,
        receivedItems: [{ spherical: '-2.00', cylindrical: '0.00', orderedQty: 10, receivedQty: 10, unitPrice: 1000 }],
        totalReceivedQty: 10,
        totalValue: 11800,
        subtotal: 10000,
        taxAmount: 1800,
        unitPrice: 1000,
        status: 'COMPLETE',
        createdBy: USER_ID,
      },
    });
    await client.$transaction(async (tx) => {
      await postPurchaseReceipt(tx, {
        purchaseOrderId: po1.id,
        poNumber: po1.poNumber,
        subtotal: 10000,
        taxAmount: 1800,
        totalValue: 11800,
      }, USER_ID);
    });
    console.log('   ✅ TEST-PO-2026-001 received + GL posted');
  } else {
    console.log('   ⏭️  TEST-PO-2026-001 receipt already exists');
  }

  const po2 = await client.purchaseOrder.upsert({
    where: { poNumber: 'TEST-PO-2026-002' },
    update: {},
    create: {
      ...poBase,
      poNumber: 'TEST-PO-2026-002',
      vendorId: vendor2?.id ?? vendor.id,
      quantity: 20,
      unitPrice: 1000,
      subtotal: 20000,
      taxAmount: 3600,
      totalValue: 23600,
      status: 'RECEIVED',
      receivedQty: 20,
      supplierInvoiceNo: 'SUP-INV-1002',
      createdBy: USER_ID,
    },
  });

  const receipt2Exists = await client.purchaseOrderReceipt.findFirst({
    where: { receiptNumber: 'TEST-REC-2026-002' },
  });
  if (!receipt2Exists) {
    await client.purchaseOrderReceipt.create({
      data: {
        receiptNumber: 'TEST-REC-2026-002',
        purchaseOrderId: po2.id,
        receivedItems: [{ spherical: '-2.00', cylindrical: '0.00', orderedQty: 20, receivedQty: 20, unitPrice: 1000 }],
        totalReceivedQty: 20,
        totalValue: 23600,
        subtotal: 20000,
        taxAmount: 3600,
        unitPrice: 1000,
        status: 'COMPLETE',
        createdBy: USER_ID,
      },
    });
    await client.$transaction(async (tx) => {
      await postPurchaseReceipt(tx, {
        purchaseOrderId: po2.id,
        poNumber: po2.poNumber,
        subtotal: 20000,
        taxAmount: 3600,
        totalValue: 23600,
      }, USER_ID);
    });
    console.log('   ✅ TEST-PO-2026-002 received + GL posted');
  } else {
    console.log('   ⏭️  TEST-PO-2026-002 receipt already exists');
  }

  // ── 3. Vendor payment voucher ─────────────────────────────────────────────
  console.log('💸 Creating vendor payment voucher…');
  const vpvExists = await client.vendorPaymentVoucher.findFirst({
    where: { voucherNumber: 'TEST-VPV-2026-0001' },
  });
  if (!vpvExists) {
    const vpv = await client.vendorPaymentVoucher.create({
      data: {
        voucherNumber: 'TEST-VPV-2026-0001',
        vendorId: vendor.id,
        paymentDate: new Date('2026-02-15'),
        totalAmount: 11800,
        paymentMethod: 'BANK_TRANSFER',
        bankLedgerId: bankLedger.id,
        referenceNo: 'NEFT-TEST-001',
        notes: 'Full payment for TEST-PO-2026-001',
        createdBy: USER_ID,
        items: {
          create: [{ purchaseOrderId: po1.id, allocatedAmount: 11800, notes: 'PO-001 settlement' }],
        },
      },
    });
    await client.$transaction(async (tx) => {
      await postVendorPayment(tx, {
        voucherId: vpv.id,
        voucherNumber: vpv.voucherNumber,
        totalAmount: 11800,
        bankLedgerId: bankLedger.id,
      }, USER_ID);
    });
    console.log('   ✅ TEST-VPV-2026-0001 created + GL posted');
  } else {
    console.log('   ⏭️  Vendor payment voucher already exists');
  }

  // ── 4. Delivered sale orders for invoicing ────────────────────────────────
  console.log('📝 Creating delivered sale orders for billing…');

  const soBase = {
    customerId: customer.id,
    status: 'DELIVERED',
    type: 'Standard',
    lens_id: lensProduct.id,
    category_id: category?.id,
    Type_id: lensType?.id,
    coating_id: coating?.id,
    rightEye: true,
    leftEye: true,
    rightSpherical: '-2.00',
    leftSpherical: '-2.25',
    lensPrice: 15000,
    fittingPrice: 200,
    discount: 0,
    activeStatus: true,
    deleteStatus: false,
    createdBy: USER_ID,
  };

  const invSO1 = await client.saleOrder.upsert({
    where: { orderNo: 'TEST-INV-SO-001' },
    update: { status: 'DELIVERED' },
    create: { ...soBase, orderNo: 'TEST-INV-SO-001', customerId: customer.id },
  });

  const invSO2 = await client.saleOrder.upsert({
    where: { orderNo: 'TEST-INV-SO-002' },
    update: { status: 'DELIVERED' },
    create: {
      ...soBase,
      orderNo: 'TEST-INV-SO-002',
      customerId: customer2?.id ?? customer.id,
      lensPrice: 8500,
      fittingPrice: 150,
    },
  });

  console.log('   ✅ 2 DELIVERED sale orders ready for invoicing');

  // ── 5. Invoices + GL ──────────────────────────────────────────────────────
  console.log('🧾 Creating invoices…');

  const inv1Total = 17700; // 15000 net + 2700 GST (18%)
  const inv1Tax = 2700;

  let invoice1 = await client.invoice.findFirst({ where: { invoiceNo: 'TEST-INV-2026-001' } });
  if (!invoice1) {
    invoice1 = await client.invoice.create({
      data: {
        invoiceNo: 'TEST-INV-2026-001',
        status: 'ISSUED',
        customerId: customer.id,
        totalAmount: inv1Total,
        taxAmount: inv1Tax,
        paidAmount: 0,
        dueDate: new Date('2026-03-31'),
        notes: 'Test invoice — partial payment scenario',
        saleOrders: { connect: [{ id: invSO1.id }] },
        createdBy: USER_ID,
      },
    });
    await client.$transaction(async (tx) => {
      await postInvoice(tx, {
        invoiceId: invoice1.id,
        invoiceNo: invoice1.invoiceNo,
        totalAmount: inv1Total,
        taxAmount: inv1Tax,
      }, USER_ID);
    });
    console.log('   ✅ TEST-INV-2026-001 issued + GL posted');
  } else {
    console.log('   ⏭️  TEST-INV-2026-001 already exists');
  }

  const inv2Total = 10230; // 8500 + 150 fitting + 18% GST on 8650 ≈ 1557 → round 10230
  const inv2Tax = 1557;

  let invoice2 = await client.invoice.findFirst({ where: { invoiceNo: 'TEST-INV-2026-002' } });
  if (!invoice2) {
    invoice2 = await client.invoice.create({
      data: {
        invoiceNo: 'TEST-INV-2026-002',
        status: 'PARTIALLY_PAID',
        customerId: customer2?.id ?? customer.id,
        totalAmount: inv2Total,
        taxAmount: inv2Tax,
        paidAmount: 5000,
        dueDate: new Date('2026-03-31'),
        bankLedgerId: bankLedger.id,
        saleOrders: { connect: [{ id: invSO2.id }] },
        createdBy: USER_ID,
      },
    });
    await client.$transaction(async (tx) => {
      await postInvoice(tx, {
        invoiceId: invoice2.id,
        invoiceNo: invoice2.invoiceNo,
        totalAmount: inv2Total,
        taxAmount: inv2Tax,
      }, USER_ID);
    });
    await client.$transaction(async (tx) => {
      await postClientPayment(tx, {
        invoiceId: invoice2.id,
        invoiceNo: invoice2.invoiceNo,
        amount: 5000,
        bankLedgerId: bankLedger.id,
      }, USER_ID);
    });
    await client.payment.create({
      data: {
        invoiceId: invoice2.id,
        amount: 5000,
        method: 'BANK_TRANSFER',
        referenceNo: 'UPI-TEST-002',
        notes: 'Partial payment — test seed',
      },
    });
    await client.saleOrder.update({ where: { id: invSO2.id }, data: { status: 'BILLED' } });
    console.log('   ✅ TEST-INV-2026-002 issued + partial payment GL posted');
  } else {
    console.log('   ⏭️  TEST-INV-2026-002 already exists');
  }

  // Partial payment on invoice 1
  const pay1Exists = await client.payment.findFirst({
    where: { invoiceId: invoice1.id, referenceNo: 'NEFT-CLIENT-001' },
  });
  if (!pay1Exists) {
    await client.$transaction(async (tx) => {
      await postClientPayment(tx, {
        invoiceId: invoice1.id,
        invoiceNo: invoice1.invoiceNo,
        amount: 10000,
        bankLedgerId: bankLedger.id,
      }, USER_ID);
    });
    await client.payment.create({
      data: {
        invoiceId: invoice1.id,
        amount: 10000,
        method: 'BANK_TRANSFER',
        referenceNo: 'NEFT-CLIENT-001',
      },
    });
    await client.invoice.update({
      where: { id: invoice1.id },
      data: { paidAmount: 10000, status: 'PARTIALLY_PAID', bankLedgerId: bankLedger.id },
    });
    console.log('   ✅ Partial client payment on TEST-INV-2026-001');
  }

  // ── 6. Expenses + GL ──────────────────────────────────────────────────────
  console.log('🧾 Creating expense entries…');

  const rentCat = await client.expenseCategory.findFirst({ where: { name: 'Rent' } });
  const utilCat = await client.expenseCategory.findFirst({ where: { name: 'Utilities' } });

  const exp1Exists = await client.expense.findFirst({ where: { expenseNumber: 'TEST-EXP-2026-0001' } });
  if (!exp1Exists && rentCat?.ledger_id) {
    const exp1 = await client.expense.create({
      data: {
        expenseNumber: 'TEST-EXP-2026-0001',
        categoryId: rentCat.id,
        amount: 15000,
        paymentMethod: 'BANK_TRANSFER',
        bankLedgerId: bankLedger.id,
        expenseDate: new Date('2026-02-01'),
        description: 'February shop rent',
        paidTo: 'Mumbai Properties Ltd',
        referenceNo: 'CHQ-1001',
        createdBy: USER_ID,
      },
    });
    await client.$transaction(async (tx) => {
      await postExpense(tx, {
        expenseId: exp1.id,
        expenseNumber: exp1.expenseNumber,
        amount: 15000,
        categoryLedgerId: rentCat.ledger_id,
        bankLedgerId: bankLedger.id,
        description: exp1.description,
      }, USER_ID);
    });
    console.log('   ✅ TEST-EXP-2026-0001 rent expense posted');
  }

  const exp2Exists = await client.expense.findFirst({ where: { expenseNumber: 'TEST-EXP-2026-0002' } });
  if (!exp2Exists && utilCat?.ledger_id) {
    const exp2 = await client.expense.create({
      data: {
        expenseNumber: 'TEST-EXP-2026-0002',
        categoryId: utilCat.id,
        amount: 3500,
        paymentMethod: 'CASH',
        bankLedgerId: cashLedger.id,
        expenseDate: new Date('2026-02-10'),
        description: 'Electricity bill — February',
        paidTo: 'MSEB',
        createdBy: USER_ID,
      },
    });
    await client.$transaction(async (tx) => {
      await postExpense(tx, {
        expenseId: exp2.id,
        expenseNumber: exp2.expenseNumber,
        amount: 3500,
        categoryLedgerId: utilCat.ledger_id,
        bankLedgerId: cashLedger.id,
        description: exp2.description,
      }, USER_ID);
    });
    console.log('   ✅ TEST-EXP-2026-0002 utilities expense posted');
  }

  // ── 7. Company settings ─────────────────────────────────────────────────────
  console.log('🏢 Ensuring company settings…');
  await client.companySettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: 'LensFlow Optic Hub',
      gstin: '27AAAAA0000A1Z5',
      address: '123 Lens Street, Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400069',
      phone: '+91-22-12345678',
      email: 'accounts@lensflow.com',
      website: 'https://lensflow.example.com',
      tagline: 'Precision Lens Manufacturing',
    },
  });
  console.log('   ✅ Company settings ready\n');
}

// Only run standalone when executed directly (not when imported by all-modules-test-seed)
const isDirectRun = process.argv[1]?.replace(/\\/g, '/').endsWith('accounting-test-seed.js');

async function main() {
  try {
    await seedAccountingTestData();
    console.log('🎉 Accounting Test Seed Complete!\n');
    console.log('📊 Test records created:');
    console.log('   Ledgers        : AC-1001…AC-5002 (Chart of Accounts)');
    console.log('   Opening balance: OB-TEST-2026 (₹5,00,000 cash)');
    console.log('   Purchase orders: TEST-PO-2026-001, TEST-PO-2026-002');
    console.log('   Vendor payment : TEST-VPV-2026-0001');
    console.log('   Invoices       : TEST-INV-2026-001 (partial paid), TEST-INV-2026-002');
    console.log('   Expenses       : TEST-EXP-2026-0001 (Rent), TEST-EXP-2026-0002 (Utilities)');
    console.log('\n🔐 Login: admin@lensbilling.com / admin123');
  } catch (error) {
    console.error('❌ Accounting seed error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (isDirectRun) {
  main().catch(() => process.exit(1));
}
