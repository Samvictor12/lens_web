/**
 * Company logo helpers — accept any image; keep ≤1 MB with transparency preserved.
 */

export const LOGO_MAX_STORED_BYTES = 1024 * 1024; // 1 MB binary
export const LOGO_MAX_PICK_BYTES = 8 * 1024 * 1024; // allow pick then optimize
const MAX_EDGE_START = 800;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|ico|avif|heic|tiff?)$/i;

export function isImageFile(file) {
  if (!file) return false;
  if (file.type && file.type.startsWith("image/")) return true;
  return IMAGE_EXT.test(file.name || "");
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

/** Approximate decoded byte length of a data URL. */
export function dataUrlDecodedBytes(dataUrl) {
  if (!dataUrl || typeof dataUrl !== "string") return 0;
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = (b64.match(/=+$/) || [""])[0].length;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image. Try PNG, JPG, or WebP."));
    img.src = dataUrl;
  });
}

function isSvgFile(file) {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name || "");
}

/**
 * Resize / re-encode oversized rasters. Prefers PNG (alpha); uses WebP when smaller.
 * Never forces JPEG (would drop transparency).
 */
async function optimizeOversizeRaster(file) {
  const originalUrl = await readAsDataURL(file);
  const img = await loadImageFromDataUrl(originalUrl);

  let maxEdge = MAX_EDGE_START;
  let best = null;
  let bestBytes = Infinity;

  for (let attempt = 0; attempt < 7; attempt++) {
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height, 1));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image.");
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    let candidate = canvas.toDataURL("image/png");
    try {
      const webp = canvas.toDataURL("image/webp", 0.92);
      if (
        webp.startsWith("data:image/webp") &&
        dataUrlDecodedBytes(webp) < dataUrlDecodedBytes(candidate)
      ) {
        candidate = webp;
      }
    } catch {
      /* WebP unsupported */
    }

    const bytes = dataUrlDecodedBytes(candidate);
    if (bytes < bestBytes) {
      best = candidate;
      bestBytes = bytes;
    }
    if (bytes <= LOGO_MAX_STORED_BYTES) return candidate;

    maxEdge = Math.floor(maxEdge * 0.72);
  }

  if (best && bestBytes <= LOGO_MAX_STORED_BYTES) return best;
  throw new Error("Could not optimize logo under 1 MB. Try a smaller image.");
}

/**
 * Prepare a picked file as a data URL for company settings.
 * ≤1 MB → keep original (PNG transparency intact).
 * >1 MB → resize/compress; SVG over 1 MB rejected.
 */
export async function prepareCompanyLogo(file) {
  if (!file) throw new Error("No file selected.");
  if (!isImageFile(file)) throw new Error("Only image files are allowed.");
  if (file.size > LOGO_MAX_PICK_BYTES) {
    throw new Error("Please choose an image under 8 MB.");
  }

  if (file.size <= LOGO_MAX_STORED_BYTES) {
    return readAsDataURL(file);
  }

  if (isSvgFile(file)) {
    throw new Error("SVG logo must be under 1 MB (cannot auto-compress vectors).");
  }

  return optimizeOversizeRaster(file);
}
