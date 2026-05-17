import express from 'express';
import SettingsController from '../controllers/settingsController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const ctrl = new SettingsController();

// Public endpoint — no auth required (used by customer portal)
router.get('/public/company', ctrl.getPublicCompany.bind(ctrl));

// All settings routes require authentication
router.use(authenticateToken);

// Company settings (single-row, upsert)
router.get('/company',     ctrl.getCompany.bind(ctrl));
router.put('/company',     ctrl.updateCompany.bind(ctrl));

// Own profile
router.get('/me',          ctrl.getProfile.bind(ctrl));
router.put('/me',          ctrl.updateProfile.bind(ctrl));

// Credentials (username + password change — forces re-login)
router.put('/credentials', ctrl.updateCredentials.bind(ctrl));

export default router;
