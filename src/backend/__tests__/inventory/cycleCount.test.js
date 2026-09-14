import { describe, it, expect } from 'vitest';
import {
  classifyCycleCountOutcome,
  summarizeCycleCountKpis,
  validateAuditTrayTransfer,
} from '../../services/inventoryCycleCount.helpers.js';

describe('inventory cycle count helpers', () => {
  it('TC-2 classifyCycleCountOutcome: match, pending recount, shortage/overage after recount', () => {
    expect(classifyCycleCountOutcome({ bookQty: 10, countedQty: 10 })).toBe('MATCH');
    expect(
      classifyCycleCountOutcome({ bookQty: 10, countedQty: 11, recountThreshold: 1 })
    ).toBe('MATCH');
    expect(
      classifyCycleCountOutcome({
        bookQty: 10,
        countedQty: 8,
        recountThreshold: 1,
        isRecount: false,
      })
    ).toBe('PENDING_RECOUNT');
    expect(
      classifyCycleCountOutcome({
        bookQty: 10,
        countedQty: 7,
        recountThreshold: 1,
        isRecount: true,
      })
    ).toBe('SHORTAGE');
    expect(
      classifyCycleCountOutcome({
        bookQty: 10,
        countedQty: 13,
        recountThreshold: 1,
        isRecount: true,
      })
    ).toBe('OVERAGE');
  });

  it('TC-3 summarizeCycleCountKpis: completion, accuracy, outcome buckets', () => {
    const kpis = summarizeCycleCountKpis({
      traysInScope: 4,
      trayIdsCounted: [1, 1, 2],
      lines: [
        { outcome: 'MATCH' },
        { outcome: 'MATCH' },
        { outcome: 'SHORTAGE' },
        { outcome: 'OVERAGE' },
        { outcome: 'PENDING_RECOUNT' },
        { outcome: 'UNCOUNTED' },
      ],
    });
    expect(kpis.traysCounted).toBe(2);
    expect(kpis.completionPct).toBe(50);
    expect(kpis.matched).toBe(2);
    expect(kpis.variance).toBe(2);
    expect(kpis.pendingRecount).toBe(1);
    expect(kpis.shortage).toBe(1);
    expect(kpis.overage).toBe(1);
    expect(kpis.accuracyPct).toBe(40);
    expect(kpis.lineCount).toBe(5);
  });

  it('TC-4 Transfer same-tray rejected in Audit form validation helper', () => {
    const same = validateAuditTrayTransfer({ fromTrayId: 5, toTrayId: 5, quantity: 2 });
    expect(same.ok).toBe(false);
    expect(same.message).toMatch(/different/i);

    const ok = validateAuditTrayTransfer({ fromTrayId: 5, toTrayId: 9, quantity: 2 });
    expect(ok.ok).toBe(true);
  });
});
