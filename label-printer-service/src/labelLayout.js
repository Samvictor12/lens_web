/**
 * FG label geometry @ 203 dpi.
 * Default MES FG stock: 10mm × 10mm, gap 2mm.
 * GDI form pitch = height + gap (12mm) so registration stays on every label.
 */
const LABEL_DPI = 203;
const LABEL_WIDTH_MM = 10;
const LABEL_HEIGHT_MM = 10;
/** Gap between labels on the liner — must match TE210 media / sensor setup */
const LABEL_GAP_MM = 2;

function mmToDots(mm) {
  return Math.max(1, Math.round((mm / 25.4) * LABEL_DPI));
}

function mmToHundredths(mm) {
  return Math.max(1, Math.round((mm / 25.4) * 100));
}

const LABEL_WIDTH_PX = mmToDots(LABEL_WIDTH_MM); // ≈ 80
const LABEL_HEIGHT_PX = mmToDots(LABEL_HEIGHT_MM); // ≈ 80
/** Code fits inside the shorter side with ~1mm margin each side */
const CODE_PX = Math.max(8, Math.min(LABEL_WIDTH_PX, LABEL_HEIGHT_PX) - mmToDots(2));
const CODE_OFFSET_X = Math.floor((LABEL_WIDTH_PX - CODE_PX) / 2);
const CODE_OFFSET_Y = Math.floor((LABEL_HEIGHT_PX - CODE_PX) / 2);

const LABEL_WIDTH_HU = mmToHundredths(LABEL_WIDTH_MM); // ≈ 39
const LABEL_HEIGHT_HU = mmToHundredths(LABEL_HEIGHT_MM); // ≈ 39
const LABEL_GAP_HU = mmToHundredths(LABEL_GAP_MM); // ≈ 8
/** Full form height for GDI (label + gap) so each page advances one stock pitch */
const FORM_HEIGHT_MM = LABEL_HEIGHT_MM + LABEL_GAP_MM; // 12
const FORM_HEIGHT_HU = mmToHundredths(FORM_HEIGHT_MM); // ≈ 47

module.exports = {
  LABEL_DPI,
  LABEL_WIDTH_MM,
  LABEL_HEIGHT_MM,
  LABEL_GAP_MM,
  FORM_HEIGHT_MM,
  LABEL_WIDTH_PX,
  LABEL_HEIGHT_PX,
  CODE_PX,
  CODE_OFFSET_X,
  CODE_OFFSET_Y,
  LABEL_WIDTH_HU,
  LABEL_HEIGHT_HU,
  LABEL_GAP_HU,
  FORM_HEIGHT_HU,
  mmToDots,
  mmToHundredths,
};
