/**
 * Pure-unit checks for Progressive R/L + ADD PO inward helpers.
 * Run: node src/backend/utils/poInwardInventory.test.js
 */
import assert from "node:assert/strict";
import {
  parseReceiptItemKey,
  resolveReceivedItemPowers,
  buildInventoryEyeFields,
  inventoryItemPowers,
  matchInventoryToReceiptKey,
  buildInwardedByReceiptKey,
  buildBulkStyleKey,
} from "./poInwardInventory.js";

function pass(name) {
  console.log(`✓ ${name}`);
}

// ── parse keys ─────────────────────────────────────────────────────────────
{
  const p = parseReceiptItemKey("sph_-1.25_add_2_R");
  assert.equal(p.spherical, "-1.25");
  assert.equal(p.add, "2");
  assert.equal(p.eye, "R");
  assert.equal(p.cylindrical, "0");
  pass("parse progressive R key");
}
{
  const p = parseReceiptItemKey("sph_0_cyl_-0.5");
  assert.equal(p.spherical, "0");
  assert.equal(p.cylindrical, "-0.5");
  assert.equal(p.add, null);
  assert.equal(p.eye, null);
  pass("parse single-vision key");
}

// ── inventory eye fields (Progressive R/L) ─────────────────────────────────
{
  const r = buildInventoryEyeFields({
    eye: "R",
    spherical: "-1",
    cylindrical: "0",
    add: "1.5",
    isBulk: true,
  });
  assert.equal(r.rightEye, true);
  assert.equal(r.leftEye, false);
  assert.equal(r.rightSpherical, "-1");
  assert.equal(r.rightAdd, "1.5");
  assert.equal(r.leftAdd, null);
  pass("bulk Progressive R stores ADD on right eye only");
}
{
  const l = buildInventoryEyeFields({
    eye: "L",
    spherical: "-1",
    cylindrical: "0",
    add: "2",
    isBulk: true,
  });
  assert.equal(l.rightEye, false);
  assert.equal(l.leftEye, true);
  assert.equal(l.leftSpherical, "-1");
  assert.equal(l.leftAdd, "2");
  assert.equal(l.rightAdd, null);
  pass("bulk Progressive L stores ADD on left eye only");
}
{
  const s = buildInventoryEyeFields({
    eye: null,
    spherical: "0",
    cylindrical: "-0.75",
    add: null,
    isBulk: true,
  });
  assert.equal(s.rightEye, true);
  assert.equal(s.leftEye, false);
  assert.equal(s.rightCylindrical, "-0.75");
  assert.equal(s.rightAdd, null);
  pass("bulk Single Vision stores CYL on right slot");
}
{
  const single = buildInventoryEyeFields({
    eye: "R",
    spherical: "0",
    cylindrical: "0",
    add: "1.25",
    isBulk: false,
    po: {
      rightSpherical: "-2",
      rightCylindrical: "0",
      rightAdd: "1.25",
      rightAxis: "90",
    },
  });
  assert.equal(single.rightSpherical, "-2");
  assert.equal(single.rightAdd, "1.25");
  assert.equal(single.rightAxis, "90");
  pass("single PO Progressive R uses PO header powers + ADD");
}

// ── round-trip match R vs L ────────────────────────────────────────────────
{
  const receivedItems = [
    { key: "sph_-1_add_1.5_R", spherical: "-1", cylindrical: "0", add: 1.5, eye: "R", receivedQty: 2 },
    { key: "sph_-1_add_1.5_L", spherical: "-1", cylindrical: "0", add: 1.5, eye: "L", receivedQty: 3 },
  ];
  const invR = {
    quantity: 2,
    ...buildInventoryEyeFields({
      eye: "R",
      spherical: "-1",
      cylindrical: "0",
      add: "1.5",
      isBulk: true,
    }),
  };
  const invL = {
    quantity: 1,
    ...buildInventoryEyeFields({
      eye: "L",
      spherical: "-1",
      cylindrical: "0",
      add: "1.5",
      isBulk: true,
    }),
  };
  assert.equal(matchInventoryToReceiptKey(invR, receivedItems), "sph_-1_add_1.5_R");
  assert.equal(matchInventoryToReceiptKey(invL, receivedItems), "sph_-1_add_1.5_L");

  const map = buildInwardedByReceiptKey([invR, invL], receivedItems);
  assert.equal(map["sph_-1_add_1.5_R"], 2);
  assert.equal(map["sph_-1_add_1.5_L"], 1);
  pass("R and L same SPH/ADD do not collide in already-inwarded map");
}

// ── single_R / single_L mapping ────────────────────────────────────────────
{
  const receivedItems = [
    { key: "single_R", eye: "R", receivedQty: 1 },
    { key: "single_L", eye: "L", receivedQty: 1 },
  ];
  const invR = {
    quantity: 1,
    rightEye: true,
    leftEye: false,
    rightSpherical: "-1",
    rightCylindrical: "0",
    rightAdd: "2",
  };
  assert.equal(matchInventoryToReceiptKey(invR, receivedItems), "single_R");
  pass("single_R maps from right-only inventory item");
}

// ── resolve received powers ────────────────────────────────────────────────
{
  const p = resolveReceivedItemPowers({
    key: "sph_0_add_1.25_L",
    receivedQty: 1,
  });
  assert.equal(p.eye, "L");
  assert.equal(p.add, "1.25");
  assert.equal(p.spherical, "0");
  pass("resolve powers from progressive key alone");
}

// ── inventoryItemPowers ────────────────────────────────────────────────────
{
  const powers = inventoryItemPowers({
    rightEye: false,
    leftEye: true,
    leftSpherical: "-2",
    leftCylindrical: "0",
    leftAdd: "1.75",
  });
  assert.equal(powers.eye, "L");
  assert.equal(powers.add, "1.75");
  assert.equal(buildBulkStyleKey(powers), "sph_-2_add_1.75_L");
  pass("inventoryItemPowers + rebuild key for Progressive L");
}

console.log("\nAll poInwardInventory tests passed.");
