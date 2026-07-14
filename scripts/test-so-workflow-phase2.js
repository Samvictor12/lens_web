/**
 * Phase 2 unit tests — transition matrix (no DB)
 * Run: node scripts/test-so-workflow-phase2.js
 */
import {
  ALLOWED_TRANSITIONS,
  canTransition,
  isSoLocked,
  RESET_ELIGIBLE_STATUSES,
  INVENTORY_QUEUE_STATUSES,
} from '../src/backend/constants/saleOrderStatus.js';

const PASS = [];
const FAIL = [];

function ok(name) {
  PASS.push(name);
  console.log(`  ✅ ${name}`);
}

function fail(name, msg) {
  FAIL.push(name);
  console.error(`  ❌ ${name}: ${msg}`);
}

console.log('\n=== Phase 2: Transition matrix ===\n');

// Happy path
const path = [
  ['DRAFT', 'PO_RAISED'],
  ['PO_RAISED', 'PO_RECEIVED'],
  ['PO_RECEIVED', 'PRE_QC'],
  ['PRE_QC', 'FITTING_READY'],
  ['FITTING_READY', 'IN_FITTING'],
  ['IN_FITTING', 'AWAITING_QUALITY'],
  ['AWAITING_QUALITY', 'READY_FOR_DISPATCH'],
  ['READY_FOR_DISPATCH', 'READY_FOR_PICKUP'],
  ['READY_FOR_PICKUP', 'DISPATCHED'],
  ['DISPATCHED', 'DELIVERED'],
  ['DELIVERED', 'INVOICED'],
  ['INVOICED', 'COMPLETED'],
];

for (const [from, to] of path) {
  if (canTransition(from, to)) ok(`${from} → ${to}`);
  else fail(`${from} → ${to}`, 'not allowed');
}

// Pre-QC reject → reset
if (canTransition('PRE_QC', 'PRE_QC_REJECTED')) ok('PRE_QC → PRE_QC_REJECTED');
else fail('PRE_QC reject', '');

if (canTransition('PRE_QC_REJECTED', 'DRAFT')) ok('PRE_QC_REJECTED → DRAFT (SO reset)');
else fail('SO reset from PRE_QC_REJECTED', '');

// Post-QC reject
if (canTransition('AWAITING_QUALITY', 'POST_QC_REJECTED')) ok('Post-QC reject');
if (canTransition('POST_QC_REJECTED', 'DRAFT')) ok('POST_QC_REJECTED → DRAFT');

// PO cancel
if (canTransition('PO_RAISED', 'PO_CANCELLED')) ok('PO cancel');
if (canTransition('PO_CANCELLED', 'PO_RAISED')) ok('Raise new PO after cancel');

// Invalid
if (!canTransition('DRAFT', 'COMPLETED')) ok('Block DRAFT → COMPLETED');
else fail('Should block skip', '');

// Lock
if (isSoLocked({ status: 'DRAFT', hasLinkedPoEver: true })) ok('Lock when hasLinkedPoEver');
else fail('Lock hasLinkedPoEver', '');

if (isSoLocked({ status: 'PO_RAISED', hasLinkedPoEver: false })) ok('Lock at PO_RAISED');
else fail('Lock PO_RAISED', '');

// Queue statuses
const queueExpected = ['DRAFT', 'PO_RECEIVED', 'PRE_QC_REJECTED'];
for (const s of queueExpected) {
  if (INVENTORY_QUEUE_STATUSES.includes(s)) ok(`Queue includes ${s}`);
  else fail(`Queue missing ${s}`, '');
}

if (RESET_ELIGIBLE_STATUSES.length === 4) ok('4 reset-eligible statuses');

console.log(`\n--- Phase 2: ${PASS.length} passed, ${FAIL.length} failed ---\n`);
process.exit(FAIL.length ? 1 : 0);
