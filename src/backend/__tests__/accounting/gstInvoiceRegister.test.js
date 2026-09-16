/**
 * Unit tests — GST invoice register derivation (intra/inter, qty, defaults)
 */

import { describe, it, expect } from 'vitest';
import {
  GST_REGISTER_HEADERS,
  defaultsFromCompanySettings,
  deriveGstRegisterRow,
  gstRegisterRowToExcelArray,
  invoiceQty,
  isIntraState,
  saleOrderPairQty,
} from '../../services/gstInvoiceRegister.js';

describe('GST register derivation', () => {
  it('Excel header matches the GST Report Format template', () => {
    expect(GST_REGISTER_HEADERS).toEqual([
      'SlNo',
      'Bill No',
      'Date',
      'Customer Name',
      'GSTNo',
      'State Name',
      'Sales Ledger',
      'HSN',
      'Qty',
      'Unit',
      'TaxRate',
      'Nett',
      'CGST',
      'SGST',
      'IGST',
      'IGST-Tax',
      'R-OFF',
      'Total Amt',
      'Total (taxable)',
      'Postage',
    ]);
  });

  it('treats matching company vs customer state as intra-state (CGST+SGST, IGST 0)', () => {
    expect(isIntraState('Tamil Nadu', 'tamil nadu')).toBe(true);
    const row = deriveGstRegisterRow(
      {
        invoiceNo: 'INV-1',
        billDate: new Date('2026-09-10'),
        totalAmount: 1180,
        taxAmount: 180,
        customer: { name: 'Local', gstin: '33AAAAA0000A1Z5', state: 'Tamil Nadu' },
        saleOrders: [{ rightEye: true, leftEye: true }],
      },
      { companyState: 'Tamil Nadu', hsn: '90015000', unit: 'Pair', defaultTaxRate: 18 },
      1
    );
    expect(row.cgst).toBe(90);
    expect(row.sgst).toBe(90);
    expect(row.igst).toBe(0);
    expect(row.igstTax).toBe(0);
    expect(row.intraState).toBe(true);
  });

  it('treats different states as inter-state (IGST = tax, CGST/SGST 0)', () => {
    const row = deriveGstRegisterRow(
      {
        invoiceNo: 'INV-2',
        createdAt: new Date('2026-09-11'),
        totalAmount: 1180,
        taxAmount: 180,
        customer: { name: 'Remote', gstin: '27BBBBB0000B1Z5', state: 'Maharashtra' },
        saleOrders: [],
      },
      { companyState: 'Tamil Nadu', hsn: '90015000', unit: 'Pair', defaultTaxRate: 18 },
      2
    );
    expect(row.cgst).toBe(0);
    expect(row.sgst).toBe(0);
    expect(row.igst).toBe(180);
    expect(row.igstTax).toBe(180);
    expect(row.intraState).toBe(false);
    expect(row.qty).toBe(1);
  });

  it('Qty sums sale-order pair flags and defaults to 1 when neither eye is set', () => {
    expect(saleOrderPairQty({ rightEye: true, leftEye: true })).toBe(2);
    expect(saleOrderPairQty({ rightEye: true, leftEye: false })).toBe(1);
    expect(saleOrderPairQty({ rightEye: false, leftEye: false })).toBe(1);
    expect(invoiceQty([{ rightEye: true, leftEye: true }, { rightEye: true, leftEye: false }])).toBe(3);
  });

  it('fills GSTNo/state/HSN/Unit/Sales Ledger/postage/R-OFF from customer and defaults', () => {
    const ctx = defaultsFromCompanySettings({
      state: 'Karnataka',
      customAttributes: { defaultHsn: '90015000', gstUnit: 'Pair' },
    });
    const row = deriveGstRegisterRow(
      {
        invoiceNo: 'INV-9',
        billDate: null,
        createdAt: new Date('2026-09-01T10:00:00'),
        totalAmount: 500,
        taxAmount: 0,
        customer: { name: 'Shop', gstin: '29CCCCC0000C1Z5', state: 'Karnataka' },
        saleOrders: [{ rightEye: false, leftEye: false }],
      },
      ctx,
      1
    );
    expect(row.gstNo).toBe('29CCCCC0000C1Z5');
    expect(row.stateName).toBe('Karnataka');
    expect(row.salesLedger).toBe('Sales Revenue');
    expect(row.hsn).toBe('90015000');
    expect(row.unit).toBe('Pair');
    expect(row.postage).toBe(0);
    expect(row.rOff).toBe(0);
    expect(row.nett).toBe(500);
    expect(row.totalTaxable).toBe(500);
    expect(row.totalAmt).toBe(500);
    expect(row.date).toBe('01-09-2026');

    const excel = gstRegisterRowToExcelArray(row);
    expect(excel).toHaveLength(GST_REGISTER_HEADERS.length);
    expect(excel[0]).toBe(1);
    expect(excel[1]).toBe('INV-9');
  });
});
