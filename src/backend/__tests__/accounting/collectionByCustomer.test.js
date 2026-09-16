/**
 * Unit tests — collectionByCustomer Target / Actual / Balance math
 */

import { describe, it, expect } from 'vitest';
import {
  aggregateCollectionByCustomer,
  monthEndCollectibleTotal,
} from '../../services/collectionByCustomer.js';

describe('aggregateCollectionByCustomer', () => {
  it('groups remaining collectible as Target and month receipts as Actual', () => {
    const invoices = [
      { customerId: 1, totalAmount: 1000, paidAmount: 200, customer: { name: 'Alpha' } },
      { customerId: 1, totalAmount: 500, paidAmount: 0, customer: { name: 'Alpha' } },
      { customerId: 2, totalAmount: 300, paidAmount: 50, customer: { name: 'Beta' } },
    ];
    const payments = [
      { customerId: 1, totalAmount: 400, customer: { name: 'Alpha' } },
      { customerId: 3, totalAmount: 150, customer: { name: 'Gamma' } },
    ];

    const rows = aggregateCollectionByCustomer(invoices, payments);
    expect(rows).toHaveLength(3);

    const alpha = rows.find((r) => r.customerId === 1);
    expect(alpha).toMatchObject({
      customerName: 'Alpha',
      target: 1300,
      actual: 400,
      balance: 900,
    });

    const beta = rows.find((r) => r.customerId === 2);
    expect(beta).toMatchObject({ target: 250, actual: 0, balance: 250 });

    const gamma = rows.find((r) => r.customerId === 3);
    expect(gamma).toMatchObject({ target: 0, actual: 150, balance: -150 });
  });

  it('omits customers with Target and Actual both zero', () => {
    const rows = aggregateCollectionByCustomer(
      [{ customerId: 9, totalAmount: 100, paidAmount: 100, customer: { name: 'Zero' } }],
      [{ customerId: 9, totalAmount: 0, customer: { name: 'Zero' } }]
    );
    expect(rows).toHaveLength(0);
  });

  it('KPI collectionTarget equals sum of row Target values', () => {
    const rows = aggregateCollectionByCustomer(
      [
        { customerId: 1, totalAmount: 100, paidAmount: 10, customer: { name: 'A' } },
        { customerId: 2, totalAmount: 50, paidAmount: 0, customer: { name: 'B' } },
      ],
      []
    );
    expect(monthEndCollectibleTotal(rows)).toBe(140);
  });
});
