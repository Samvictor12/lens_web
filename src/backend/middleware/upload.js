import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_ROOT = path.join(__dirname, '../../../uploads/vendor-invoices');

if (!fs.existsSync(UPLOAD_ROOT)) {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
}

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_ROOT),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext.toLowerCase()}`;
    cb(null, safe);
  },
});

function fileFilter(_req, file, cb) {
  if (ALLOWED_MIMES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image files (JPEG, PNG, WebP) are allowed'));
  }
}

export const vendorInvoiceUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const UPLOADS_PUBLIC_PREFIX = '/uploads/vendor-invoices';
